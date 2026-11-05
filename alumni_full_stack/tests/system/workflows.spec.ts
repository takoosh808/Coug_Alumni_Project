import { test, expect, type Page } from "@playwright/test";
import { credentials, csv, profile } from "../support/fixtures";

test.beforeAll(() => {
  if (!process.env.TEST_SCHEMA || !process.env.TEST_BASE_URL) {
    throw new Error("Use npm run test:system to start an isolated database and application.");
  }
});

async function login(page: Page, role: keyof typeof credentials) {
  await page.goto("/");
  await page.getByLabel("Email address", { exact: true }).fill(credentials[role].email);
  await page.getByLabel("Password", { exact: true }).fill(credentials[role].password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Alumni directory", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Find alumni" })).toBeEnabled();
}

test("member signs in, filters, paginates, refreshes a shared URL, and signs out", async ({ page }) => {
  await login(page, "user");
  await expect(page.getByRole("link", { name: "CSV imports", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add alumnus", exact: true })).toHaveCount(0);
  await page.getByLabel("Company", { exact: true }).fill("Test Network");
  await page.getByRole("button", { name: "Find alumni" }).click();
  await expect(page).toHaveURL(/current_company=Test\+Network/);
  await expect(page.locator("tbody tr")).toHaveCount(20);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await page.reload();
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(20);
  await page.goBack();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("admin validates a CSV before importing, finds the profile, and edits its education", async ({ page }) => {
  await login(page, "admin");
  await page.getByRole("link", { name: "CSV imports", exact: true }).click();
  await page.getByLabel("Choose your CSV").setInputFiles({
    name: "browser-workflow.csv", mimeType: "text/csv",
    buffer: Buffer.from(csv([{ ...profile(300), first_name: "Browser", last_name: "Import", current_company: "Browser Company" }])),
  });
  await page.getByRole("button", { name: "Validate & preview" }).click();
  await expect(page.getByRole("heading", { name: "1 valid rows" })).toBeVisible();
  await page.getByRole("button", { name: "Import 1 alumni", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "1 alumni imported successfully" })).toBeVisible();
  await expect(page.getByText("browser-workflow.csv", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Alumni directory", exact: true }).click();
  await page.getByLabel("Search all profile fields").fill("alumnus-300@test.example");
  await page.getByRole("button", { name: "Find alumni" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Edit Browser Import", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Edit alumni profile" });
  await expect(editor.getByLabel("Email (used to match this record)")).toHaveAttribute("readonly", "");
  await editor.getByLabel("Current company", { exact: true }).fill("Edited Browser Company");
  await editor.getByRole("button", { name: "Add education record" }).click();
  await editor.getByLabel("Degree earned", { exact: true }).last().fill("PhD");
  await editor.getByLabel("Major / academic program", { exact: true }).last().fill("Software Engineering");
  await editor.getByLabel("Graduation year", { exact: true }).last().fill("2026");
  await editor.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(editor).toBeHidden();
  await expect(page.locator("tbody tr")).toContainText("Edited Browser Company");
  await expect(page.locator("tbody tr")).toContainText("PhD");
  await page.reload();
  await expect(page.locator("tbody tr")).toContainText("Edited Browser Company");
});

test("invalid CSV displays a validation error without offering commit", async ({ page }) => {
  await login(page, "admin");
  await page.getByRole("link", { name: "CSV imports", exact: true }).click();
  await page.getByLabel("Choose your CSV").setInputFiles({
    name: "invalid.csv", mimeType: "text/csv",
    buffer: Buffer.from("first_name,last_name,email\nA,B,not-an-email"),
  });
  await page.getByRole("button", { name: "Validate & preview" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("valid email");
  await expect(page.getByRole("button", { name: /^Import \d+ alumni$/ })).toHaveCount(0);
});

test("super admin creates an account through the UI and the new member can sign in", async ({ page }) => {
  await login(page, "super_admin");
  await page.getByRole("link", { name: "Manage accounts", exact: true }).click();
  await page.getByLabel("Full name").fill("Browser New Member");
  await page.getByLabel("Email address", { exact: true }).fill("browser-member@test.example");
  await page.getByLabel("Initial password").fill("Browser-member-password-123");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByText("browser-member@test.example", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.getByLabel("Email address", { exact: true }).fill("browser-member@test.example");
  await page.getByLabel("Password", { exact: true }).fill("Browser-member-password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Alumni directory", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Manage accounts", exact: true })).toHaveCount(0);
});

test("failed login reports an error and moves focus to the message", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Email address", { exact: true }).fill("missing@test.example");
  await page.getByLabel("Password", { exact: true }).fill("Incorrect-password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const error = page.getByRole("main").getByRole("alert");
  await expect(error).toHaveText("Email or password is incorrect.");
  await expect(error).toBeFocused();
});
