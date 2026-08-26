import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { resolveAuthenticatedE2EEnvironment } from "./support/auth-environment";
import {
  deleteRegressionDealsByAddress,
  dismissNotifications,
  saveUniqueSampleDeal,
} from "./support/product-flows";

const evidenceDirectory = "artifacts/current-visual-evidence";
const captureVisuals = process.env.PLAYWRIGHT_CAPTURE_VISUALS === "true";
const authEnvironment = resolveAuthenticatedE2EEnvironment(process.env);
const authSkipReason = authEnvironment.enabled
  ? "Authenticated browser environment is available."
  : authEnvironment.reason;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  test.skip(
    !captureVisuals,
    "Set PLAYWRIGHT_CAPTURE_VISUALS=true to regenerate evidence.",
  );
  test.skip(!authEnvironment.enabled, authSkipReason);
  await mkdir(evidenceDirectory, { recursive: true });
});

test("capture authenticated dashboard, workspace, scenario, and comparison evidence", async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1280, height: 900 });

  const runKey = `${Date.now().toString(36)}-${testInfo.workerIndex}-${testInfo.retry}`;
  const address = `E2E Visual ${runKey} Ave, Philadelphia, PA 19140`;
  const scenarioName = `E2E visual downside ${runKey}`;
  let baseDealId: string | null = null;

  try {
    baseDealId = await saveUniqueSampleDeal(page, address);

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { level: 1, name: /Welcome back/ }),
    ).toBeVisible();
    await expect(
      page.getByText(address, { exact: true }).first(),
    ).toBeVisible();
    await page.screenshot({
      path: `${evidenceDirectory}/dashboard-1280.png`,
      fullPage: true,
      animations: "disabled",
    });

    await page.goto(`/dashboard/saved-analyses/${baseDealId}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByRole("heading", { level: 1, name: address }),
    ).toBeVisible();
    await page.screenshot({
      path: `${evidenceDirectory}/workspace-1280.png`,
      animations: "disabled",
    });

    const scenarios = page
      .getByRole("heading", { level: 2, name: "Scenarios" })
      .locator("xpath=ancestor::section");
    await scenarios
      .getByRole("button", { name: "Add a scenario", exact: true })
      .click();
    await scenarios.getByLabel("Scenario name").fill(scenarioName);
    await scenarios
      .getByRole("button", { name: "Add scenario", exact: true })
      .click();
    await expect(
      page.getByText("Scenario created", { exact: true }),
    ).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      scenarios.getByText(scenarioName, { exact: true }),
    ).toBeVisible();
    await dismissNotifications(page);
    await scenarios.screenshot({
      path: `${evidenceDirectory}/workspace-scenario-1280.png`,
      animations: "disabled",
    });

    await scenarios
      .getByRole("button", { name: "Compare scenarios", exact: true })
      .click();
    await expect(page).toHaveURL(/\/dashboard\/compare(?:[?#]|$)/, {
      timeout: 30_000,
    });
    await expect(
      page.getByRole("heading", { level: 1, name: "Compare Deals" }),
    ).toBeVisible();
    await expect(
      page.getByText(scenarioName, { exact: true }).first(),
    ).toBeVisible();
    await page.screenshot({
      path: `${evidenceDirectory}/comparison-1280.png`,
      fullPage: true,
      animations: "disabled",
    });
  } finally {
    if (baseDealId) {
      await deleteRegressionDealsByAddress(page, address);
    }
  }
});
