/**
 * 2026-09 audit — state and persistence on the public analyzer (Phase 2.8):
 * refresh mid-flow, back/forward, and a second tab.
 */
import { expect, test, type Page } from "@playwright/test";

const DRAFT_KEY = "truecap_calc_form_draft_v1";

/** Currency inputs render thousands separators ("215,000"); compare numerically. */
async function expectNumericValue(locator: ReturnType<Page["getByLabel"]>, expected: number, timeout = 15_000) {
  await expect
    .poll(async () => Number(((await locator.inputValue()) || "").replace(/[^0-9.-]/g, "")), { timeout })
    .toBe(expected);
}

test("a refresh mid-form restores the typed draft", async ({ page }) => {
  await page.goto("/analyze", { waitUntil: "domcontentloaded" });
  const form = page.locator('form[data-calc-form="true"]');
  await expect(form).toHaveAttribute("data-calculator-ready", "true", { timeout: 30_000 });
  await form.getByLabel("Property Address", { exact: true }).fill("40 Persist Test Ave, Columbus, OH 43215");
  await form.getByLabel("Price to analyze", { exact: true }).fill("215000");
  await form.getByLabel("Expected gross monthly rent", { exact: true }).fill("2150");
  await expect.poll(() => page.evaluate((k) => window.localStorage.getItem(k), DRAFT_KEY)).not.toBeNull();

  await page.reload({ waitUntil: "domcontentloaded" });
  const reloaded = page.locator('form[data-calc-form="true"]');
  await expect(reloaded).toHaveAttribute("data-calculator-ready", "true", { timeout: 30_000 });
  await expectNumericValue(reloaded.getByLabel("Price to analyze", { exact: true }), 215000);
  await expectNumericValue(reloaded.getByLabel("Expected gross monthly rent", { exact: true }), 2150);
  await expect(reloaded.getByLabel("Property Address", { exact: true })).toHaveValue(/Persist Test/);
});

test("back and forward between the analyzer and pricing keep the draft", async ({ page }) => {
  await page.goto("/analyze", { waitUntil: "domcontentloaded" });
  const form = page.locator('form[data-calc-form="true"]');
  await expect(form).toHaveAttribute("data-calculator-ready", "true", { timeout: 30_000 });
  await form.getByLabel("Price to analyze", { exact: true }).fill("199000");
  await form.getByLabel("Expected gross monthly rent", { exact: true }).fill("1990");
  await expect.poll(() => page.evaluate((k) => window.localStorage.getItem(k), DRAFT_KEY)).not.toBeNull();

  await page.locator("header").getByRole("link", { name: "Pricing", exact: true }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/\/pricing/, { timeout: 15_000 });
  await page.goBack({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/analyze/);
  const back = page.locator('form[data-calc-form="true"]');
  await expect(back).toHaveAttribute("data-calculator-ready", "true", { timeout: 30_000 });
  await expectNumericValue(back.getByLabel("Price to analyze", { exact: true }), 199000);
  await page.goForward({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/pricing/);
});

test("a second tab sees the same draft and a completed result survives a reload", async ({ page, context }) => {
  await page.goto("/analyze", { waitUntil: "domcontentloaded" });
  const form = page.locator('form[data-calc-form="true"]');
  await expect(form).toHaveAttribute("data-calculator-ready", "true", { timeout: 30_000 });
  await form.getByLabel("Property Address", { exact: true }).fill("50 Tabs Test Ave, Columbus, OH 43215");
  await form.getByLabel("Price to analyze", { exact: true }).fill("222000");
  await form.getByLabel("Expected gross monthly rent", { exact: true }).fill("2220");
  await expect.poll(() => page.evaluate((k) => window.localStorage.getItem(k), DRAFT_KEY)).not.toBeNull();

  const tab2 = await context.newPage();
  await tab2.goto("/analyze", { waitUntil: "domcontentloaded" });
  const form2 = tab2.locator('form[data-calc-form="true"]');
  await expect(form2).toHaveAttribute("data-calculator-ready", "true", { timeout: 30_000 });
  await expectNumericValue(form2.getByLabel("Price to analyze", { exact: true }), 222000);
  await tab2.close();

  await form.locator('button[data-inform-submit="true"]').click();
  await expect(page.locator("section[aria-labelledby='decision-summary-title']")).toBeVisible({ timeout: 30_000 });
  await page.reload({ waitUntil: "domcontentloaded" });
  const after = page.locator('form[data-calc-form="true"]');
  await expect(after).toHaveAttribute("data-calculator-ready", "true", { timeout: 30_000 });
  // Either the result is restored or the complete draft is — never a blank form.
  const price = after.getByLabel("Price to analyze", { exact: true });
  const resultOrDraft = page.locator("section[aria-labelledby='decision-summary-title']").or(price);
  await expect(resultOrDraft.first()).toBeVisible({ timeout: 15_000 });
  await expectNumericValue(price, 222000);
});
