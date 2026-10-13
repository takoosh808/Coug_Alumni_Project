export const opportunities = {
  q_internship: "Internships",
  q_guest_lecture: "Guest lectures",
  q_capstone_mentor: "Capstone mentoring",
  q_company_visits: "Company visits",
} as const;
export type Opportunity = keyof typeof opportunities;
export type Role = "user" | "admin" | "super_admin";
export type User = { id: number; name: string; email: string; role: Role };
export type Alumni = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  current_company: string;
  graduation_year: number | null;
  major: string;
  linked_in: string;
} & Record<Opportunity, boolean | null>;
