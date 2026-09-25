/**
 * 2026-09 audit — Pro workflows (Phases 2.2 and 2.3): the sample deal inside
 * the app shell, ungated projections and sensitivity, create → save → edit →
 * reopen by deep link → duplicate → compare two deals → delete.
 */
import { expect, test } from "@playwright/test";
import { resolveAuthenticatedE2EEnvironment } from "./support/auth-environment";
import { acceptCookiesIfShown, deleteRegressionDealsByAddress } from "./support/product-flows";
import { SAMPLE_DEAL_FIXTURE } from "../lib/sample-deal";

const authEnvironment = resolveAuthenticatedE2EEnvironment(process.env);
const authSkipReason = authEnvironment.enabled
  ? "Authenticated browser environment is available."
  : authEnvironment.reason;

test.beforeEach(() => {
  test.skip(!authEnvironment.enabled, authSkipReason);
});

test("the sample deal runs inside the dashboard shell", async ({ page }) => {
  await page.goto("/dashboard/new?sample=1", { waitUntil: "domcontentloaded" });
  await acceptCookiesIfShown(page);
  await expect(page.locator("#decision-summary-title")).toBeVisible({ timeout: 30_000 });
  const summary = page.locator("section[aria-labelledby='decision-summary-title']");
  await expect(summary.getByText(SAMPLE_DEAL_FIXTURE.display.shortAddress, { exact: true })).toBeVisible();
  await expect(summary.getByText("Offer Ceiling", { exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: /dashboard/i }).first()).toBeVisible();
});

test("Pro is never gated: projections and stress test open, then save → edit → deep link → duplicate → compare → delete", async ({ page }, testInfo) => {
  test.setTimeout(300_000);
  const runKey = `${Date.now().toString(36)}-${testInfo.workerIndex}`;
  const addressA = `E2E Pro ${runKey} A Ave, Philadelphia, PA 19140`;
  const addressB = `E2E Pro ${runKey} B Ave, Philadelphia, PA 19140`;
  try {
    await page.goto("/dashboard/new", { waitUntil: "domcontentloaded" });
    await acceptCookiesIfShown(page);
    const form = page.locator('form[data-calc-form="true"]');
    await expect(form).toHaveAttribute("data-calculator-ready", "true", { timeout: 30_000 });
    await form.getByLabel("Property Address", { exact: true }).fill(addressA);
    await form.getByLabel("Price to analyze", { exact: true }).fill("250000");
    await form.getByLabel("Expected gross monthly rent", { exact: true }).fill("2600");
    await form.locator('button[data-inform-submit="true"]').click();
    const summary = page.locator("section[aria-labelledby='decision-summary-title']");
    await expect(summary).toBeVisible({ timeout: 30_000 });

    const goDeeper = page.locator("details").filter({ hasText: "Go deeper" }).first();
    if (!(await goDeeper.evaluate((el) => el.hasAttribute("open")))) {
      await goDeeper.locator("summary").first().click();
    }
    const projections = page.locator("[data-drill-row='projections']");
    await expect(projections).toBeVisible();
    await expect(projections.getByText("PRO", { exact: true })).toHaveCount(0);
    await projections.getByRole("button").first().click();
    await expect(projections.getByText(/Year 10|10-year/i).first()).toBeVisible({ timeout: 30_000 });
    const stress = page.locator("[data-drill-row='stress-test']");
    await expect(stress.getByText("PRO", { exact: true })).toHaveCount(0);
    await stress.getByRole("button", { name: /Stress Test/ }).click();
    await expect(stress.getByText("Sensitivity analysis", { exact: true })).toBeVisible({ timeout: 30_000 });

    // Save, then edit and save again.
    const save = summary.getByRole("button", { name: "Save", exact: true });
    await expect(save).toBeEnabled({ timeout: 20_000 });
    await save.click();
    await expect(page).toHaveURL(/[?&]savedDeal=[0-9a-f-]{36}(?:&|$)/i, { timeout: 30_000 });
    const dealId = new URL(page.url()).searchParams.get("savedDeal")!;
    await expect(summary.getByRole("button", { name: "Saved", exact: true })).toBeVisible({ timeout: 30_000 });

    await summary.getByRole("button", { name: "Edit assumptions", exact: true }).click();
    // The saved deal's edit field re-renders while the value is being
    // replaced (CI captured "26,002,700": the new digits appended to the old
    // "2,600"), so replace and verify until the field holds the new rent.
    const rentField = form.getByLabel("Expected gross monthly rent", { exact: true });
    await expect(async () => {
      await rentField.fill("");
      await rentField.fill("2700");
      await expect(rentField).toHaveValue(/^2,?700$/);
    }).toPass({ timeout: 20_000 });
    await page.getByRole("button", { name: "Done editing", exact: true }).click();
    await expect(page.getByText(/last complete entry/)).toHaveCount(0);
    const saveAgain = summary.getByRole("button", { name: "Save", exact: true });
    await expect(saveAgain).toBeEnabled({ timeout: 20_000 });
    await saveAgain.click();
    await expect(summary.getByRole("button", { name: "Saved", exact: true })).toBeVisible({ timeout: 30_000 });

    // Deep link reopens the edited deal.
    await page.goto(`/dashboard/new?savedDeal=${dealId}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#decision-summary-title")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("section[aria-labelledby='decision-summary-title']").getByText(addressA, { exact: true })).toBeVisible();
    // The reopened deal carries the edited rent in its assumption ledger (the
    // ledger row is collapsed by default, so assert the value, not visibility).
    await expect(page.locator('[data-assumption-ledger-value="rent"]').first()).toContainText("2,700");

    // Duplicate from the deal workspace → the analyzer carries the assumptions
    // but asks for the new property.
    await page.goto(`/dashboard/saved-analyses/${dealId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1, name: addressA })).toBeVisible({ timeout: 30_000 });
    const duplicate = page.getByRole("button", { name: /duplicate|new deal from this/i }).first();
    await expect(duplicate).toBeVisible();
    const [dupPage] = await Promise.all([
      page.context().waitForEvent("page", { timeout: 30_000 }).catch(() => null),
      duplicate.click(),
    ]);
    const target = dupPage ?? page;
    await expect(target).toHaveURL(/\/dashboard\/new/, { timeout: 30_000 });
    const dupForm = target.locator('form[data-calc-form="true"]');
    await expect(dupForm).toHaveAttribute("data-calculator-ready", "true", { timeout: 30_000 });
    await expect(dupForm.getByLabel("Property Address", { exact: true })).toHaveValue("");
    await dupForm.getByLabel("Property Address", { exact: true }).fill(addressB);
    await dupForm.getByLabel("Price to analyze", { exact: true }).fill("230000");
    await dupForm.getByLabel("Expected gross monthly rent", { exact: true }).fill("2500");
    await dupForm.locator('button[data-inform-submit="true"]').click();
    const dupSummary = target.locator("section[aria-labelledby='decision-summary-title']");
    await expect(dupSummary).toBeVisible({ timeout: 30_000 });
    const saveB = dupSummary.getByRole("button", { name: "Save", exact: true });
    await expect(saveB).toBeEnabled({ timeout: 20_000 });
    await saveB.click();
    await expect(target).toHaveURL(/[?&]savedDeal=[0-9a-f-]{36}(?:&|$)/i, { timeout: 30_000 });
    if (dupPage) await dupPage.close();

    // Compare the two saved deals side by side.
    await page.goto("/dashboard/saved-analyses", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Search your deals by address").fill(`E2E Pro ${runKey}`);
    for (const addr of [addressA, addressB]) {
      const line = addr.split(",")[0]!;
      await page.getByLabel(`Select analysis ${line}`, { exact: true }).filter({ visible: true }).first().check();
    }
    const selectedActions = page.getByRole("region", { name: "Selected deal actions" });
    await selectedActions.getByRole("button", { name: "Compare", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/compare/, { timeout: 30_000 });
    for (const addr of [addressA, addressB]) {
      await expect(page.getByText(addr.split(",")[0]!, { exact: false }).filter({ visible: true }).first()).toBeVisible({ timeout: 30_000 });
    }
    const text = await page.locator("main").innerText();
    expect(text).not.toMatch(/\bNaN\b|\bundefined\b|\bInfinity\b/);
  } finally {
    await deleteRegressionDealsByAddress(page, `E2E Pro ${runKey}`).catch(() => 0);
  }
});
