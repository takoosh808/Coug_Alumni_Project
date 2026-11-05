import { Pool } from "pg";

// Refuse accidental standalone execution against public/application tables.
export function testPool() {
  if (!/^coug_test_[a-f0-9]+$/.test(process.env.TEST_SCHEMA ?? "")) {
    throw new Error("Use npm run test:integration/functional/system/performance (the isolated test runner).");
  }
  if (!process.env.TEST_DATABASE_URL) throw new Error("Missing isolated TEST_DATABASE_URL.");
  return new Pool({ connectionString: process.env.TEST_DATABASE_URL, connectionTimeoutMillis: 5000 });
}
