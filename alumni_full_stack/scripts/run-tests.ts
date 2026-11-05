import { loadEnvConfig } from "@next/env";
import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, mkdir, appendFile, cp, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { once } from "node:events";
import { Pool } from "pg";
import { hashPassword } from "../lib/password";
import { credentials, profile, validatedRow } from "../tests/support/fixtures";
import { saveAlumni } from "../lib/alumni-store";

loadEnvConfig(process.cwd());
const allowed = ["integration", "functional", "system", "performance", "all"];
const suite = process.argv[2];
if (!allowed.includes(suite)) throw new Error(`Choose a suite: ${allowed.join(", ")}`);
const schema = `coug_test_${randomUUID().replaceAll("-", "")}`;
const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Set TEST_DATABASE_URL (preferred) or DATABASE_URL in .env.");
const scoped = new URL(databaseUrl);
// Do not fall back to public if a relation is missing from the test schema.
scoped.searchParams.set("options", `-c search_path=${schema}`);
const admin = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });
const database = new Pool({ connectionString: scoped.toString(), connectionTimeoutMillis: 5000 });
const env = {
  ...process.env,
  DATABASE_URL: scoped.toString(),
  TEST_DATABASE_URL: scoped.toString(),
  TEST_SCHEMA: schema,
  COUG_TEST_RUN: "true",
  COOKIE_SECURE: "false",
  NEXT_TELEMETRY_DISABLED: "1",
};
let server: ChildProcess | undefined;
let active: ChildProcess | undefined;
let interrupted = false;

function terminate(child?: ChildProcess) {
  if (child && child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
}
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    interrupted = true;
    terminate(active);
    terminate(server);
  });
}

async function run(args: string[]) {
  if (interrupted) throw new Error("Tests interrupted.");
  active = spawn(process.execPath, args, { env, stdio: "inherit" });
  const [code, signal] = await once(active, "exit");
  active = undefined;
  if (code !== 0) throw new Error(`Test command failed (${signal ?? code}): ${args.join(" ")}`);
}

async function freePort() {
  const listener = createServer();
  listener.listen(0, "127.0.0.1");
  await once(listener, "listening");
  const address = listener.address();
  if (!address || typeof address === "string") throw new Error("No test port available.");
  await new Promise<void>((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

async function startApp() {
  // Build/start the actual production application; no mocks or existing server reuse.
  await run(["node_modules/next/dist/bin/next", "build"]);
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  Object.assign(env, { TEST_BASE_URL: base, APP_ORIGIN: base, PORT: String(port), HOSTNAME: "127.0.0.1" });
  await cp("public", ".next-test/standalone/public", { recursive: true });
  await cp(".next-test/static", ".next-test/standalone/.next-test/static", { recursive: true });
  const log = "test-results/server.log";
  await writeFile(log, "");
  server = spawn(process.execPath, [".next-test/standalone/server.js"], {
    env, stdio: ["ignore", "pipe", "pipe"],
  });
  // Keep full server output for diagnosing a failing browser/API test.
  server.stdout?.on("data", (chunk) => { void appendFile(log, chunk).catch(console.error); });
  server.stderr?.on("data", (chunk) => { void appendFile(log, chunk).catch(console.error); });
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline && !interrupted) {
    if (server.exitCode !== null) throw new Error(`Test server exited. See ${log}.`);
    try {
      const response = await fetch(`${base}/api/auth`, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return;
    } catch { /* Server is still starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Test server did not become ready. See ${log}.`);
}

async function main() {
  let created = false;
  try {
    await mkdir("test-results", { recursive: true });
    await admin.query(`CREATE SCHEMA ${schema}`);
    created = true;
    console.log(`Isolated test schema: ${schema}`);
    await database.query(await readFile("db/schema.sql", "utf8"));
    for (const [role, account] of Object.entries(credentials)) {
      await database.query("INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4)",
        [`Test ${role}`, account.email, hashPassword(account.password), role]);
    }
    const client = await database.connect();
    try {
      await client.query("BEGIN");
      for (let i = 0; i < 23; i++) await saveAlumni(client, validatedRow(profile(i)));
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }

    if (suite === "integration" || suite === "all") {
      await run(["--import", "tsx", "--test", "tests/integration/database.test.ts"]);
    }
    if (suite !== "integration") await startApp();
    if (suite === "functional" || suite === "all") {
      await run(["--import", "tsx", "--test", "tests/functional/api.test.ts"]);
    }
    if (suite === "system" || suite === "all") {
      await run(["node_modules/@playwright/test/cli.js", "test"]);
    }
    if (suite === "performance" || suite === "all") {
      await run(["--import", "tsx", "tests/performance/benchmark.ts"]);
    }
  } finally {
    if (server && server.exitCode === null && server.signalCode === null) {
      const exited = once(server, "exit");
      terminate(server);
      const force = setTimeout(() => server?.kill("SIGKILL"), 5000);
      await exited;
      clearTimeout(force);
    }
    await database.end();
    if (created) {
      // schema is generated locally from a UUID, never accepted from user input.
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      console.log(`Removed test schema: ${schema}`);
    }
    await admin.end();
  }
}
main().catch((error: Error) => {
  // Avoid printing a connection URL/credentials on connection errors.
  console.error(error.message);
  process.exitCode = 1;
});
