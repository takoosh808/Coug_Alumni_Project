import { columns, parseAlumniCsv } from "../../lib/csv";

export const credentials = {
  super_admin: { email: "super@test.example", password: "Test-only-super-password-123" },
  admin: { email: "admin@test.example", password: "Test-only-admin-password-123" },
  user: { email: "member@test.example", password: "Test-only-member-password-123" },
} as const;

export const memberPermission = {
  storage_consent: "Yes",
  profile_visibility: "Authorized WSU EECS faculty, staff, and students",
  contact_visibility: "Both email address and LinkedIn profile",
  student_contact: "Yes by either email or LinkedIn",
};

export function csv(records: Record<string, unknown>[]) {
  const quote = (value: unknown) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;
  return [columns.join(","), ...records.map((record) =>
    columns.map((key) => quote(key === "education_history" && record[key] !== undefined
      ? JSON.stringify(record[key]) : record[key])).join(","),
  )].join("\n");
}

export function validatedRow(record: Record<string, unknown>) {
  return parseAlumniCsv(csv([record]))[0];
}

export function profile(index: number, company = "Test Network") {
  return {
    first_name: "Test",
    last_name: `Alumnus${String(index).padStart(3, "0")}`,
    email: `alumnus-${index}@test.example`,
    linked_in: `https://www.linkedin.com/in/test-${index}`,
    current_company: company,
    industry: "Test engineering",
    expertise: "Robotics; AI",
    opportunities: index % 2 === 0 ? "Internship opportunities; Robotics lab tours" : "Guest lecture",
    additional_comments: "Departmental secret",
    ...memberPermission,
    education_history: [
      { degree: "BS", major: "Computer Science", graduation_year: 2018 },
      { degree: "MS", major: "Robotics", graduation_year: 2024 },
    ],
  };
}
