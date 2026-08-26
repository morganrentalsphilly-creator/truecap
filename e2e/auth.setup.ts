import { expect, test as setup } from "@playwright/test";
import { resolveAuthenticatedE2EEnvironment } from "./support/auth-environment";

const authEnvironment = resolveAuthenticatedE2EEnvironment(process.env);
const authStatePath = "playwright/.auth/internal-test-user.json";
const authSkipReason = authEnvironment.enabled
  ? "Authenticated browser environment is available."
  : authEnvironment.reason;

setup("authenticate the isolated internal test account", async ({ page }) => {
  setup.skip(!authEnvironment.enabled, authSkipReason);
  if (!authEnvironment.enabled) return;

  await page.goto("/auth/login?next=/dashboard/saved-analyses", {
    waitUntil: "domcontentloaded",
  });
  await page.getByLabel("Email").fill(authEnvironment.email);
  await page.getByLabel("Password").fill(authEnvironment.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(page).toHaveURL(/\/dashboard\/saved-analyses(?:[?#]|$)/, {
    timeout: 30_000,
  });
  await expect(page.getByRole("heading", { level: 1, name: "My Deals" })).toBeVisible();
  await page.context().storageState({ path: authStatePath });
});
