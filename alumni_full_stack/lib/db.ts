import { Pool } from "pg";

const globalDb = globalThis as unknown as { alumniPool?: Pool };
export const db =
  globalDb.alumniPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    connectionTimeoutMillis: 4000,
    idleTimeoutMillis: 30000,
  });
if (process.env.NODE_ENV !== "production") globalDb.alumniPool = db;
