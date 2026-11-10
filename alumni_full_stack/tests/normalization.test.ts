import assert from "node:assert/strict";
import { test } from "node:test";
import { columns, parseAlumniCsv } from "../lib/csv";
import { facetOptions } from "../lib/directory-facets";
import { directoryFilters } from "../lib/directory-query";
import { normalizeField } from "../lib/normalize";
import { multiValueFields } from "../lib/profile-fields";
import { directoryFacets } from "../lib/directory-facets";

test("only expertise and supporting WSU split semicolon answers", () => {
  assert.deepEqual(multiValueFields, ["expertise", "opportunities"]);
  for (const field of multiValueFields)
    assert.equal(normalizeField(field, "test1; test2; TEST1;"), "test1; test2");
  for (const field of ["support_interests", "industry", "profile_visibility", "additional_comments"])
    assert.equal(normalizeField(field, "test1; test2; TEST1;"), "test1; test2; TEST1;");
  assert.match(directoryFacets, /CASE WHEN field IN \('expertise','opportunities'\)/);
});

test("imports normalize spacing, recognized answers, and repeated multi-select choices", () => {
  const [row] = parseAlumniCsv('first_name,last_name,email,current_company,industry,opportunities\n"  Alex  ",Chen," ALEX@EXAMPLE.COM "," Example   Company ",SOFTWARE AND TECHNOLOGY," guest   LECTURE ;Guest lecture;; Robotics   tour;robotics tour;"');
  const record = Object.fromEntries(columns.map((key, index) => [key, row[index]]));
  assert.equal(record.first_name, "Alex");
  assert.equal(record.email, "alex@example.com");
  assert.equal(record.current_company, "Example Company");
  assert.equal(record.industry, "Software and technology");
  assert.equal(record.opportunities, "Guest lecture; Robotics tour");
  assert.throws(() => parseAlumniCsv('first_name,last_name,email\nA,B," A@EXAMPLE.COM "\nC,D,a@example.com'), /duplicate email/);
});

test("education deduplication retains distinct years and qualifications", () => {
  const history = JSON.stringify([
    { degree: " BS ", major: "Computer   Science", graduation_year: 2020 },
    { degree: "bs", major: "computer science", graduation_year: 2020 },
    { degree: "BS", major: "Computer Science", graduation_year: 2021 },
  ]);
  const [row] = parseAlumniCsv(`first_name,last_name,email,education_history\nA,B,a@example.com,"${history.replaceAll('"', '""')}"`);
  assert.deepEqual(JSON.parse(String(row[columns.indexOf("education_history")])), [
    { degree: "BS", major: "Computer Science", graduation_year: 2020 },
    { degree: "BS", major: "Computer Science", graduation_year: 2021 },
  ]);
});

test("existing filter options deduplicate case and whitespace without merging different answers", () => {
  const options = facetOptions([
    { field: "current_company", options: [" Example   Company ", "example company", "Other Company", ""] },
    { field: "industry", options: ["SOFTWARE AND TECHNOLOGY", "Software and technology"] },
  ]);
  assert.deepEqual(options.current_company, ["Example Company", "Other Company"]);
  assert.deepEqual(options.industry, ["Software and technology"]);
  const filters = directoryFilters(new URLSearchParams({ opportunity_value: " Robotics   tour " }));
  assert.deepEqual(filters.values, ["Robotics tour"]);
  assert.match(filters.where, /REGEXP_REPLACE/);
});
