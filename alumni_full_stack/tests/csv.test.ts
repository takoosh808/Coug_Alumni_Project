import { strict as assert } from "node:assert";
import { test } from "node:test";
import { parseAlumniCsv } from "../lib/csv";
import { hashPassword, verifyPassword } from "../lib/password";
test("CSV handles quoted commas, BOM, lowercase emails, and unknown consent", () => {
  const rows = parseAlumniCsv(
    '\ufefffirst_name,last_name,email,current_company,q_internship,q_guest_lecture,q_company_visits\nAlex,Chen,ALEX@EXAMPLE.COM,"Company, Inc.",Yes,no,\n',
  );
  assert.equal(rows[0][2], "alex@example.com");
  assert.equal(rows[0][3], "Company, Inc.");
  assert.equal(rows[0][7], true);
  assert.equal(rows[0][8], false);
  assert.equal(rows[0][10], null);
});
test("CSV rejects invalid consent, duplicate emails, missing headers, and bad years", () => {
  assert.throws(
    () =>
      parseAlumniCsv(
        "first_name,last_name,email,q_internship\nA,B,a@b.com,maybe",
      ),
    /Row 2/,
  );
  assert.throws(
    () =>
      parseAlumniCsv("first_name,last_name,email\nA,B,a@b.com\nC,D,A@B.COM"),
    /duplicate email/,
  );
  assert.throws(
    () => parseAlumniCsv("first_name,email\nA,a@b.com"),
    /Missing required header/,
  );
  assert.throws(
    () =>
      parseAlumniCsv(
        "first_name,last_name,email,graduation_year\nA,B,a@b.com,2020.5",
      ),
    /graduation_year/,
  );
});
test("CSV rejects unsafe URLs, unknown columns, and malformed rows", () => {
  assert.throws(
    () =>
      parseAlumniCsv(
        "first_name,last_name,email,linked_in\nA,B,a@b.com,javascript:alert(1)",
      ),
    /linked_in/,
  );
  assert.throws(
    () =>
      parseAlumniCsv("first_name,last_name,email,secret\nA,B,a@b.com,value"),
    /Unknown header/,
  );
  assert.throws(
    () => parseAlumniCsv("first_name,last_name,email\nA,B,a@b.com,extra"),
    /Invalid CSV/,
  );
});
test("Passwords have unique salts and reject incorrect passwords", () => {
  const first = hashPassword("a secure test password");
  assert.notEqual(first, hashPassword("a secure test password"));
  assert.equal(verifyPassword("a secure test password", first), true);
  assert.equal(verifyPassword("wrong password", first), false);
});
