import assert from "node:assert/strict";
import { after, test } from "node:test";
import { readFile } from "node:fs/promises";
import { testPool } from "../support/database";
import { profile, validatedRow } from "../support/fixtures";
import { saveAlumni } from "../../lib/alumni-store";
import { directoryFilters, directorySource } from "../../lib/directory-query";
import { directoryFacets, facetOptions } from "../../lib/directory-facets";

const pool = testPool();
after(() => pool.end());

test("CSV parser + store + joined view persist all five entities and replace by email", async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const original = { ...profile(100), current_company: "Integration company", opportunities: "Resume help" };
    await saveAlumni(client, validatedRow(original));
    const first = (await client.query("SELECT * FROM alumni_directory WHERE email=$1", [original.email])).rows[0];
    assert.equal(first.current_company, "Integration company");
    assert.equal(first.education_history.length, 2);
    assert.equal(first.major, "Robotics");
    assert.equal(first.q_resume_help, true);
    assert.equal(first.storage_consent, "Yes");
    for (const table of ["alumni_professional", "alumni_support_preferences", "alumni_privacy_preferences"]) {
      assert.equal((await client.query(`SELECT COUNT(*)::int AS n FROM ${table} WHERE alumni_id=$1`, [first.id])).rows[0].n, 1);
    }
    await saveAlumni(client, validatedRow({ first_name: "Changed", last_name: "Name", email: original.email }));
    const replaced = (await client.query("SELECT * FROM alumni_directory WHERE email=$1", [original.email])).rows[0];
    assert.equal(replaced.id, first.id);
    assert.equal(replaced.first_name, "Changed");
    assert.equal(replaced.current_company, "");
    assert.equal(replaced.storage_consent, "");
    assert.deepEqual(replaced.education_history, []);
    assert.equal(replaced.opportunities, "");
    assert.equal((await client.query("SELECT COUNT(*)::int AS n FROM alumni WHERE email=$1", [original.email])).rows[0].n, 1);
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }
});

test("a later database failure rolls back an earlier valid profile and import log", async () => {
  const client = await pool.connect();
  const email = "rollback@test.example";
  try {
    await client.query("BEGIN");
    await saveAlumni(client, validatedRow({ ...profile(101), email }));
    await client.query("INSERT INTO imports(filename,row_count) VALUES('rollback.csv',1)");
    await assert.rejects(client.query("INSERT INTO alumni_education(alumni_id,graduation_year) VALUES($1,1800)",
      [(await client.query("SELECT id FROM alumni WHERE email=$1", [email])).rows[0].id]),
    (error: unknown) => (error as { code: string }).code === "23514");
    await client.query("ROLLBACK");
    assert.equal((await client.query("SELECT COUNT(*)::int AS n FROM alumni WHERE email=$1", [email])).rows[0].n, 0);
    assert.equal((await client.query("SELECT COUNT(*)::int AS n FROM imports WHERE filename='rollback.csv'")).rows[0].n, 0);
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }
});

test("real SQL enforces same-qualification matching, literal wildcards, and member-safe facets", async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await saveAlumni(client, validatedRow({ ...profile(102), current_company: "100%_Real", contact_visibility: "Neither", industry: "Visible custom industry" }));
    await saveAlumni(client, validatedRow({ ...profile(103), storage_consent: "", industry: "Hidden custom industry" }));
    const source = `WITH directory AS (${directorySource(false)})`;
    const find = (params: Record<string, string>) => {
      const { where, values } = directoryFilters(new URLSearchParams(params));
      return client.query(`${source} SELECT * FROM directory ${where}`, values);
    };
    assert.equal((await find({ current_company: "100%_", degree: "BS", major: "Robotics" })).rowCount, 0);
    const found = (await find({ current_company: "100%_", degree: "MS", major: "Robotics" })).rows;
    assert.equal(found.length, 1);
    assert.equal(found[0].email, "");
    assert.equal(found[0].linked_in, "");
    assert.equal(found[0].additional_comments, "");
    assert.equal((await find({ search: "alumnus-102@test.example" })).rowCount, 0);
    const facets = facetOptions((await client.query(`${source} ${directoryFacets}`)).rows);
    assert.ok(facets.industry?.includes("Visible custom industry"));
    assert.ok(!facets.industry?.includes("Hidden custom industry"));
    assert.ok(!facets.additional_comments?.length);
    assert.ok(facets.expertise?.includes("AI"));
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }
});

test("schema initialization is repeatable without restoring stale legacy fields", async () => {
  const client = await pool.connect();
  try {
    await client.query("UPDATE alumni_professional SET current_company='Updated after migration' WHERE alumni_id=(SELECT id FROM alumni WHERE email='alumnus-0@test.example')");
    await client.query(await readFile("db/schema.sql", "utf8"));
    const row = (await client.query("SELECT * FROM alumni_directory WHERE email='alumnus-0@test.example'")).rows[0];
    assert.equal(row.current_company, "Updated after migration");
    assert.equal(row.education_history.length, 2);
  } finally {
    await client.query("UPDATE alumni_professional SET current_company='Test Network' WHERE alumni_id=(SELECT id FROM alumni WHERE email='alumnus-0@test.example')");
    client.release();
  }
});
