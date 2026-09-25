/**
 * 2026-09 audit — a FREE account whose no-card trial has ended (Phase 2.3):
 * Pro rows are gated with the Pro badge, PDF export opens the Pro dialog,
 * Pro-only routes redirect, and saving (a free feature) still works.
 * Runs in the authenticated-free project (seeded by seed-local-user.mjs).
 */
import { expect, test } from "@playwright/test";
import { resolveAuthenticatedE2EEnvironment } from "./support/auth-environment";
import { acceptCookiesIfShown, deleteRegressionDealsByAddress } from "./support/product-flows";

const authEnvironment = resolveAuthenticatedE2EEnvironment(process.env);
const authSkipReason = authEnvironment.enabled
  ? "Authenticated browser environment is available."
  : authEnvironment.reason;

test.beforeEach(() => {
  test.skip(!authEnvironment.enabled, authSkipReason);
});

test("expired trial: pricing says so and Pro-only routes bounce", async ({ page }) => {
  await page.goto("/pricing", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Your no-card free trial has ended.")).toBeVisible({ timeout: 20_000 });
  for (const route of ["/dashboard/triage", "/dashboard/templates", "/dashboard/clients"]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page, route).not.toHaveURL(new RegExp(`${route.replace(/\//g, "\\/")}(?:[?#]|$)`), { timeout: 30_000 });
    await expect(page.locator("body")).not.toContainText(/Application error|Internal Server Error/);
  }
  await page.goto("/settings/branding", { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).not.toContainText(/Application error|Internal Server Error/);
});

test("a free run shows Pro badges on gated rows, gates the PDF, and still saves", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const address = `E2E Free ${Date.now().toString(36)}-${testInfo.workerIndex} Ave, Philadelphia, PA 19140`;
  try {
    await page.goto("/dashboard/new", { waitUntil: "domcontentloaded" });
    await acceptCookiesIfShown(page);
    const form = page.locator('form[data-calc-form="true"]');
    await expect(form).toHaveAttribute("data-calculator-ready", "true", { timeout: 30_000 });
    await form.getByLabel("Property Address", { exact: true }).fill(address);
    await form.getByLabel("Price to analyze", { exact: true }).fill("240000");
    await form.getByLabel("Expected gross monthly rent", { exact: true }).fill("2400");
    await form.locator('button[data-inform-submit="true"]').click();
    const summary = page.locator("section[aria-labelledby='decision-summary-title']");
    await expect(summary).toBeVisible({ timeout: 30_000 });

    const goDeeper = page.locator("details").filter({ hasText: "Go deeper" }).first();
    if (!(await goDeeper.evaluate((el) => el.hasAttribute("open")))) {
      await goDeeper.locator("summary").first().click();
    }
    for (const row of ["projections", "stress-test"]) {
      const drill = page.locator(`[data-drill-row='${row}']`);
      await expect(drill, row).toBeVisible();
      await expect(drill.getByText("PRO", { exact: true }), `${row} carries the Pro badge`).toBeVisible();
    }

    await summary.locator("summary").filter({ hasText: "More actions" }).click();
    await summary.getByRole("button", { name: "Export PDF", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "PDF reports are included with Pro" })).toBeVisible();
    await page.keyboard.press("Escape");

    const save = summary.getByRole("button", { name: "Save", exact: true });
    await expect(save).toBeEnabled({ timeout: 20_000 });
    await save.click();
    await expect(page).toHaveURL(/[?&]savedDeal=[0-9a-f-]{36}(?:&|$)/i, { timeout: 30_000 });
    await expect(summary.getByRole("button", { name: "Saved", exact: true })).toBeVisible({ timeout: 30_000 });
  } finally {
    await deleteRegressionDealsByAddress(page, address).catch(() => 0);
  }
});
