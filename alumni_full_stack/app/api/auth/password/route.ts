import { cookies } from "next/headers";
import { apiError, checkOrigin, HttpError, requireUser, tokenHash } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    const body = await request.json();
    if (!body || typeof body.current_password !== "string" || !body.current_password.length ||
      body.current_password.length > 200 || typeof body.new_password !== "string" ||
      body.new_password.length < 12 || body.new_password.length > 200)
      throw new HttpError(400, "Enter your current password and a new password of 12–200 characters.");
    const attemptKey = `password-change:${user.id}`;
    const attempts = await db.query(
      `INSERT INTO login_attempts(email,attempts) VALUES($1,1) ON CONFLICT(email) DO UPDATE SET attempts=CASE WHEN login_attempts.window_start < NOW()-INTERVAL '15 minutes' THEN 1 ELSE login_attempts.attempts+1 END, window_start=CASE WHEN login_attempts.window_start < NOW()-INTERVAL '15 minutes' THEN NOW() ELSE login_attempts.window_start END RETURNING attempts`,
      [attemptKey],
    );
    if (attempts.rows[0].attempts > 10) throw new HttpError(429, "Too many password attempts. Try again in 15 minutes.");
    const result = await db.query("SELECT password_hash FROM users WHERE id=$1", [user.id]);
    const previousHash = result.rows[0]?.password_hash;
    if (!previousHash || !verifyPassword(body.current_password, previousHash))
      throw new HttpError(400, "Current password is incorrect.");
    if (body.new_password === body.current_password)
      throw new HttpError(400, "Choose a different new password.");
    const token = (await cookies()).get("coug_session")?.value;
    if (!token) throw new HttpError(401, "Sign in to continue.");
    const nextHash = hashPassword(body.new_password);
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const updated = await client.query("UPDATE users SET password_hash=$1 WHERE id=$2 AND password_hash=$3 RETURNING id", [nextHash, user.id, previousHash]);
      if (!updated.rowCount) throw new HttpError(409, "Your password changed. Sign in again and retry.");
      await client.query("DELETE FROM sessions WHERE user_id=$1 AND token_hash<>$2", [user.id, tokenHash(token)]);
      await client.query("DELETE FROM login_attempts WHERE email=$1", [attemptKey]);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}
