import { strict as assert } from "node:assert";
import { test } from "node:test";
import { columns, parseAlumniCsv } from "../lib/csv";
import { hashPassword, verifyPassword } from "../lib/password";
test("Forms export maps question headers, ignores metadata and duplicate year, and preserves answers", () => {
  const headers = ["ID", "Start time", "Completion time", "Email", "Name", "Last modified time", "First Name", "Last Name", "Email2", "LinkedIn", "Graduation Year", "Graduation Year2", "Highest Level of Degree Earned", "Bachelor Major or Academic Program", "Master's Program2", "Doctorate Program2", "Certificate/Credential", "Current Employment Status", "Current Job Title", "Current Company", "Industry", "Current Professional Location (Enter your city, state/province, and country only.)", "Areas of Professional Expertise or Interest", "How Might You or Your Organization Be Interested in Supporting WSU EECS?", "Preferred Participation Format", "How Frequently May WSU EECS Contact You?", "Additional Comments or Opportunities&#xA;Please share any details ...", "Permission to Store and Use Your Information\n\nI authorize WSU EECS ...", "Internal Alumni Directory Permission&#xA;&#xA;Who may view your professional alumni profile?&#xA;", "Contact Information Visibility", "May WSU EECS Students Contact You Directly?", "Alumni News and Updates"];
  const answers: Record<string, string> = {
    Email: "anonymous", "First Name": "Test", "Last Name": "Alum", Email2: "TEST@wsu.edu",
    "Graduation Year": "2026", "Graduation Year2": "ignored value",
    "Highest Level of Degree Earned": "Bachelor's", "Bachelor Major or Academic Program": "Computer Science",
    "How Might You or Your Organization Be Interested in Supporting WSU EECS?": "Sponsor a Senior Design or Capstone project;Participate in a career fair;",
    "Permission to Store and Use Your Information\n\nI authorize WSU EECS ...": "Yes",
    "Current Company": "Company, Inc.",
  };
  const encode = (values: string[]) => values.map((value) => `"${value.replaceAll('"', '""')}"`).join(",");
  const source = `${encode(headers)}\n${encode(headers.map((header) => answers[header] ?? ""))}`;
  const [row] = parseAlumniCsv(source);
  const profile = Object.fromEntries(columns.map((column, index) => [column, row[index]]));
  assert.equal(profile.email, "test@wsu.edu");
  assert.equal(profile.current_company, "Company, Inc.");
  assert.equal(profile.storage_consent, "Yes");
  assert.equal(profile.opportunities, "Sponsor a Senior Design or Capstone project; Participate in a career fair");
  assert.equal(profile.support_interests, "");
  assert.deepEqual(JSON.parse(String(profile.education_history)), [{ degree: "Bachelor's", major: "Computer Science", graduation_year: 2026 }]);
  assert.throws(() => parseAlumniCsv(`${source}\n${encode(headers.map((header) => answers[header] ?? ""))}`), /duplicate email/);
});
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
