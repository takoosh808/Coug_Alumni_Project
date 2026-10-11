import { connection } from "next/server";
import { db } from "@/lib/db";
import { apiError, HttpError, requireUser } from "@/lib/auth";
import { opportunities } from "@/lib/types";

export async function GET(request: Request) {
  await connection();
  try {
    await requireUser();
    const params = new URL(request.url).searchParams;
    const values: (string | number)[] = [];
    const conditions: string[] = [];
    const add = (value: string | number) => {
      values.push(value);
      return `$${values.length}`;
    };
    const literal = (value: string) => value.replace(/[\\%_]/g, "\\$&");
    const search = params.get("search")?.trim();
    if (search) {
      const p = add(`%${literal(search.slice(0, 200))}%`);
      conditions.push(
        `(first_name || ' ' || last_name ILIKE ${p} OR email ILIKE ${p} OR current_company ILIKE ${p} OR major ILIKE ${p})`,
      );
    }
    for (const column of ["current_company", "major"]) {
      const value = params.get(column);
      if (value)
        conditions.push(
          `${column} ILIKE ${add(`%${literal(value.slice(0, 200))}%`)}`,
        );
    }
    for (const [key, op] of [
      ["year_from", ">="],
      ["year_to", "<="],
    ]) {
      const raw = params.get(key);
      if (raw) {
        const year = Number(raw);
        if (!Number.isInteger(year) || year < 1900 || year > 2100)
          throw new HttpError(
            400,
            "Graduation years must be between 1900 and 2100.",
          );
        conditions.push(`graduation_year ${op} ${add(year)}`);
      }
    }
    const selected = params.getAll("opportunity");
    for (const value of selected)
      if (!Object.hasOwn(opportunities, value))
        throw new HttpError(400, "Unknown opportunity filter.");
    if (selected.length)
      conditions.push(
        `(${selected.map((key) => `${key} = TRUE`).join(params.get("match") === "any" ? " OR " : " AND ")})`,
      );
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const page = Math.max(1, Math.min(100000, Number(params.get("page")) || 1));
    if (!Number.isInteger(page))
      throw new HttpError(400, "Page must be a whole number.");
    const order =
      params.get("sort") === "year"
        ? "graduation_year DESC NULLS LAST, last_name, id"
        : "last_name, first_name, id";
    const [rows, count, stats, facets] = await Promise.all([
      db.query(
        `SELECT * FROM alumni ${where} ORDER BY ${order} LIMIT 20 OFFSET ${add((page - 1) * 20)}`,
        values,
      ),
      db.query(
        `SELECT COUNT(*)::int AS total FROM alumni ${where}`,
        values.slice(0, -1),
      ),
      db.query(
        `SELECT COUNT(*)::int AS total, COUNT(DISTINCT NULLIF(current_company,''))::int AS companies, COUNT(*) FILTER(WHERE q_internship OR q_guest_lecture OR q_capstone_mentor OR q_company_visits)::int AS volunteers, COUNT(*) FILTER(WHERE q_internship)::int AS internships FROM alumni`,
      ),
      db.query(
        "SELECT DISTINCT major FROM alumni WHERE major<>'' ORDER BY major",
      ),
    ]);
    return Response.json({
      alumni: rows.rows,
      total: count.rows[0].total,
      stats: stats.rows[0],
      majors: facets.rows.map((row) => row.major),
      page,
    });
  } catch (error) {
    return apiError(error);
  }
}
