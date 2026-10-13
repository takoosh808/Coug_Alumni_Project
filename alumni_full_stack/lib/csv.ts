import { parse } from "csv-parse/sync";
import { opportunities } from "./types";
import { HttpError } from "./auth";

export const columns = [
  "first_name",
  "last_name",
  "email",
  "current_company",
  "graduation_year",
  "major",
  "linked_in",
  ...Object.keys(opportunities),
];
function consent(value: string, row: number, column: string) {
  if (!value || ["unknown", "n/a"].includes(value.toLowerCase())) return null;
  if (["yes", "true", "1", "y"].includes(value.toLowerCase())) return true;
  if (["no", "false", "0", "n"].includes(value.toLowerCase())) return false;
  throw new HttpError(
    400,
    `Row ${row}: ${column} must be yes, no, true, false, 1, 0, or blank.`,
  );
}
export function parseAlumniCsv(source: string) {
  let records: Record<string, string>[];
  try {
    records = parse(source, {
      bom: true,
      columns: (headers: string[]) => {
        const normalized = headers.map((h) => h.trim().toLowerCase());
        if (new Set(normalized).size !== normalized.length)
          throw new Error("Duplicate column headers.");
        for (const name of ["first_name", "last_name", "email"])
          if (!normalized.includes(name))
            throw new Error(`Missing required header: ${name}.`);
        for (const name of normalized)
          if (!columns.includes(name))
            throw new Error(
              `Unknown header: ${name}. Download the template for supported columns.`,
            );
        return normalized;
      },
      skip_empty_lines: true,
      trim: true,
      max_record_size: 10000,
    });
  } catch (error) {
    throw new HttpError(400, `Invalid CSV: ${(error as Error).message}`);
  }
  if (!records.length || records.length > 5000)
    throw new HttpError(400, "Upload between 1 and 5,000 alumni per CSV.");
  const seen = new Set<string>();
  return records.map((record, index) => {
    const row = index + 2;
    const email = (record.email ?? "").toLowerCase();
    if (
      !record.first_name ||
      !record.last_name ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    )
      throw new HttpError(
        400,
        `Row ${row}: first_name, last_name, and a valid email are required.`,
      );
    if (seen.has(email))
      throw new HttpError(
        400,
        `Row ${row}: duplicate email ${email} in this file.`,
      );
    seen.add(email);
    for (const value of Object.values(record))
      if (value.length > 500)
        throw new HttpError(
          400,
          `Row ${row}: fields must be 500 characters or fewer.`,
        );
    const year = record.graduation_year ? Number(record.graduation_year) : null;
    if (
      year !== null &&
      (!Number.isInteger(year) || year < 1900 || year > 2100)
    )
      throw new HttpError(
        400,
        `Row ${row}: graduation_year must be between 1900 and 2100.`,
      );
    if (
      record.linked_in &&
      !/^https:\/\/(www\.)?linkedin\.com\//i.test(record.linked_in)
    )
      throw new HttpError(
        400,
        `Row ${row}: linked_in must be an https://linkedin.com/ URL.`,
      );
    return columns.map((column) =>
      column in opportunities
        ? consent(record[column] ?? "", row, column)
        : column === "graduation_year"
          ? year
          : column === "email"
            ? email
            : (record[column] ?? ""),
    );
  });
}
