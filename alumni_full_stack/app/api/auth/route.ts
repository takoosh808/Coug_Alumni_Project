import { connection } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  apiError,
  checkOrigin,
  createSession,
  currentUser,
  HttpError,
  tokenHash,
} from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";

const dummyHash = hashPassword("invalid-account-placeholder");
export async function GET() {
  await connection();
  try {
    return Response.json({ user: await currentUser() });
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const body = await request.json();
    if (
      typeof body.email !== "string" ||
      typeof body.password !== "string" ||
      body.email.length > 254 ||
      body.password.length > 200
    )
      throw new HttpError(400, "Enter your email and password.");
    const email = body.email.trim().toLowerCase();
    const attempt = await db.query(
      `INSERT INTO login_attempts(email,attempts) VALUES($1,1) ON CONFLICT(email) DO UPDATE SET attempts=CASE WHEN login_attempts.window_start < NOW()-INTERVAL '15 minutes' THEN 1 ELSE login_attempts.attempts+1 END, window_start=CASE WHEN login_attempts.window_start < NOW()-INTERVAL '15 minutes' THEN NOW() ELSE login_attempts.window_start END RETURNING attempts`,
      [email],
    );
    if (attempt.rows[0].attempts > 10)
      throw new HttpError(
        429,
        "Too many sign-in attempts. Try again in 15 minutes.",
      );
    const result = await db.query("SELECT * FROM users WHERE email=$1", [
      email,
    ]);
    const user = result.rows[0];
    const valid = verifyPassword(
      body.password,
      user?.password_hash ?? dummyHash,
    );
    if (!user || !valid)
      throw new HttpError(401, "Email or password is incorrect.");
    await createSession(user.id);
    await db.query("DELETE FROM login_attempts WHERE email=$1", [email]);
    return Response.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    const store = await cookies();
    const token = store.get("coug_session")?.value;
    if (token)
      await db.query("DELETE FROM sessions WHERE token_hash=$1", [
        tokenHash(token),
      ]);
    store.delete("coug_session");
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
