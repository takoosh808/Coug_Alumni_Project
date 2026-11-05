import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { writeFile } from "node:fs/promises";
import { parseAlumniCsv } from "../../lib/csv";
import { csv, profile } from "../support/fixtures";
import { request, signIn, testBase, upload } from "../support/http";

function integer(name: string, fallback: number, max: number) {
  const value = Number(process.env[name] ?? fallback);
  assert.ok(Number.isInteger(value) && value > 0 && value <= max, `${name} must be an integer from 1 to ${max}`);
  return value;
}

async function main() {
  const concurrency = integer("PERF_CONCURRENCY", 5, 50);
  const count = integer("PERF_REQUESTS", 50, 5000);
  const size = integer("PERF_ROWS", 500, 5000);
  const p95Budget = integer("PERF_P95_MS", 2000, 60_000);
  const parseBudget = integer("PERF_PARSE_MS", 2000, 60_000);
  const importBudget = integer("PERF_IMPORT_MS", 30_000, 120_000);
  const admin = await signIn("admin");
  const source = csv(Array.from({ length: size }, (_, i) => {
    const record = profile(1000 + i);
    // Compact records keep even the 5,000-row workload inside the 2 MB upload limit.
    return {
      first_name: record.first_name, last_name: record.last_name, email: record.email,
      current_company: "Performance Network", opportunities: record.opportunities,
      storage_consent: record.storage_consent, profile_visibility: record.profile_visibility,
      degree: "MS", major: "Robotics", graduation_year: 2024,
    };
  }));
  assert.ok(Buffer.byteLength(source) <= 2_000_000, "Benchmark CSV exceeds the upload limit; reduce PERF_ROWS.");
  // Warm parser separately; benchmark parsing the largest supported row count.
  const parserSource = "first_name,last_name,email\n" + Array.from({ length: 5000 }, (_, i) => `A,B,perf-${i}@test.example`).join("\n");
  parseAlumniCsv(parserSource);
  const parseStart = performance.now();
  assert.equal(parseAlumniCsv(parserSource).length, 5000);
  const parseMs = performance.now() - parseStart;
  const importStart = performance.now();
  const imported = await request("/api/imports", admin, "POST", upload(source, false, "performance.csv"), testBase(), importBudget + 5000);
  assert.equal(imported.response.status, 200);
  assert.equal(imported.data.count, size);
  const importMs = performance.now() - importStart;
  const member = await signIn("user");
  const paths = [
    "/api/alumni?current_company=Performance+Network",
    "/api/alumni?current_company=Performance+Network&opportunity=q_internship",
    "/api/alumni?current_company=Performance+Network&degree=MS&major=Robotics&year_from=2020",
    "/api/alumni?current_company=Performance+Network&search=Robotics&sort=year",
  ];
  for (const path of paths) assert.equal((await request(path, member)).response.status, 200);
  let next = 0;
  const samples: number[] = [];
  const failures: string[] = [];
  const started = performance.now();
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (next < count) {
      const index = next++;
      const start = performance.now();
      try {
        const result = await request(paths[index % paths.length], member);
        assert.equal(result.response.status, 200);
        assert.equal(result.data.total, index % paths.length === 1 ? Math.ceil(size / 2) : size);
        assert.equal(result.data.alumni.length, Math.min(20, result.data.total));
      } catch (error) { failures.push((error as Error).message); }
      samples.push(performance.now() - start);
    }
  }));
  const elapsed = performance.now() - started;
  samples.sort((a, b) => a - b);
  const percentile = (p: number) => samples[Math.max(0, Math.ceil(samples.length * p) - 1)];
  const report = {
    recordedAt: new Date().toISOString(), mode: "production", rows: size, requests: count, concurrency,
    parser5000RowsMs: parseMs, importMs, elapsedMs: elapsed,
    requestsPerSecond: count / (elapsed / 1000),
    p50Ms: percentile(0.5), p95Ms: percentile(0.95), maxMs: samples.at(-1),
    errors: failures.length, failures,
    budgets: { p95Ms: p95Budget, parserMs: parseBudget, importMs: importBudget },
  };
  await writeFile("test-results/performance.json", JSON.stringify(report, null, 2));
  console.table({
    "Parse 5,000 rows (ms)": parseMs.toFixed(1), "Import (ms)": importMs.toFixed(1),
    "p50 (ms)": report.p50Ms.toFixed(1), "p95 (ms)": report.p95Ms.toFixed(1),
    "Requests/second": report.requestsPerSecond.toFixed(1), errors: failures.length,
  });
  assert.equal(failures.length, 0, "Requests failed; see test-results/performance.json");
  assert.ok(parseMs <= parseBudget, `Parser exceeded ${parseBudget} ms`);
  assert.ok(importMs <= importBudget, `Import exceeded ${importBudget} ms`);
  assert.ok(report.p95Ms <= p95Budget, `Directory p95 exceeded ${p95Budget} ms`);
}
main().catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
