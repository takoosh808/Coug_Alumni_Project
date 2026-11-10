import assert from "node:assert/strict";
import { test } from "node:test";
import { parse } from "csv-parse/sync";
import { profile } from "../support/fixtures";
import { request, signIn, testBase } from "../support/http";

test("CSV export rejects members and exports all matching results for admins and super admins", async () => {
  assert.equal((await request("/api/alumni/export")).response.status, 401);
  const admin = await signIn("admin");
  const member = await signIn("user");
  const superAdmin = await signIn("super_admin");
  assert.equal((await request("/api/alumni/export", member)).response.status, 403);
  const record = { ...profile(450), current_company: "Export Privacy Example", contact_visibility: "Neither", student_contact: "No", additional_comments: "Export staff-only comment" };
  assert.equal((await request("/api/alumni", admin, "POST", JSON.stringify(record))).response.status, 200);
  async function download(query: string, cookie: string) {
    const response = await fetch(`${testBase()}/api/alumni/export?${query}`, { headers: { Cookie: cookie } });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /text\/csv/);
    assert.match(response.headers.get("content-disposition") ?? "", /attachment/);
    return parse<Record<string, string>>(await response.text(), { bom: true, columns: true });
  }
  const query = "current_company=Export+Privacy+Example&page=99";
  assert.equal((await download(query, admin))[0].email, record.email);
  assert.equal((await download(query, superAdmin))[0].email, record.email);
  await request("/api/alumni", admin, "POST", JSON.stringify({ ...record, storage_consent: "No" }));
  assert.equal((await download(query, admin)).length, 1);
  const directory = (await request("/api/alumni?current_company=Test+Network", admin)).data;
  assert.ok(directory.total > 20);
  assert.equal((await download("current_company=Test+Network&page=2", admin)).length, directory.total);
});

test("password change verifies current password, replaces login credentials, and revokes other sessions", async () => {
  const superAdmin = await signIn("super_admin");
  const account = { name: "Password Test", email: "password-change@test.example", password: "Original-test-password-123", role: "user" };
  assert.equal((await request("/api/users", superAdmin, "POST", JSON.stringify(account))).response.status, 201);
  async function login(password: string) {
    return request("/api/auth", "", "POST", JSON.stringify({ email: account.email, password }));
  }
  const first = await login(account.password);
  const other = await login(account.password);
  const cookie = first.response.headers.get("set-cookie")!.split(";")[0];
  const otherCookie = other.response.headers.get("set-cookie")!.split(";")[0];
  const body = { current_password: account.password, new_password: "Replacement-test-password-456" };
  assert.equal((await request("/api/auth/password", "", "POST", JSON.stringify(body))).response.status, 401);
  assert.equal((await request("/api/auth/password", cookie, "POST", JSON.stringify(body), "https://untrusted.example")).response.status, 403);
  assert.equal((await request("/api/auth/password", cookie, "POST", JSON.stringify({ ...body, new_password: "short" }))).response.status, 400);
  assert.equal((await request("/api/auth/password", cookie, "POST", JSON.stringify({ ...body, current_password: "incorrect" }))).response.status, 400);
  assert.equal((await request("/api/auth/password", cookie, "POST", JSON.stringify(body))).response.status, 200);
  assert.ok((await request("/api/auth", cookie)).data.user);
  assert.equal((await request("/api/auth", otherCookie)).data.user, null);
  assert.equal((await login(account.password)).response.status, 401);
  assert.equal((await login(body.new_password)).response.status, 200);
});
