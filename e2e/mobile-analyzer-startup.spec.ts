import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { SAMPLE_DEAL_VALUES } from "../lib/sample-deal";
import { calculateAnalysis } from "../lib/calc-analysis";

const draft = {
  ...SAMPLE_DEAL_VALUES,
  address: "42 Startup Test St, Columbus, OH 43215",
  recurringOtherIncomeMonthly: 175,
  recurringOtherExpenseMonthly: 50,
  initialReserve: 1200,
};

async function openDraft(page: Page, values: Record<string, unknown>) {
  await page.addInitScript((saved) => {
    // Seed once so a reload tests what the app actually persisted.
    if (!localStorage.getItem("startup-test-seeded")) {
      localStorage.setItem("truecap_calc_form_draft_v1", JSON.stringify(saved));
      localStorage.setItem("truecap_calc_advanced_open_v1", "0");
      localStorage.setItem("startup-test-seeded", "1");
    }
  }, values);
  await page.goto("/analyze");
  const form = page.locator('form[data-calc-form="true"]');
  await expect(form).toHaveAttribute("data-calculator-ready", "true");
  await page.getByRole("button", { name: /^reject$/i }).click().catch(() => {});
  await expect(form.getByLabel("Property Address", { exact: true })).toHaveValue(values.address as string);
  return form;
}

test.use({ viewport: { width: 390, height: 844 } });

test("local verification never loads production Google tags after consent", async ({ page }) => {
  const googleRequests: string[] = [];
  await page.route(/https:\/\/(?:[^/]*\.)?(?:googletagmanager\.com|google-analytics\.com|googleadservices\.com)\//, route => {
    googleRequests.push(route.request().url());
    return route.abort();
  });
  await page.goto("/analyze");
  await page.getByRole("button", { name: /^accept$/i }).click();
  await page.waitForTimeout(1500);
  await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(0);
  expect(googleRequests).toEqual([]);
});

test("a closed detailed editor preserves restored values in the actual calculation", async ({ page }) => {
  const form = await openDraft(page, draft);
  await expect(page.locator("#buy-and-hold-assumptions")).toHaveCount(0);
  await form.locator('button[data-inform-submit="true"]').click();
  const summary = page.locator("section[aria-labelledby='decision-summary-title']");
  await expect(summary).toBeVisible({ timeout: 30_000 });
  const expected = calculateAnalysis(draft);
  const monthly = new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(expected.netCashFlow);
  await expect(summary).toContainText(monthly);
  await expect(page.locator("#buy-and-hold-assumptions")).toHaveCount(0);
});

test("details mount on demand and retain edits across closing and reload", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await openDraft(page, draft);
  await expect(page.locator("#buy-and-hold-assumptions")).toHaveCount(0);
  await page.getByRole("button", { name: /% down.*% interest/i }).click();
  const income = page.getByLabel("Other recurring income / month", { exact: true });
  await expect(income).toHaveValue("175");
  await income.fill("275");
  await page.getByRole("button", { name: /Hide details/i }).click();
  await expect(income).toBeHidden();
  await expect.poll(async () => page.evaluate(() => {
    const raw = localStorage.getItem("truecap_calc_form_draft_v1");
    return raw ? JSON.parse(raw).recurringOtherIncomeMonthly : null;
  })).toBe(275);
  await page.reload();
  await expect(page.locator('form[data-calculator-ready="true"]')).toBeAttached();
  await expect(page.locator("#buy-and-hold-assumptions")).toHaveCount(0);
  await page.getByRole("button", { name: /% down.*% interest/i }).click();
  await expect(income).toHaveValue("275");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  expect(overflow).toBe(false);
  const accessibility = await new AxeBuilder({ page }).include("#buy-and-hold-assumptions")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(accessibility.violations.filter(v => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  expect(errors).toEqual([]);
});

test("validation opens an unmounted detailed field and focuses it", async ({ page }) => {
  const form = await openDraft(page, {
    ...draft,
    operatingScenario: "stabilized",
    stabilizedMonthlyRent: undefined,
  });
  await expect(page.locator("#buy-and-hold-assumptions")).toHaveCount(0);
  await form.locator('button[data-inform-submit="true"]').click();
  const missingRent = page.getByLabel("Stabilized monthly rent", { exact: true });
  await expect(missingRent).toBeVisible();
  await expect(missingRent).toBeFocused();
  await missingRent.fill("3200");
  await form.locator('button[data-inform-submit="true"]').click();
  await expect(page.locator("section[aria-labelledby='decision-summary-title']")).toBeVisible({ timeout: 30_000 });
});

for (const field of ["interestRate", "propertyTaxPct"] as const) {
  test(`validation reveals the deferred ${field} control`, async ({ page }) => {
    const form = await openDraft(page, { ...draft, [field]: -1 });
    await expect(form.locator(`[name="${field}"]`)).toHaveCount(0);
    await form.locator('button[data-inform-submit="true"]').click();
    const input = form.locator(`[name="${field}"]`);
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();
  });
}

test("starting another deal does not steal focus from an active price edit", async ({ page }) => {
  // Widen the deferred-focus window to reproduce a busy mobile main thread.
  await page.addInitScript(() => {
    const schedule = window.setTimeout.bind(window);
    window.setTimeout = ((handler: TimerHandler, delay?: number, ...args: unknown[]) =>
      schedule(handler, delay === 100 ? 800 : delay, ...args)) as typeof window.setTimeout;
  });
  const form = await openDraft(page, draft);
  await form.locator('button[data-inform-submit="true"]').click();
  const summary = page.locator("section[aria-labelledby='decision-summary-title']");
  await expect(summary).toBeVisible({ timeout: 30_000 });
  await summary.getByRole("button", { name: "Next deal · keep assumptions", exact: true }).click();
  await page.getByRole("dialog", { name: "Analyze another property?" })
    .getByRole("button", { name: "Analyze another", exact: true }).click();
  const price = form.getByLabel("Price to analyze", { exact: true });
  await price.fill("260000");
  await page.waitForTimeout(1000);
  await expect(price).toBeFocused();
  await expect(price).toHaveValue(/260,?000/);
  await expect(form.getByLabel("Property Address", { exact: true })).toHaveValue("");
});
