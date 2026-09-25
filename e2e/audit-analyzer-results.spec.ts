/**
 * 2026-09 audit — the no-account decision renders every promised output,
 * numbers are formatted consistently, and the one-free-analysis limit shows
 * the upgrade prompt (Phase 2.1).
 */
import { expect, test, type Page } from "@playwright/test";

async function runDeal(page: Page, address: string, price: string, rent: string) {
  const form = page.locator('form[data-calc-form="true"]');
  await expect(form).toHaveAttribute("data-calculator-ready", "true", { timeout: 30_000 });
  await form.getByLabel("Property Address", { exact: true }).fill(address);
  await form.getByLabel("Price to analyze", { exact: true }).fill(price);
  await form.getByLabel("Expected gross monthly rent", { exact: true }).fill(rent);
  // A second deal typed over a kept form can trigger the product's own
  // "Use this new property?" confirmation once the address handler settles
  // (it runs after the address lookup, so it races the price/rent fills on a
  // slow server). A real user confirms it; so does the harness.
  const useNewProperty = page.getByRole("dialog", { name: "Use this new property?" });
  const confirmNewProperty = async () => {
    if (await useNewProperty.isVisible().catch(() => false)) {
      await useNewProperty.getByRole("button", { name: "Use new property", exact: true }).click();
      await expect(useNewProperty).toBeHidden();
      // Confirming clears the previous property's price and rent — re-enter.
      await form.getByLabel("Price to analyze", { exact: true }).fill(price);
      await form.getByLabel("Expected gross monthly rent", { exact: true }).fill(rent);
    }
  };
  await confirmNewProperty();
  await form.locator('button[data-inform-submit="true"]').click({ trial: true }).catch(() => undefined);
  await confirmNewProperty();
  await form.locator('button[data-inform-submit="true"]').click();
  const summary = page.locator("section[aria-labelledby='decision-summary-title']");
  await expect(summary).toBeVisible({ timeout: 30_000 });
  return summary;
}

test("a first decision shows the verdict, Deal score, the four metrics and the Offer Ceiling", async ({ page }) => {
  await page.goto("/analyze", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /^accept( all)?$/i }).click({ timeout: 1_500 }).catch(() => {});
  const summary = await runDeal(page, "10 Result Test Ave, Columbus, OH 43215", "250000", "2500");

  await expect(summary.getByText("Offer Ceiling", { exact: true })).toBeVisible();
  await expect(summary.getByText("Model DSCR", { exact: true })).toBeVisible();
  await expect(summary.getByText(/cash flow after reserve/i)).toBeVisible();
  await expect(page.getByText(/Deal score/i).filter({ visible: true }).first()).toBeVisible();
  // Cap rate and cash-on-cash sit one disclosure deep on the decision-first
  // screen ("Decision context and key numbers"); open it and assert both.
  const context = page.locator("summary").filter({ hasText: "Decision context and key numbers" });
  await expect(context).toBeVisible();
  await context.click();
  await expect(page.getByText(/cap rate/i).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText(/cash-on-cash/i).filter({ visible: true }).first()).toBeVisible();

  const text = await page.locator("main").innerText();
  expect(text).not.toMatch(/\bNaN\b|\bInfinity\b|\bundefined\b|\[object Object\]/);
  // Currency is always "$1,234" style and percentages carry a % with ≤ 2 decimals.
  const currencies = text.match(/\$-?\d[\d,]*(\.\d+)?/g) ?? [];
  expect(currencies.length).toBeGreaterThan(3);
  for (const c of currencies) {
    expect(c, "thousands separators").toMatch(/^\$-?\d{1,3}(,\d{3})*(\.\d{1,2})?$/);
  }
  for (const p of text.match(/-?\d+(\.\d+)?%/g) ?? []) {
    expect(p).toMatch(/^-?\d+(\.\d{1,2})?%$/);
  }
});

test("the anonymous exact decision is one-shot: the second deal is gated and points to sign-up", async ({ page }) => {
  await page.goto("/analyze", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /^accept( all)?$/i }).click({ timeout: 1_500 }).catch(() => {});
  const first = await runDeal(page, "20 Limit Test Ave, Columbus, OH 43215", "230000", "2300");
  await first.locator("summary").filter({ hasText: "How this ceiling was calculated" }).click();
  // The exact solve is a server round trip; allow it to land.
  await expect(first.getByText(/Exact ceiling/)).toBeVisible({ timeout: 20_000 });

  await first.getByRole("button", { name: "Next deal · keep assumptions", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Analyze another property?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Analyze another", exact: true }).click();
  const second = await runDeal(page, "30 Limit Test St, Columbus, OH 43215", "260000", "2400");
  await expect(page.getByText("No-signup decision used", { exact: true })).toBeVisible();
  await second.locator("summary").filter({ hasText: "How this ceiling was calculated" }).click();
  await expect(second.getByText(/Coarse range preview/)).toBeVisible({ timeout: 20_000 });
  const upgrade = page.getByRole("link", { name: /create a free account|sign up|start.*free/i }).first();
  await expect(upgrade).toBeVisible();
  await expect(upgrade).toHaveAttribute("href", /\/auth\/sign-up|\/pricing/);
});
