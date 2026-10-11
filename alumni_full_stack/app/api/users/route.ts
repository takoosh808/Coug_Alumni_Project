import { connection } from "next/server";
import { db } from "@/lib/db";
import { apiError, checkOrigin, HttpError, requireUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

export async function GET() {
  await connection();
  try {
    await requireUser(["super_admin"]);
    return Response.json({
      users: (
        await db.query("SELECT id,name,email,role FROM users ORDER BY name")
      ).rows,
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await requireUser(["super_admin"]);
    const { name, email, password, role } = await request.json();
    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.length > 100 ||
      typeof email !== "string" ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof password !== "string" ||
      password.length < 12 ||
      password.length > 200 ||
      !["user", "admin"].includes(role)
    )
      throw new HttpError(
        400,
        "Provide a name, valid email, password of 12–200 characters, and user or admin role.",
      );
    try {
      const result = await db.query(
        "INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id,name,email,role",
        [name.trim(), email.trim().toLowerCase(), hashPassword(password), role],
      );
      return Response.json({ user: result.rows[0] }, { status: 201 });
    } catch (error) {
      if ((error as { code: string }).code === "23505")
        throw new HttpError(409, "An account with that email already exists.");
      throw error;
    }
  } catch (error) {
    return apiError(error);
  }
}
