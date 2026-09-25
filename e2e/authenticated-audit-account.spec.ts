/**
 * 2026-09 audit — account lifecycle on the disposable Supabase stack
 * (Phase 2.4): sign up, the no-card trial that a new account receives,
 * sign out, sign in, password reset request, and the reset page without a
 * session. Runs in the authenticated project for its environment guard but
 * starts every test signed OUT.
 */
import { expect, test } from "@playwright/test";
import { resolveAuthenticatedE2EEnvironment } from "./support/auth-environment";

const authEnvironment = resolveAuthenticatedE2EEnvironment(process.env);
const authSkipReason = authEnvironment.enabled
  ? "Authenticated browser environment is available."
  : authEnvironment.reason;

test.use({ storageState: { cookies: [], origins: [] } });
test.describe.configure({ mode: "serial" });

test.beforeEach(() => {
  test.skip(!authEnvironment.enabled, authSkipReason);
});

const runKey = `${Date.now().toString(36)}`;
const NEW_EMAIL = `audit-${runKey}@usetruecap.invalid`;
// Local policy: ≥ 12 chars with lower, upper and digits.
const NEW_PASSWORD = `AuditPass${runKey}9Zx`;

test("sign-up creates an account, lands in the app, and opens the 21-day no-card trial", async ({ page }) => {
  await page.goto("/auth/sign-up?next=/dashboard/new", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email", { exact: true }).fill(NEW_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel("Confirm password", { exact: true }).fill(NEW_PASSWORD);
  await page.getByRole("button", { name: /^create account — \$0 today$/i }).click();
  await expect(page).toHaveURL(/^https?:\/\/[^/]+\/dashboard\/new(?:[?#]|$)/, { timeout: 30_000 });
  await expect(page.locator('form[data-calc-form="true"]')).toBeVisible({ timeout: 30_000 });

  // Trial start: the DB trigger opens 3 Pro deals + 1 comparison for 21 days.
  await page.goto("/pricing", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/3 Pro deals \+ 1 comparison remaining/).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Your no-card free trial has ended.")).toHaveCount(0);
});

test("sign out from the account menu ends the session", async ({ page }) => {
  await page.goto("/auth/login?next=/dashboard/new", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email", { exact: true }).fill(NEW_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/^https?:\/\/[^/]+\/dashboard\/new(?:[?#]|$)/, { timeout: 30_000 });

  await page.getByRole("button", { name: /audit-/ }).first().click();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect(page).not.toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/auth\/login/, { timeout: 30_000 });
});

test("a wrong password is rejected with a clear message and no session", async ({ page }) => {
  await page.goto("/auth/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email", { exact: true }).fill(NEW_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill("definitely-not-the-password-1A");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText(/invalid|incorrect|could not sign in|check your email and password/i).first()).toBeVisible({ timeout: 20_000 });
  await expect(page).toHaveURL(/\/auth\/login/);
});

test("password reset can be requested and the reset page without a session offers the recovery links", async ({ page }) => {
  await page.goto("/auth/forgot-password", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email", { exact: true }).fill(NEW_EMAIL);
  await page.getByRole("button", { name: "Send reset link", exact: true }).click();
  await expect(page.getByText("Check your email", { exact: true })).toBeVisible({ timeout: 20_000 });

  await page.goto("/auth/update-password", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Forgot password" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  const text = await page.locator("main, body").first().innerText();
  expect(text).not.toMatch(/NaN|undefined|\[object Object\]/);
});
