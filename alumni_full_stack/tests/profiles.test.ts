import { strict as assert } from "node:assert";
import { test } from "node:test";
import { columns, parseAlumniCsv } from "../lib/csv";
import { profileFromRow } from "../lib/alumni-store";
import { directoryFilters, directorySource } from "../lib/directory-query";

const quote = (value: string) => `"${value.replace(/"/g,'""')}"`;
test("expanded CSV preserves custom answers and legacy opportunity compatibility", () => {
  const [row] = parseAlumniCsv('first_name,last_name,email,degree,industry,opportunities,support_interests,storage_consent\nA,B,A@EXAMPLE.COM,Custom qualification,Quantum sensors,Resume help; Lab tour,Donate equipment,Ask me first');
  const record = profileFromRow(row);
  assert.equal(record.email,"a@example.com");
  assert.equal(record.degree,"Custom qualification");
  assert.equal(record.opportunities,"Resume help; Lab tour");
  assert.equal(record.storage_consent,"Ask me first");
  const [legacy] = parseAlumniCsv('first_name,last_name,email,q_internship,q_guest_lecture\nA,B,a@example.com,yes,no');
  assert.equal(profileFromRow(legacy).opportunities,"Internship opportunities");
});
test("multiple education records survive CSV quoting; invalid history rejects import", () => {
  const history = JSON.stringify([{degree:"BS",major:"CS",graduation_year:2018},{degree:"PhD",major:"Robotics",graduation_year:2025}]);
  const [row] = parseAlumniCsv(`first_name,last_name,email,education_history\nA,B,a@example.com,${quote(history)}`);
  assert.equal(row[columns.indexOf("education_history")],history);
  for (const bad of ['{}','[{}]','[{"degree":"BS","major":"CS","graduation_year":1800}]']) {
    assert.throws(() => parseAlumniCsv(`first_name,last_name,email,education_history\nA,B,a@example.com,${quote(bad)}`),/education_history/);
  }
});
test("education filters constrain the same qualification and escape literal wildcards", () => {
  const result = directoryFilters(new URLSearchParams("degree=BS&major=CS&year_from=2010&year_to=2020&expertise=100%25"));
  assert.match(result.where,/EXISTS.*jsonb_array_elements/);
  assert.match(result.where,/entry->>'degree'.*AND entry->>'major'/);
  assert.equal(result.values[0],"%100\\%%");
  assert.throws(() => directoryFilters(new URLSearchParams("year_from=2025&year_to=2010")),/starting/);
  assert.throws(() => directoryFilters(new URLSearchParams("opportunity=constructor")),/Unknown/);
});
test("member query requires explicit permissions and redacts contacts before filtering", () => {
  const source = directorySource(false);
  assert.match(source,/WHERE LOWER\(TRIM\(storage_consent\)\)/);
  assert.match(source,/authorized wsu eecs faculty, staff, and students/);
  assert.match(source,/THEN email ELSE '' END AS email/);
  assert.match(source,/THEN linked_in ELSE '' END AS linked_in/);
  assert.match(source,/''::text AS additional_comments/);
  assert.equal(directorySource(true),"SELECT * FROM alumni_directory");
});
