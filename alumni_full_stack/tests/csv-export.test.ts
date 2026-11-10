import assert from "node:assert/strict";
import { test } from "node:test";
import { parse } from "csv-parse/sync";
import { exportAlumniCsv, exportColumns } from "../lib/csv-export";
import { columns, parseAlumniCsv } from "../lib/csv";

test("CSV export quotes text and education JSON and can be imported again", () => {
  const history = [{ degree: "BS", major: "Computer Science", graduation_year: 2026 }];
  const source = exportAlumniCsv([{ first_name: "Alex", last_name: "Chen", email: "alex@example.com", current_company: 'Example, "Inc."', additional_comments: "First line\nSecond line", opportunities: "Guest lecture; Company visit", education_history: history }]);
  const [row] = parseAlumniCsv(source);
  assert.equal(row[columns.indexOf("current_company")], 'Example, "Inc."');
  assert.equal(row[columns.indexOf("additional_comments")], "First line\nSecond line");
  assert.deepEqual(JSON.parse(String(row[columns.indexOf("education_history")])), history);
  assert.equal(parse(exportAlumniCsv([]), { bom: true })[0].length, exportColumns.length);
});

test("CSV export keeps spreadsheet formula-like answers inert", () => {
  for (const value of ["=1+1", "+SUM(A1)", "@SUM(A1)", "-1+2", "  =1+1", "\tformula"]) {
    const [record] = parse<Record<string, string>>(exportAlumniCsv([{ current_company: value }]), { bom: true, columns: true });
    assert.equal(record.current_company, `'${value}`);
  }
});
