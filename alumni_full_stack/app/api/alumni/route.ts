import { connection } from "next/server";
import { db } from "@/lib/db";
import { apiError, checkOrigin, HttpError, requireUser } from "@/lib/auth";
import { directorySource, directoryFilters } from "@/lib/directory-query";
import { columns, parseAlumniCsv } from "@/lib/csv";
import { saveAlumni } from "@/lib/alumni-store";
import { directoryFacets, facetOptions } from "@/lib/directory-facets";

export async function GET(request: Request) {
  await connection();
  try {
    const user = await requireUser();
    const params = new URL(request.url).searchParams;
    const { values, where } = directoryFilters(params);
    const page = Math.max(1, Math.min(100000, Number(params.get("page")) || 1));
    if (!Number.isInteger(page))
      throw new HttpError(400, "Page must be a whole number.");
    const source = `WITH directory AS (${directorySource(user.role !== "user")})`;
    const order =
      params.get("sort") === "year"
        ? "graduation_year DESC NULLS LAST,last_name,id"
        : "last_name,first_name,id";
    const [rows, count, stats, facets] = await Promise.all([
      db.query(
        `${source} SELECT * FROM directory ${where} ORDER BY ${order} LIMIT 20 OFFSET $${values.length + 1}`,
        [...values, (page - 1) * 20],
      ),
      db.query(
        `${source} SELECT COUNT(*)::int AS total FROM directory ${where}`,
        values,
      ),
      db.query(
        `${source} SELECT COUNT(*)::int AS total,
          COUNT(DISTINCT NULLIF(LOWER(BTRIM(REGEXP_REPLACE(current_company, '[[:space:]]+', ' ', 'g'))),''))::int AS companies,
          COUNT(*) FILTER(WHERE EXISTS (
            SELECT 1 FROM unnest(string_to_array(opportunities, ';')) AS offered(answer)
            WHERE LOWER(BTRIM(REGEXP_REPLACE(answer, '[[:space:]]+', ' ', 'g'))) NOT IN ('', 'none', 'no', 'n/a', 'not applicable', 'not applicable at this time', 'not at this time', 'please do not contact me about engagement opportunities at this time')
          ))::int AS volunteers,
          COUNT(*) FILTER(WHERE q_internship)::int AS internships,
          (SELECT MIN((entry->>'graduation_year')::int) FROM directory d CROSS JOIN LATERAL jsonb_array_elements(d.education_history) AS entry) AS graduation_year_min,
          (SELECT MAX((entry->>'graduation_year')::int) FROM directory d CROSS JOIN LATERAL jsonb_array_elements(d.education_history) AS entry) AS graduation_year_max
          FROM directory`,
      ),
      db.query(`${source} ${directoryFacets}`),
    ]);
    return Response.json({
      alumni: rows.rows,
      total: count.rows[0].total,
      stats: stats.rows[0],
      filterOptions: facetOptions(facets.rows),
      majors: facetOptions(facets.rows).major ?? [],
      page,
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await requireUser(["admin", "super_admin"]);
    const body = await request.text();
    if (body.length > 200000) throw new HttpError(400, "Profile is too large.");
    const data = JSON.parse(body);
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw new HttpError(400, "Provide a profile object.");
    if (Object.keys(data).some((key) => !columns.includes(key)))
      throw new HttpError(400, "Unknown profile field.");
    const quote = (value: unknown) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv =
      columns.join(",") +
      "\n" +
      columns
        .map((key) =>
          quote(
            key === "education_history" && data[key] !== undefined
              ? JSON.stringify(data[key])
              : data[key],
          ),
        )
        .join(",");
    const [row] = parseAlumniCsv(csv);
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await saveAlumni(client, row);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return Response.json({ saved: true });
  } catch (error) {
    return apiError(error);
  }
}
