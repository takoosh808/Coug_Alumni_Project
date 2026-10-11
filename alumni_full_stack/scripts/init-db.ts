import { loadEnvConfig } from "@next/env";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { hashPassword } from "../lib/password";

loadEnvConfig(process.cwd());
async function main() {
  if (!process.env.DATABASE_URL)
    throw new Error("Set DATABASE_URL in .env first.");
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12)
    throw new Error(
      "Set SUPER_ADMIN_EMAIL and a SUPER_ADMIN_PASSWORD of at least 12 characters.",
    );
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(await readFile("db/schema.sql", "utf8"));
    await pool.query(
      "INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,'super_admin') ON CONFLICT(email) DO NOTHING",
      ["WSU administrator", email, hashPassword(password)],
    );
    console.log(
      "Database initialized. Initial super admin created if the email did not already exist.",
    );
  } finally {
    await pool.end();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
