import { loadEnvConfig } from "@next/env";
import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
loadEnvConfig(process.cwd());
const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const suffix = randomUUID();
const company = `Smoke Test ${suffix}`;
const filename = `smoke-${suffix}.csv`;
const password = randomUUID();
const memberEmail = `member-${suffix}@example.com`;
const adminEmail = `admin-${suffix}@example.com`;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function request(path: string, cookie = "", method = "GET", body?: BodyInit, origin = base) {
  const headers: Record<string, string> = { Origin: origin };
  if (cookie) headers.Cookie = cookie;
  if (typeof body === "string") headers["Content-Type"] = "application/json";
  const response = await fetch(`${base}${path}`, { method, headers, body });
  return { response, data: await response.json() };
}
async function signIn(email: string, password: string) {
  const { response } = await request("/api/auth", "", "POST", JSON.stringify({ email, password }));
  assert.equal(response.status, 200);
  return response.headers.get("set-cookie")!.split(";")[0];
}
function upload(csv: string, preview: boolean) {
  const form = new FormData(); form.set("file", new File([csv], filename, { type: "text/csv" })); form.set("preview", String(preview)); return form;
}
async function main() {
  try {
    assert.equal((await request("/api/alumni")).response.status, 401);
    const superCookie = await signIn(process.env.SUPER_ADMIN_EMAIL!, process.env.SUPER_ADMIN_PASSWORD!);
    for (const [email, role] of [[memberEmail, "user"], [adminEmail, "admin"]]) {
      assert.equal((await request("/api/users", superCookie, "POST", JSON.stringify({ name: "Smoke test", email, password, role }))).response.status, 201);
    }
    const memberCookie = await signIn(memberEmail, password), adminCookie = await signIn(adminEmail, password);
    assert.equal((await request("/api/users", adminCookie)).response.status, 403);
    assert.equal((await request("/api/imports", memberCookie)).response.status, 403);
    assert.equal((await request("/api/imports", memberCookie, "POST", upload("", true))).response.status, 403);
    assert.equal((await request("/api/users", memberCookie, "POST", "{}" )).response.status, 403);
    assert.equal((await request("/api/users", superCookie, "POST", "{}", "http://untrusted.invalid")).response.status, 403);
    assert.equal((await request("/api/alumni?opportunity=constructor", memberCookie)).response.status, 400);
    const headers = "first_name,last_name,email,current_company,graduation_year,major,q_internship,q_guest_lecture";
    const csv = headers + "\n" + Array.from({ length: 23 }, (_, i) => `Test,Alumni${i},alumni-${i}-${suffix}@example.com,${company},2020,Computer Science,${i < 12 ? "yes" : "no"},${i % 2 ? "yes" : "no"}`).join("\n");
    const preview = await request("/api/imports", adminCookie, "POST", upload(csv, true));
    assert.equal(preview.response.status, 200); assert.equal(preview.data.count, 23);
    assert.equal((await request(`/api/alumni?current_company=${encodeURIComponent(company)}`, memberCookie)).data.total, 0);
    assert.equal((await request("/api/imports", adminCookie, "POST", upload(csv, false))).response.status, 200);
    const query = `current_company=${encodeURIComponent(company)}`;
    const page = (await request(`/api/alumni?${query}`, memberCookie)).data;
    assert.equal(page.total, 23); assert.equal(page.alumni.length, 20);
    assert.equal((await request(`/api/alumni?${query}&page=2`, memberCookie)).data.alumni.length, 3);
    assert.equal((await request(`/api/alumni?${query}&opportunity=q_internship`, memberCookie)).data.total, 12);
    assert.equal((await request(`/api/alumni?${query}&opportunity=q_internship&opportunity=q_guest_lecture`, memberCookie)).data.total, 6);
    assert.equal((await request(`/api/alumni?${query}&opportunity=q_internship&opportunity=q_guest_lecture&match=any`, memberCookie)).data.total, 17);
    assert.equal((await request(`/api/alumni?${query}&search=%25`, memberCookie)).data.total, 0);
    const invalidCsv = `${headers}\nTest,Valid,valid-${suffix}@example.com,${company},2020,CS,yes,no\nTest,Invalid,invalid-${suffix}@example.com,${company},1800,CS,yes,no`;
    assert.equal((await request("/api/imports", adminCookie, "POST", upload(invalidCsv, false))).response.status, 400);
    assert.equal((await request(`/api/alumni?${query}`, memberCookie)).data.total, 23);
    const updateCsv = `${headers}\nUpdated,Alumni,alumni-0-${suffix}@example.com,${company},2021,Computer Science,no,yes`;
    assert.equal((await request("/api/imports", adminCookie, "POST", upload(updateCsv, false))).response.status, 200);
    assert.equal((await request(`/api/alumni?${query}`, memberCookie)).data.total, 23);
    await request("/api/auth", memberCookie, "DELETE");
    assert.equal((await request("/api/alumni", memberCookie)).response.status, 401);
    console.log("PASS: authentication, CSRF, role restrictions, CSV preview/import/update, invalid-file atomicity, filters, literal search, pagination, and logout.");
  } finally {
    await pool.query("DELETE FROM imports WHERE filename=$1", [filename]);
    await pool.query("DELETE FROM alumni WHERE current_company=$1", [company]);
    await pool.query("DELETE FROM users WHERE email=ANY($1::text[])", [[memberEmail, adminEmail]]);
    await pool.end();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
