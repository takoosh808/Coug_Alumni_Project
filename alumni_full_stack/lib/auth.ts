import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";
import type { User, Role } from "./types";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get("coug_session")?.value;
  if (!token) return null;
  const result = await db.query<User>(
    `SELECT u.id, u.name, u.email, u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>NOW()`,
    [tokenHash(token)],
  );
  return result.rows[0] ?? null;
}
export async function requireUser(roles?: Role[]) {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Sign in to continue.");
  if (roles && !roles.includes(user.role))
    throw new HttpError(
      403,
      "Your account does not have permission for this action.",
    );
  return user;
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  // Standalone servers use an internal hostname in request.url. The Host
  // header preserves the browser's destination across Docker's port mapping.
  const host = request.headers.get("host");
  const expected = process.env.APP_ORIGIN ?? `${new URL(request.url).protocol}//${host}`;
  if (!origin || !host || origin !== expected)
    throw new HttpError(
      403,
      "Request origin was rejected. Refresh the page and try again.",
    );
}
export async function createSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  await db.query("DELETE FROM sessions WHERE expires_at < NOW()");
  await db.query(
    "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '7 days')",
    [tokenHash(token), userId],
  );
  (await cookies()).set("coug_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: 604800,
  });
}
export function apiError(error: unknown) {
  if (error instanceof SyntaxError) return Response.json({ error: "Invalid request data. Refresh the page and try again." }, { status: 400 });
  if (error instanceof HttpError)
    return Response.json({ error: error.message }, { status: error.status });
  console.error(error);
  return Response.json(
    {
      error:
        "The database is unavailable or not initialized. Check DATABASE_URL and run npm run db:init.",
    },
    { status: 503 },
  );
}
