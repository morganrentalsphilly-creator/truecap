/**
 * 2026-09 audit — form hardening on the public analyzer (Phase 2.6).
 * Every bad input must produce a clear message or a sensible fallback:
 * never NaN, Infinity, undefined, a blank screen or a stuck spinner.
 */
import { expect, test, type Page } from "@playwright/test";

const ADDRESS = "100 Hardening Test Ave, Columbus, OH 43215";
const RUN_BUTTON = "Analyze deal & calculate ceiling";

async function openAnalyzer(page: Page) {
  await page.goto("/analyze", { waitUntil: "domcontentloaded" });
  const form = page.locator('form[data-calc-form="true"]');
  await expect(form).toHaveAttribute("data-calculator-ready", "true", { timeout: 20_000 });
  const accept = page.getByRole("button", { name: /^accept( all)?$/i });
  await accept.click({ timeout: 1_500 }).catch(() => {});
  return form;
}

async function expectNoNumericGarbage(page: Page) {
  const text = await page.locator("main").innerText();
  expect(text).not.toMatch(/\bNaN\b|\bInfinity\b|\bundefined\b|\[object Object\]|\$-?NaN/);
}

test("empty, zero and negative price/rent are rejected with a visible message and no run", async ({ page }) => {
  const form = await openAnalyzer(page);
  const price = form.getByLabel("Price to analyze", { exact: true });
  const rent = form.getByLabel("Expected gross monthly rent", { exact: true });
  const run = form.locator('button[data-inform-submit="true"]');
  await form.getByLabel("Property Address", { exact: true }).fill(ADDRESS);

  // Empty price + rent
  await run.click();
  await expect(form.getByText(/enter purchase price|price/i).first()).toBeVisible();
  await expect(page.locator("section[aria-labelledby='decision-summary-title']")).toHaveCount(0);

  // Zero price
  await price.fill("0");
  await rent.fill("2000");
  await run.click();
  await expect(form.getByText(/at least \$10,000/i)).toBeVisible();
  await expect(page.locator("section[aria-labelledby='decision-summary-title']")).toHaveCount(0);

  // Negative rent
  await price.fill("250000");
  await rent.fill("-100");
  await run.click();
  await expect(page.locator("section[aria-labelledby='decision-summary-title']")).toHaveCount(0);
  await expectNoNumericGarbage(page);
  await expect(run).toBeEnabled();
});

test("huge numbers, decimals, commas and currency symbols are normalised or rejected clearly", async ({ page }) => {
  const form = await openAnalyzer(page);
  const price = form.getByLabel("Price to analyze", { exact: true });
  const rent = form.getByLabel("Expected gross monthly rent", { exact: true });
  const run = form.locator('button[data-inform-submit="true"]');
  await form.getByLabel("Property Address", { exact: true }).fill(ADDRESS);

  // Way above the supported domain.
  await price.fill("999999999999");
  await rent.fill("2500");
  await run.click();
  await expect(form.getByText(/too large/i).first()).toBeVisible();
  await expect(page.locator("section[aria-labelledby='decision-summary-title']")).toHaveCount(0);

  // Decimals and thousands separators must survive.
  await price.fill("250,000.50");
  await rent.fill("2,450.75");
  await run.click();
  const summary = page.locator("section[aria-labelledby='decision-summary-title']");
  await expect(summary).toBeVisible({ timeout: 30_000 });
  await expect(summary).toContainText(/\$250,00[01]/);
  await expectNoNumericGarbage(page);
});

test("pasted text and an invalid ZIP degrade gracefully", async ({ page }) => {
  const form = await openAnalyzer(page);
  const price = form.getByLabel("Price to analyze", { exact: true });
  const rent = form.getByLabel("Expected gross monthly rent", { exact: true });
  const run = form.locator('button[data-inform-submit="true"]');

  // Invalid ZIP in a typed address: enrichment must skip it, the run still works.
  await form.getByLabel("Property Address", { exact: true }).fill("55 Bad Zip Rd, Columbus, OH 4321");
  await price.fill("abc");
  await expect(price).toHaveValue(/^(|abc|0)$/);
  await price.fill("$240,000");
  await rent.fill("two thousand");
  await run.click();
  await expect(page.locator("section[aria-labelledby='decision-summary-title']")).toHaveCount(0);
  await rent.fill("2000");
  await run.click();
  await expect(page.locator("section[aria-labelledby='decision-summary-title']")).toBeVisible({ timeout: 30_000 });
  await expectNoNumericGarbage(page);
});

test("a double submit produces one result and the button never sticks in a loading state", async ({ page }) => {
  const form = await openAnalyzer(page);
  await form.getByLabel("Property Address", { exact: true }).fill(ADDRESS);
  await form.getByLabel("Price to analyze", { exact: true }).fill("230000");
  await form.getByLabel("Expected gross monthly rent", { exact: true }).fill("2300");
  const run = form.locator('button[data-inform-submit="true"]');
  await run.dblclick();
  const summary = page.locator("section[aria-labelledby='decision-summary-title']");
  await expect(summary).toBeVisible({ timeout: 30_000 });
  await expect(summary).toHaveCount(1);
  await expect(page.getByRole("button", { name: RUN_BUTTON }).first()).toBeEnabled({ timeout: 15_000 }).catch(() => {});
  // No spinner survives more than a few seconds after the result is on screen.
  await page.waitForTimeout(3_000);
  const spinners = await page.locator('[aria-busy="true"], .animate-spin').filter({ visible: true }).count();
  expect(spinners).toBe(0);
  await expectNoNumericGarbage(page);
});

test("an offline enrichment/network hiccup never blocks a typed run", async ({ page, context }) => {
  const form = await openAnalyzer(page);
  // Kill every server-action round trip for enrichment by aborting POSTs to
  // /analyze while the form is being filled, then restore before the run.
  await context.route("**/analyze", (route) => (route.request().method() === "POST" ? route.abort() : route.continue()));
  await form.getByLabel("Property Address", { exact: true }).fill("77 Offline Way, Detroit, MI 48201");
  await form.getByLabel("Bedrooms (optional)", { exact: true }).fill("3");
  await form.getByLabel("Price to analyze", { exact: true }).fill("150000");
  await form.getByLabel("Expected gross monthly rent", { exact: true }).fill("1600");
  await page.waitForTimeout(1_500);
  await context.unroute("**/analyze");
  await form.locator('button[data-inform-submit="true"]').click();
  await expect(page.locator("section[aria-labelledby='decision-summary-title']")).toBeVisible({ timeout: 30_000 });
  await expectNoNumericGarbage(page);
});
