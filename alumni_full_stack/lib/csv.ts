import { parse } from "csv-parse/sync";
import { opportunities } from "./types";
import { HttpError } from "./auth";
import { textFields, type Education } from "./profile-fields";
import { answerKey, normalizeAnswer, normalizeField } from "./normalize";

export const columns = [
  "first_name",
  "last_name",
  "email",
  "current_company",
  "graduation_year",
  "major",
  "linked_in",
  ...Object.keys(opportunities),
  ...textFields.filter(
    (field) => !["current_company", "major"].includes(field),
  ),
  "education_history",
];
const formHeaders: Record<string, string> = {
  "first name": "first_name", "last name": "last_name", email2: "email",
  linkedin: "linked_in", "graduation year": "graduation_year",
  "highest level of degree earned": "degree",
  "certificate/credential": "form_certificate",
  "doctorate program2": "form_doctorate",
  "bachelor major or academic program": "major", "master's program2": "form_masters",
  "current employment status": "employment_status", "current job title": "job_title",
  "current company": "current_company", industry: "industry",
  "areas of professional expertise or interest": "expertise",
  "how might you or your organization be interested in supporting wsu eecs?": "opportunities",
  "preferred participation format": "participation_format",
  "how frequently may wsu eecs contact you?": "contact_frequency",
  "contact information visibility": "contact_visibility",
  "may wsu eecs students contact you directly?": "student_contact",
  "alumni news and updates": "alumni_updates",
};
function formHeader(header: string) {
  if (["id", "start time", "end time", "completion time", "email", "name", "last modified time", "graduation year2"].includes(header))
    return `ignored_${header}`;
  for (const [prefix, field] of [
    ["current professional location", "professional_location"],
    ["additional comments or opportunities", "additional_comments"],
    ["permission to store and use your information", "storage_consent"],
    ["internal alumni directory permission", "profile_visibility"],
  ]) if (header.startsWith(prefix)) return field;
  return formHeaders[header] ?? header;
}
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
  let isFormExport = false;
  try {
    records = parse(source, {
      bom: true,
      columns: (headers: string[]) => {
        const raw = headers.map((h) => h.replace(/&#x0*a;|&#10;/gi, " ").replace(/\s+/g, " ").trim().toLowerCase());
        isFormExport = raw.includes("first name") && raw.includes("email2");
        const normalized = isFormExport ? raw.map(formHeader) : raw;
        if (new Set(normalized).size !== normalized.length)
          throw new Error("Duplicate column headers.");
        for (const name of ["first_name", "last_name", "email"])
          if (!normalized.includes(name))
            throw new Error(`Missing required header: ${name}.`);
        for (const name of normalized)
          if (!columns.includes(name) && !(isFormExport && (name.startsWith("ignored_") || ["form_certificate", "form_doctorate", "form_masters"].includes(name))))
            throw new Error(
              `Unknown header: ${name}. Download the template for supported columns.`,
            );
        return normalized;
      },
      skip_empty_lines: true,
      trim: true,
      max_record_size: 100000,
    });
  } catch (error) {
    throw new HttpError(400, `Invalid CSV: ${(error as Error).message}`);
  }
  if (!records.length || records.length > 5000)
    throw new HttpError(400, "Upload between 1 and 5,000 alumni per CSV.");
  const seen = new Set<string>();
  return records.map((record, index) => {
    const row = index + 2;
    for (const [field, value] of Object.entries(record)) {
      if (value.length > 10000)
        throw new HttpError(400, `Row ${row}: fields must be 10,000 characters or fewer.`);
      record[field] = normalizeField(field, value);
    }
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
      if (value.length > 10000)
        throw new HttpError(
          400,
          `Row ${row}: fields must be 10,000 characters or fewer.`,
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
    if (isFormExport) {
      const history: Education[] = [];
      const programs = [
        ["major", "Bachelor's", /bachelor/i],
        ["form_masters", "Master's", /master/i],
        ["form_doctorate", "Doctorate", /doctor|phd/i],
        ["form_certificate", "Certificate/Credential", /certificate|credential/i],
      ] as const;
      for (const [key, degree, matches] of programs) {
        if (record[key]) history.push({
          degree: matches.test(record.degree ?? "") ? record.degree : degree,
          major: record[key],
          graduation_year: matches.test(record.degree ?? "") ? year : null,
        });
      }
      if (!history.length && (record.degree || year))
        history.push({ degree: record.degree ?? "", major: "", graduation_year: year });
      record.education_history = JSON.stringify(history);
    }
    if (record.education_history) {
      try {
        const history: unknown = JSON.parse(record.education_history);
        if (!Array.isArray(history) || history.length > 30) throw new Error();
        for (const entry of history) {
          if (!entry || typeof entry !== "object" || Array.isArray(entry))
            throw new Error();
          const e = entry as Education;
          if (
            typeof e.degree !== "string" ||
            typeof e.major !== "string" ||
            (e.graduation_year !== null &&
              (!Number.isInteger(e.graduation_year) ||
                e.graduation_year < 1900 ||
                e.graduation_year > 2100))
          )
            throw new Error();
        }
        const unique = new Map<string, Education>();
        for (const entry of history as Education[]) {
          const normalized = {
            degree: normalizeAnswer("degree", entry.degree),
            major: normalizeAnswer("major", entry.major),
            graduation_year: entry.graduation_year,
          };
          const key = JSON.stringify([answerKey(normalized.degree), answerKey(normalized.major), normalized.graduation_year]);
          if (!unique.has(key)) unique.set(key, normalized);
        }
        record.education_history = JSON.stringify([...unique.values()]);
      } catch {
        throw new HttpError(
          400,
          `Row ${row}: education_history must be a JSON array of degree, major, and graduation_year (1900–2100 or null).`,
        );
      }
    }
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
