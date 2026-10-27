import { loadEnvConfig } from "@next/env";
import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { readFile } from "node:fs/promises";
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
    // Check upgrading populated legacy data and repeatability in an isolated schema.
    const migrationClient = await pool.connect();
    const testSchema = `migration_${suffix.replaceAll("-", "")}`;
    try {
      await migrationClient.query(`CREATE SCHEMA ${testSchema}`);
      await migrationClient.query(`SET search_path TO ${testSchema}`);
      const schema = await readFile("db/schema.sql","utf8");
      await migrationClient.query(schema.split("-- Versioned, transactional migration")[0]);
      await migrationClient.query("INSERT INTO alumni(first_name,last_name,email,current_company,major,graduation_year,q_internship) VALUES('Legacy','Alumnus','legacy@example.com','Legacy Co','CS',2008,TRUE)");
      await migrationClient.query(schema);
      const migrated = (await migrationClient.query("SELECT * FROM alumni_directory")).rows[0];
      assert.equal(migrated.current_company,"Legacy Co"); assert.equal(migrated.q_internship,true);
      assert.equal(migrated.education_history.length,1); assert.equal(migrated.storage_consent,"");
      await migrationClient.query("UPDATE alumni_professional SET current_company='New Co'");
      await migrationClient.query(schema);
      assert.equal((await migrationClient.query("SELECT current_company FROM alumni_directory")).rows[0].current_company,"New Co");
      assert.equal((await migrationClient.query("SELECT COUNT(*)::int AS n FROM alumni_education")).rows[0].n,1);
    } finally {
      await migrationClient.query("ROLLBACK");
      await migrationClient.query("SET search_path TO public");
      await migrationClient.query(`DROP SCHEMA IF EXISTS ${testSchema} CASCADE`);
      migrationClient.release();
    }
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
    const headers = "first_name,last_name,email,current_company,graduation_year,major,q_internship,q_guest_lecture,storage_consent,profile_visibility,contact_visibility,student_contact";
    const permission = 'yes,"Authorized WSU EECS faculty, staff, and students",Both email address and LinkedIn profile,Yes by either email or LinkedIn';
    const csv = headers + "\n" + Array.from({ length: 23 }, (_, i) => `Test,Alumni${i},alumni-${i}-${suffix}@example.com,${company},2020,Computer Science,${i < 12 ? "yes" : "no"},${i % 2 ? "yes" : "no"},${permission}`).join("\n");
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
    const updateCsv = `${headers}\nUpdated,Alumni,alumni-0-${suffix}@example.com,${company},2021,Computer Science,no,yes,${permission}`;
    assert.equal((await request("/api/imports", adminCookie, "POST", upload(updateCsv, false))).response.status, 200);
    assert.equal((await request(`/api/alumni?${query}`, memberCookie)).data.total, 23);
    const profile = {first_name:"Updated",last_name:"Alumni",email:`alumni-0-${suffix}@example.com`,current_company:company,
      degree:"unused",employment_status:"Building a startup",industry:"Quantum sensors",expertise:"Robotics; AI",
      opportunities:"Resume help; Robotics lab tours",support_interests:"Donate equipment",storage_consent:"Yes",
      profile_visibility:"Authorized WSU EECS faculty, staff, and students",contact_visibility:"Neither",student_contact:"No",
      additional_comments:"Departmental contact: secret@example.com",
      education_history:[{degree:"BS",major:"CS",graduation_year:2018},{degree:"MS",major:"Robotics",graduation_year:2024}]};
    assert.equal((await request("/api/alumni",memberCookie,"POST",JSON.stringify(profile))).response.status,403);
    assert.equal((await request("/api/alumni",adminCookie,"POST",JSON.stringify(profile))).response.status,200);
    const saved = (await request(`/api/alumni?${query}&industry=Quantum`,adminCookie)).data;
    assert.equal(saved.total,1); assert.equal(saved.alumni[0].education_history.length,2);
    assert.ok(saved.filterOptions.industry.includes("Quantum sensors"));
    assert.ok(saved.filterOptions.degree.includes("BS"));
    assert.ok(saved.filterOptions.degree.includes("MS"));
    assert.ok(saved.filterOptions.major.includes("CS"));
    assert.ok(saved.filterOptions.opportunities.includes("Robotics lab tours"));
    assert.ok(saved.filterOptions.expertise.includes("Robotics"));
    assert.ok(saved.filterOptions.expertise.includes("AI"));
    assert.equal((await request(`/api/alumni?${query}&opportunity_value=Robotics%20lab%20tours`,adminCookie)).data.total,1);
    assert.equal((await request(`/api/alumni?${query}&opportunity_value=Robotics`,adminCookie)).data.total,0);
    const emptySearch = (await request(`/api/alumni?search=${suffix}-no-results`,adminCookie)).data;
    assert.equal(emptySearch.total,0);
    assert.ok(emptySearch.filterOptions.industry.includes("Quantum sensors"));
    assert.equal((await request(`/api/alumni?${query}&degree=BS&major=Robotics`,adminCookie)).data.total,0);
    assert.equal((await request(`/api/alumni?${query}&degree=MS&year_from=2023`,adminCookie)).data.total,1);
    assert.equal((await request(`/api/alumni?${query}&opportunity=q_resume_help`,adminCookie)).data.total,1);
    const visible = (await request(`/api/alumni?${query}&industry=Quantum`,memberCookie)).data.alumni[0];
    assert.equal(visible.email,""); assert.equal(visible.additional_comments,"");
    assert.equal((await request(`/api/alumni?${query}&search=${encodeURIComponent(profile.email)}`,memberCookie)).data.total,0);
    assert.equal((await request(`/api/alumni?${query}&search=secret%40example.com`,memberCookie)).data.total,0);
    for (const visibility of ["Authorized WSU EECS faculty and staff","Please contact me before displaying my profile","Custom permission",""]) {
      assert.equal((await request("/api/alumni",adminCookie,"POST",JSON.stringify({...profile,profile_visibility:visibility}))).response.status,200);
      assert.equal((await request(`/api/alumni?${query}`,memberCookie)).data.total,22);
      const memberFacets = (await request(`/api/alumni?${query}`,memberCookie)).data.filterOptions;
      assert.ok(!memberFacets.industry?.includes("Quantum sensors"));
      assert.ok(!memberFacets.additional_comments?.length);
      assert.equal((await request(`/api/alumni?${query}`,adminCookie)).data.total,23);
    }
    assert.equal((await request("/api/alumni",adminCookie,"POST",JSON.stringify({...profile,storage_consent:"No"}))).response.status,200);
    assert.equal((await request(`/api/alumni?${query}&industry=Quantum`,memberCookie)).data.total,0);
    await request("/api/auth", memberCookie, "DELETE");
    assert.equal((await request("/api/alumni", memberCookie)).response.status, 401);
    console.log("PASS: authentication, CSRF, roles, CSV preview/import/update, atomicity, filters, pagination, profile editing, education history, custom answers, privacy restrictions, contact redaction, and logout.");
  } finally {
    await pool.query("DELETE FROM imports WHERE filename=$1", [filename]);
    await pool.query("DELETE FROM alumni WHERE email LIKE $1", [`alumni-%-${suffix}@example.com`]);
    await pool.query("DELETE FROM users WHERE email=ANY($1::text[])", [[memberEmail, adminEmail]]);
    await pool.end();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
