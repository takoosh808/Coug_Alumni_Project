import assert from "node:assert/strict";
import { credentials } from "./fixtures";

export function testBase() {
  if (!process.env.TEST_BASE_URL || !process.env.TEST_SCHEMA) {
    throw new Error("Run through scripts/run-tests.ts to use the isolated test server.");
  }
  return process.env.TEST_BASE_URL;
}

export async function request(path: string, cookie = "", method = "GET", body?: BodyInit, origin = testBase(), timeoutMs = 15_000) {
  const headers: Record<string, string> = { Origin: origin };
  if (cookie) headers.Cookie = cookie;
  if (typeof body === "string") headers["Content-Type"] = "application/json";
  const response = await fetch(`${testBase()}${path}`, {
    method, headers, body, signal: AbortSignal.timeout(timeoutMs),
  });
  const data = await response.json();
  return { response, data };
}

export async function signIn(role: keyof typeof credentials) {
  const { response } = await request("/api/auth", "", "POST", JSON.stringify(credentials[role]));
  assert.equal(response.status, 200, `Could not sign in as ${role}`);
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie, "Sign-in must issue a session cookie");
  return cookie;
}

export function upload(source: string, preview: boolean, filename = "test.csv") {
  const body = new FormData();
  body.set("file", new File([source], filename, { type: "text/csv" }));
  body.set("preview", String(preview));
  return body;
}
