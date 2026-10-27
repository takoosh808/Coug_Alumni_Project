import type { PoolClient } from "pg";
import { columns } from "./csv";
import { profileGroups, type Education } from "./profile-fields";

const legacyLabels: Record<string, string> = {
  q_internship: "Internship opportunities",
  q_guest_lecture: "Guest lecture",
  q_capstone_mentor: "Senior capstone project",
  q_company_visits: "Company visit",
  q_resume_help: "Resume help",
  q_career_fair: "Career fair booth",
};
export function profileFromRow(row: (string | number | boolean | null)[]) {
  const record = Object.fromEntries(columns.map((key, i) => [key, row[i]]));
  if (!record.opportunities)
    record.opportunities = Object.entries(legacyLabels)
      .filter(([key]) => record[key] === true)
      .map(([, label]) => label)
      .join("; ");
  return record;
}
/** Caller owns the transaction so all five entities commit or roll back together. */
export async function saveAlumni(
  client: PoolClient,
  row: (string | number | boolean | null)[],
) {
  const r = profileFromRow(row);
  const result = await client.query(
    `INSERT INTO alumni(first_name,last_name,email,linked_in) VALUES($1,$2,$3,$4)
     ON CONFLICT(email) DO UPDATE SET first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,linked_in=EXCLUDED.linked_in,updated_at=NOW() RETURNING id`,
    [r.first_name, r.last_name, r.email, r.linked_in],
  );
  const id = result.rows[0].id;
  for (const [group, table] of [
    ["professional", "alumni_professional"],
    ["support", "alumni_support_preferences"],
    ["privacy", "alumni_privacy_preferences"],
  ] as const) {
    const fields = Object.keys(profileGroups[group]);
    await client.query(
      `INSERT INTO ${table}(alumni_id,${fields.join(",")}) VALUES($1,${fields.map((_, i) => `$${i + 2}`).join(",")}) ON CONFLICT(alumni_id) DO UPDATE SET ${fields.map((f) => `${f}=EXCLUDED.${f}`).join(",")}`,
      [id, ...fields.map((field) => r[field] ?? "")],
    );
  }
  const history: Education[] = r.education_history
    ? JSON.parse(String(r.education_history))
    : r.degree || r.major || r.graduation_year
      ? [
          {
            degree: String(r.degree ?? ""),
            major: String(r.major ?? ""),
            graduation_year: r.graduation_year as number | null,
          },
        ]
      : [];
  await client.query("DELETE FROM alumni_education WHERE alumni_id=$1", [id]);
  for (const e of history)
    await client.query(
      "INSERT INTO alumni_education(alumni_id,degree,major,graduation_year) VALUES($1,$2,$3,$4)",
      [id, e.degree, e.major, e.graduation_year],
    );
}
