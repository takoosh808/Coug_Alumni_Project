import { textFields } from "./profile-fields";

export const exportColumns = [
  "first_name", "last_name", "email", "current_company", "graduation_year",
  "major", "linked_in", ...textFields.filter((field) => !["current_company", "major"].includes(field)),
  "education_history",
];

export function exportAlumniCsv(records: Record<string, unknown>[]) {
  const quote = (value: unknown) => {
    let text = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
    // Prevent spreadsheet applications from interpreting alumni answers as formulas.
    if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return "\ufeff" + [exportColumns.join(","), ...records.map((record) =>
    exportColumns.map((column) => quote(record[column])).join(","),
  )].join("\r\n") + "\r\n";
}
