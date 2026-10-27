import { connection } from "next/server";
import { db } from "@/lib/db";
import { apiError, checkOrigin, HttpError, requireUser } from "@/lib/auth";
import { columns, parseAlumniCsv } from "@/lib/csv";
import { saveAlumni } from "@/lib/alumni-store";

export async function GET() {
  await connection();
  try {
    await requireUser(["admin", "super_admin"]);
    const result = await db.query(
      "SELECT i.id,i.filename,i.row_count,i.created_at,u.name FROM imports i LEFT JOIN users u ON u.id=i.user_id ORDER BY i.created_at DESC LIMIT 20",
    );
    return Response.json({ imports: result.rows });
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await requireUser(["admin", "super_admin"]);
    if (Number(request.headers.get("content-length")) > 3_000_000)
      throw new HttpError(400, "CSV files must be under 2 MB.");
    const form = await request.formData();
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      !file.name.toLowerCase().endsWith(".csv") ||
      file.size > 2_000_000
    )
      throw new HttpError(400, "Choose a .csv file under 2 MB.");
    const rows = parseAlumniCsv(await file.text());
    if (form.get("preview") === "true")
      return Response.json({
        count: rows.length,
        preview: rows
          .slice(0, 5)
          .map((row) =>
            Object.fromEntries(columns.map((key, index) => [key, row[index]])),
          ),
      });
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      for (const row of rows) {
        await saveAlumni(client, row);
      }
      await client.query(
        "INSERT INTO imports(filename,row_count,user_id) VALUES($1,$2,$3)",
        [file.name.slice(0, 255), rows.length, user.id],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return Response.json({ count: rows.length });
  } catch (error) {
    return apiError(error);
  }
}
