import { connection } from "next/server";
import { apiError, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { directoryFilters, directorySource } from "@/lib/directory-query";
import { exportAlumniCsv } from "@/lib/csv-export";

export async function GET(request: Request) {
  await connection();
  try {
    const user = await requireUser(["admin", "super_admin"]);
    const params = new URL(request.url).searchParams;
    const { where, values } = directoryFilters(params);
    const order = params.get("sort") === "year"
      ? "graduation_year DESC NULLS LAST,last_name,id" : "last_name,first_name,id";
    const result = await db.query(
      `WITH directory AS (${directorySource(user.role !== "user")}) SELECT * FROM directory ${where} ORDER BY ${order}`,
      values,
    );
    return new Response(exportAlumniCsv(result.rows), { headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="alumni-export.csv"',
      "Cache-Control": "no-store",
    } });
  } catch (error) { return apiError(error); }
}
