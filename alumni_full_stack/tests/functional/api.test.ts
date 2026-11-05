import assert from "node:assert/strict";
import { before, test } from "node:test";
import { csv, profile } from "../support/fixtures";
import { request, signIn, upload } from "../support/http";
import { testPool } from "../support/database";

let admin: string;
let member: string;
before(async () => { admin = await signIn("admin"); member = await signIn("user"); });

test("unauthenticated access, account roles, origin validation, and expired logout are enforced", async () => {
  assert.equal((await request("/api/alumni")).response.status, 401);
  assert.equal((await request("/api/imports", member)).response.status, 403);
  assert.equal((await request("/api/users", admin)).response.status, 403);
  assert.equal((await request("/api/alumni", member, "POST", JSON.stringify(profile(200)))).response.status, 403);
  assert.equal((await request("/api/alumni", admin, "POST", JSON.stringify(profile(200)), "https://untrusted.example")).response.status, 403);
  const cookie = await signIn("user");
  assert.equal((await request("/api/auth", cookie, "DELETE")).response.status, 200);
  assert.equal((await request("/api/alumni", cookie)).response.status, 401);
});

test("CSV preview is read-only; commit and replacement update profiles and history", async () => {
  const record = { ...profile(201), current_company: "Functional Import" };
  const path = "/api/alumni?current_company=Functional+Import";
  const initialHistory = (await request("/api/imports", admin)).data.imports.length;
  const preview = await request("/api/imports", admin, "POST", upload(csv([record]), true, "functional.csv"));
  assert.equal(preview.response.status, 200);
  assert.equal(preview.data.count, 1);
  assert.equal(preview.data.preview[0].email, record.email);
  assert.equal((await request(path, admin)).data.total, 0);
  assert.equal((await request("/api/imports", admin)).data.imports.length, initialHistory);
  assert.equal((await request("/api/imports", admin, "POST", upload(csv([record]), false, "functional.csv"))).response.status, 200);
  assert.equal((await request(path, admin)).data.total, 1);
  const log = (await request("/api/imports", admin)).data.imports[0];
  assert.equal(log.filename, "functional.csv");
  assert.equal(log.row_count, 1);
  const replace = { first_name: "Replacement", last_name: "Person", email: record.email };
  assert.equal((await request("/api/imports", admin, "POST", upload(csv([replace]), false))).response.status, 200);
  const updated = (await request(`/api/alumni?search=${record.email}`, admin)).data;
  assert.equal(updated.total, 1);
  assert.equal(updated.alumni[0].current_company, "");
  assert.deepEqual(updated.alumni[0].education_history, []);
  assert.equal((await request(`/api/alumni?search=${record.email}`, member)).data.total, 0);
});

test("invalid upload cannot partially import records or append history", async () => {
  const before = (await request("/api/imports", admin)).data.imports.length;
  const bad = csv([{ ...profile(202), current_company: "Must not import" }, { ...profile(203), graduation_year: 1800 }]);
  const result = await request("/api/imports", admin, "POST", upload(bad, false));
  assert.equal(result.response.status, 400);
  assert.match(result.data.error, /graduation_year/);
  assert.equal((await request("/api/alumni?current_company=Must+not+import", admin)).data.total, 0);
  assert.equal((await request("/api/imports", admin)).data.imports.length, before);
  assert.equal((await request("/api/imports", admin, "POST", upload("x", true, "bad.txt"))).response.status, 400);
  assert.equal((await request("/api/imports", admin, "POST", upload("x".repeat(2_000_001), true))).response.status, 400);
});

test("database failure on a later import row rolls back earlier writes and history through the API", async () => {
  const database = testPool();
  try {
    // Fault injection is confined to the disposable schema and this exact test record.
    await database.query(`CREATE FUNCTION reject_test_import() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.email = 'alumnus-206@test.example' THEN RAISE EXCEPTION 'Injected import failure'; END IF;
        RETURN NEW;
      END $$`);
    await database.query("CREATE TRIGGER reject_test_import BEFORE INSERT ON alumni FOR EACH ROW EXECUTE FUNCTION reject_test_import()");
    const before = (await request("/api/imports", admin)).data.imports.length;
    const result = await request("/api/imports", admin, "POST", upload(csv([
      { ...profile(205), current_company: "API rollback" },
      { ...profile(206), current_company: "API rollback" },
    ]), false));
    assert.equal(result.response.status, 503);
    assert.equal((await request("/api/alumni?current_company=API+rollback", admin)).data.total, 0);
    assert.equal((await request("/api/imports", admin)).data.imports.length, before);
  } finally {
    try {
      await database.query("DROP TRIGGER IF EXISTS reject_test_import ON alumni");
      await database.query("DROP FUNCTION IF EXISTS reject_test_import()");
    } finally { await database.end(); }
  }
});

test("directory pagination, sorting, all/any opportunities, education, and invalid parameters", async () => {
  const path = "/api/alumni?current_company=Test+Network";
  const first = (await request(path, member)).data;
  const second = (await request(`${path}&page=2`, member)).data;
  assert.equal(first.total, 23);
  assert.equal(first.alumni.length, 20);
  assert.equal(second.alumni.length, 3);
  const ids = [...first.alumni, ...second.alumni].map((row: { id: number }) => row.id);
  assert.equal(new Set(ids).size, 23);
  assert.deepEqual([...first.alumni, ...second.alumni].map((row: { last_name: string }) => row.last_name),
    Array.from({ length: 23 }, (_, i) => `Alumnus${String(i).padStart(3, "0")}`));
  assert.equal((await request(`${path}&opportunity=q_internship&opportunity=q_guest_lecture`, member)).data.total, 0);
  assert.equal((await request(`${path}&opportunity=q_internship&opportunity=q_guest_lecture&match=any`, member)).data.total, 23);
  assert.equal((await request(`${path}&opportunity_value=Robotics+lab+tours`, member)).data.total, 12);
  assert.equal((await request(`${path}&opportunity_value=Robotics`, member)).data.total, 0);
  assert.equal((await request(`${path}&degree=BS&major=Robotics`, member)).data.total, 0);
  assert.equal((await request(`${path}&degree=MS&major=Robotics&year_from=2024`, member)).data.total, 23);
  for (const query of ["page=1.5", "year_from=2025&year_to=2010", "opportunity=constructor"]) {
    assert.equal((await request(`${path}&${query}`, member)).response.status, 400);
  }
});

test("profile editing enforces privacy before search and suggestions; admin retains access", async () => {
  const record = { ...profile(204), current_company: "Privacy Functional", industry: "Private facet", contact_visibility: "Neither", student_contact: "No" };
  assert.equal((await request("/api/alumni", admin, "POST", JSON.stringify(record))).response.status, 200);
  const path = "/api/alumni?current_company=Privacy+Functional";
  const visible = (await request(path, member)).data.alumni[0];
  assert.equal(visible.email, "");
  assert.equal(visible.linked_in, "");
  assert.equal(visible.additional_comments, "");
  assert.equal((await request(`/api/alumni?search=${record.email}`, member)).data.total, 0);
  assert.equal((await request(`${path}&search=Departmental+secret`, member)).data.total, 0);
  assert.equal((await request("/api/alumni", admin, "POST", JSON.stringify({ ...record, storage_consent: "No" }))).response.status, 200);
  const hidden = (await request(path, member)).data;
  assert.equal(hidden.total, 0);
  assert.ok(!hidden.filterOptions.industry.includes("Private facet"));
  assert.equal((await request(path, admin)).data.total, 1);
  assert.equal((await request("/api/alumni", admin, "POST", JSON.stringify({ ...record, unexpected: true }))).response.status, 400);
  assert.equal((await request("/api/alumni", admin, "POST", "{bad-json")).response.status, 400);
});

test("only super admin creates valid accounts and duplicate email returns conflict", async () => {
  const superAdmin = await signIn("super_admin");
  const account = { name: "Functional Account", email: "created@test.example", password: "Test-password-12345", role: "user" };
  assert.equal((await request("/api/users", superAdmin, "POST", JSON.stringify({ ...account, role: "super_admin" }))).response.status, 400);
  assert.equal((await request("/api/users", superAdmin, "POST", JSON.stringify({ ...account, password: "short" }))).response.status, 400);
  const result = await request("/api/users", superAdmin, "POST", JSON.stringify(account));
  assert.equal(result.response.status, 201);
  assert.equal(result.data.user.email, account.email);
  assert.ok(!("password_hash" in result.data.user));
  assert.equal((await request("/api/users", superAdmin, "POST", JSON.stringify(account))).response.status, 409);
});
