import type { Alumni, User } from "./types";
export type Directory = {
  alumni: Alumni[];
  total: number;
  page: number;
  stats: {
    total: number;
    companies: number;
    volunteers: number;
    internships: number;
  };
  majors: string[];
};
export type ImportRecord = {
  id: number;
  filename: string;
  row_count: number;
  name: string;
  created_at: string;
};
export type Preview = { count: number; preview: Alumni[] };
export const number = new Intl.NumberFormat("en-US");
export const roleName = (role: string) =>
  role === "super_admin"
    ? "Super admin"
    : role === "admin"
      ? "Administrator"
      : "Member";

export type Navigate = (tab: string, query?: string) => void;
export type { User };
