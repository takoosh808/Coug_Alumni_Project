import assert from "node:assert/strict";
import { test } from "node:test";
import { columns, parseAlumniCsv } from "../lib/csv";
import { profileFromRow } from "../lib/alumni-store";
import { directoryFilters } from "../lib/directory-query";
import { api } from "../lib/client-api";
import { csv, profile } from "./support/fixtures";

test("CSV accepts exactly 5,000 rows and rejects an empty or oversized import", () => {
  const header = "first_name,last_name,email\n";
  const records = Array.from({ length: 5000 }, (_, i) => `A,B,${i}@test.example`);
  assert.equal(parseAlumniCsv(header + records.join("\n")).length, 5000);
  assert.throws(() => parseAlumniCsv(header), /between 1 and 5,000/);
  assert.throws(() => parseAlumniCsv(header + [...records, "A,B,extra@test.example"].join("\n")), /between 1 and 5,000/);
});

test("CSV normalizes headers and rejects duplicate normalized headers", () => {
  const [row] = parseAlumniCsv(" First_Name , LAST_NAME , Email \n A , B , A@TEST.EXAMPLE ");
  assert.equal(row[columns.indexOf("email")], "a@test.example");
  assert.throws(() => parseAlumniCsv("first_name,last_name,email,EMAIL\nA,B,a@test.example,b@test.example"), /Duplicate column/);
});

test("CSV field and education limits accept boundaries and reject one over", () => {
  const entry = { degree: "BS", major: "CS", graduation_year: null };
  assert.equal(parseAlumniCsv(csv([{ ...profile(1), job_title: "x".repeat(10000), education_history: Array(30).fill(entry) }])).length, 1);
  assert.throws(() => parseAlumniCsv(csv([{ ...profile(1), job_title: "x".repeat(10001) }])), /10,000/);
  assert.throws(() => parseAlumniCsv(csv([{ ...profile(1), education_history: Array(31).fill(entry) }])), /education_history/);
});

test("explicit opportunity text wins over legacy flags; omitted optional answers stay empty", () => {
  const [row] = parseAlumniCsv("first_name,last_name,email,opportunities,q_internship\nA,B,a@test.example,Robotics lab tour,yes");
  const record = profileFromRow(row);
  assert.equal(record.opportunities, "Robotics lab tour");
  assert.equal(record.current_company, "");
  assert.equal(record.storage_consent, "");
  assert.equal(record.graduation_year, null);
});

test("query builder keeps injection-like input in values and escapes literal search metacharacters", () => {
  const value = "x%' OR TRUE --_\\";
  const result = directoryFilters(new URLSearchParams({ search: value }));
  assert.ok(!result.where.includes("OR TRUE"));
  assert.deepEqual(result.values, [`%${value.replace(/[\\%_]/g, "\\$&")}%`]);
  assert.deepEqual(directoryFilters(new URLSearchParams()), { values: [], where: "" });
  assert.equal(String(directoryFilters(new URLSearchParams({ search: "x".repeat(201) })).values[0]).length, 202);
});

for (const year of ["1899", "2101", "2020.5", "abc"]) {
  test(`query builder rejects invalid graduation year ${year}`, () => {
    assert.throws(() => directoryFilters(new URLSearchParams({ year_from: year })), /1900 and 2100/);
  });
}

test("HTTP helper returns JSON, preserves request options, and reports server/fallback errors", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => Response.json({ saved: true }));
  const options = { method: "POST", body: "data" };
  assert.deepEqual(await api("/api/alumni", options), { saved: true });
  assert.deepEqual(fetchMock.mock.calls[0].arguments, ["/api/alumni", options]);
  fetchMock.mock.mockImplementation(async () => Response.json({ error: "Not allowed" }, { status: 403 }));
  await assert.rejects(api("/api/alumni"), /Not allowed/);
  fetchMock.mock.mockImplementation(async () => Response.json({}, { status: 500 }));
  await assert.rejects(api("/api/alumni"), /Something went wrong/);
  fetchMock.mock.restore();
});
