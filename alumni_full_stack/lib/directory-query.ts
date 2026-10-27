import { opportunities } from "./types";
import { textFields } from "./profile-fields";
import { HttpError } from "./auth";

// Members can include students. Custom or missing permissions require staff review.
export const memberVisibility = `LOWER(TRIM(storage_consent)) IN ('yes','true','1','y','i agree')
 AND LOWER(TRIM(profile_visibility)) = 'authorized wsu eecs faculty, staff, and students'`;
export function directorySource(admin: boolean) {
  if (admin) return "SELECT * FROM alumni_directory";
  const fields = ["id", "first_name", "last_name", "linked_in", "email", "updated_at", "graduation_year", "education_history", ...textFields, ...Object.keys(opportunities)];
  return `SELECT ${[...new Set(fields)].map(field => {
    if (field === "email") return `CASE WHEN LOWER(TRIM(contact_visibility)) IN ('email address only','both email address and linkedin profile','both email and address and linked in profile') AND LOWER(TRIM(student_contact)) IN ('yes by email','yes by either email or linkedin') THEN email ELSE '' END AS email`;
    if (field === "linked_in") return `CASE WHEN LOWER(TRIM(contact_visibility)) IN ('linkedin profile only','both email address and linkedin profile','both email and address and linked in profile') AND LOWER(TRIM(student_contact)) IN ('yes through linkedin','yes by either email or linkedin') THEN linked_in ELSE '' END AS linked_in`;
    if (field === "additional_comments") return "''::text AS additional_comments";
    return field;
  }).join(",")} FROM alumni_directory WHERE ${memberVisibility}`;
}
export function directoryFilters(params: URLSearchParams) {
  const values: (string | number)[] = [], conditions: string[] = [];
  const add = (value: string | number) => { values.push(value); return `$${values.length}`; };
  const literal = (value: string) => `%${value.slice(0, 200).replace(/[\\%_]/g, "\\$&")}%`;
  const search = params.get("search")?.trim();
  if (search) {
    const p = add(literal(search));
    conditions.push(`(CONCAT_WS(' ',first_name,last_name,email,linked_in,${textFields.join(",")},education_history::text) ILIKE ${p})`);
  }
  for (const field of textFields.filter(f => !["degree", "major"].includes(f))) {
    const value = params.get(field)?.trim();
    if (value) conditions.push(`${field} ILIKE ${add(literal(value))}`);
  }
  const education: string[] = [];
  for (const field of ["degree", "major"]) {
    const value = params.get(field)?.trim();
    if (value) education.push(`entry->>'${field}' ILIKE ${add(literal(value))}`);
  }
  for (const [key,op] of [["year_from",">="],["year_to","<="]]) {
    const raw = params.get(key);
    if (raw) {
      const year = Number(raw);
      if (!Number.isInteger(year) || year < 1900 || year > 2100) throw new HttpError(400,"Graduation years must be between 1900 and 2100.");
      education.push(`(entry->>'graduation_year')::int ${op} ${add(year)}`);
    }
  }
  if (Number(params.get("year_from")) > Number(params.get("year_to")) && params.has("year_to")) throw new HttpError(400,"The starting graduation year must not be later than the ending year.");
  if (education.length) conditions.push(`EXISTS (SELECT 1 FROM jsonb_array_elements(education_history) entry WHERE ${education.join(" AND ")})`);
  const selected = params.getAll("opportunity");
  if (selected.some(key => !Object.hasOwn(opportunities,key))) throw new HttpError(400,"Unknown opportunity filter.");
  if (selected.length) conditions.push(`(${selected.map(key => `${key}=TRUE`).join(params.get("match") === "any" ? " OR " : " AND ")})`);
  return { values, where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "" };
}
