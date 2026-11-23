/**
 * 2026-09 audit — address autofill (HUD rent + FRED rate), manual property
 * tax, and "every assumption is editable" (Phase 2.1).
 *
 * Runs against a server started with HUD_API_BASE_URL and FRED_API_BASE_URL
 * pointing at the loopback mock (e2e/support/enrichment-mock-server.ts) and
 * HUD_API_KEY=audit-hud-key. Skipped otherwise, with the reason printed.
 * Serial: the action caches a successful FRED observation for 24 h per
 * server process, so the failure modes run before the first success.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  MOCK_FRED_RATE,
  MOCK_MI_3BR,
  MOCK_OH_STATE_AVERAGE_3BR,
  startEnrichmentMockServer,
  type EnrichmentMockServer,
} from "./support/enrichment-mock-server";

test.describe.configure({ mode: "serial" });

const MOCK_ENABLED = process.env.AUDIT_ENRICHMENT_MOCK === "1";
let mock: EnrichmentMockServer;

test.beforeAll(async () => {
  test.skip(!MOCK_ENABLED, "Set AUDIT_ENRICHMENT_MOCK=1 and start the app with HUD_API_BASE_URL/FRED_API_BASE_URL=http://127.0.0.1:3199.");
  mock = await startEnrichmentMockServer(3199);
});
test.afterAll(async () => {
  await mock?.close();
});

/**
 * The result's figures roll in through NumberFlow (the 2026-10 overhaul): the
 * digits live in the host's shadow root, outside innerText, and each digit
 * column holds every numeral with the others marked inert. Reads the current
 * symbol, digits and suffix, the way assistive technology does.
 */
function readNumberFlow(host: Locator): Promise<string> {
  return host.evaluate((h) => {
    const root = h.shadowRoot;
    if (!root) return h.textContent ?? "";
    let out = "";
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        out += node.textContent ?? "";
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as HTMLElement;
      if (el.tagName === "STYLE" || el.hasAttribute("inert")) return;
      el.childNodes.forEach(walk);
    };
    root.childNodes.forEach(walk);
    return out;
  });
}

/**
 * A fresh result reveals its figures from zero (ResultReveal marks the card
 * `data-result-reveal="play"` for the 1.4 s it plays); a figure read during
 * the reveal is the roll-in's zero, not the value.
 */
async function settledAfterReveal(page: Page) {
  await page.waitForTimeout(300);
  await expect(page.locator('[data-result-reveal="play"]')).toHaveCount(0, { timeout: 10_000 });
}

async function openAnalyzer(page: Page) {
  await page.goto("/analyze", { waitUntil: "domcontentloaded" });
  const form = page.locator('form[data-calc-form="true"]');
  await expect(form).toHaveAttribute("data-calculator-ready", "true", { timeout: 30_000 });
  await page.getByRole("button", { name: /^accept( all)?$/i }).click({ timeout: 1_500 }).catch(() => {});
  return form;
}

/** Type an address and commit it (blur) so the typed-address enrichment fires. */
async function commitAddress(page: Page, address: string, bedrooms = "3") {
  const form = page.locator('form[data-calc-form="true"]');
  await form.getByLabel("Bedrooms (optional)", { exact: true }).fill(bedrooms);
  const input = form.getByLabel("Property Address", { exact: true });
  await input.fill(address);
  await input.press("Tab");
  return form;
}

/** Currency inputs render thousands separators ("1,750"); compare numerically. */
async function expectNumericValue(locator: ReturnType<Page["getByLabel"]>, expected: number, timeout = 15_000) {
  await expect
    .poll(async () => Number(((await locator.inputValue()) || "").replace(/[^0-9.-]/g, "")), { timeout })
    .toBe(expected);
}

/**
 * Open the full assumptions region. Since the 2026-11 audit (B1, B8) a chip
 * opens a small editor for its own fields only; the full region opens from
 * its own toggle, "Show all assumptions".
 */
async function showAllAssumptions(page: Page) {
  const toggle = page.getByRole("button", { name: "Show all assumptions", exact: true });
  if (await toggle.isVisible().catch(() => false)) await toggle.click();
}

/**
 * Reveal the full expenses editor: the assumptions region, then the card's
 * own "More expense options" toggle. Either state must expose the tax editor.
 */
async function openAdvancedExpenses(page: Page, form: ReturnType<Page["locator"]>) {
  const taxMode = page.getByRole("group", { name: "Property tax input mode" });
  await page.waitForTimeout(500);
  if (await taxMode.isVisible().catch(() => false)) return;
  await showAllAssumptions(page);
  const toggle = form.getByRole("button", { name: "More expense options", exact: true });
  await expect(toggle).toBeVisible({ timeout: 15_000 });
  await toggle.click();
}

async function openFinancing(page: Page) {
  await showAllAssumptions(page);
  await expect(page.locator("#downPaymentPct")).toBeVisible({ timeout: 15_000 });
}

test("FRED timeout: the rate keeps its default, HUD rent still fills, nothing sticks", async ({ page }) => {
  mock.setFredMode("timeout");
  const form = await openAnalyzer(page);
  await commitAddress(page, "100 Autofill Test Ave, Columbus, OH 43215");
  const rent = form.getByLabel("Expected gross monthly rent", { exact: true });
  await expectNumericValue(rent, MOCK_OH_STATE_AVERAGE_3BR);
  await openFinancing(page);
  // The action caches a successful FRED observation for 24 h per server
  // process. On a fresh server (CI) the timeout leaves the 6.75 default; on a
  // long-lived local server that already succeeded, the cached benchmark
  // shows instead and the timeout path is not observable in this test.
  const fredReachedMock = mock.requests().some((r) => r.path.includes("/fred/series/observations"));
  if (fredReachedMock) {
    await expectNumericValue(form.getByLabel("Interest Rate %", { exact: true }), 6.75, 5_000);
  } else {
    test.info().annotations.push({ type: "note", description: "FRED cached by a previous run on this server; rate default not asserted." });
  }
  await expect(page.getByText(/HUD/).filter({ visible: true }).first()).toBeVisible();
  await expect(page.locator(".animate-spin").filter({ visible: true })).toHaveCount(0, { timeout: 10_000 });
  await expect(form.locator('button[data-inform-submit="true"]')).toBeEnabled();
});

test("FRED 500: same graceful degradation (MI county figure for rent)", async ({ page }) => {
  mock.setFredMode("500");
  const form = await openAnalyzer(page);
  await commitAddress(page, "200 Autofill Test St, Detroit, MI 48201");
  await expectNumericValue(form.getByLabel("Expected gross monthly rent", { exact: true }), MOCK_MI_3BR);
  await openFinancing(page);
  // The starting rate is read when the page renders (2026-11 audit A2) and
  // cached, so the fallback is observable only when this render's read
  // actually reached the failing mock.
  const fredReachedMock = mock.requests().some((r) => r.path.includes("/fred/series/observations"));
  if (fredReachedMock) {
    await expectNumericValue(form.getByLabel("Interest Rate %", { exact: true }), 6.75, 5_000);
    await expect(page.getByText("fallback rate").filter({ visible: true }).first()).toBeVisible();
  } else {
    test.info().annotations.push({ type: "note", description: "FRED cached by a previous render on this server; fallback not asserted." });
  }
});

test("FRED + HUD healthy: rate and rent autofill with labelled sources, and both stay editable", async ({ page }) => {
  mock.setFredMode("ok");
  const form = await openAnalyzer(page);
  await commitAddress(page, "300 Autofill Test Blvd, Columbus, OH 43215");
  const rent = form.getByLabel("Expected gross monthly rent", { exact: true });
  await expectNumericValue(rent, MOCK_OH_STATE_AVERAGE_3BR);
  await openFinancing(page);
  const rate = form.getByLabel("Interest Rate %", { exact: true });
  await expectNumericValue(rate, Number(MOCK_FRED_RATE));
  await expect(page.getByText(/FRED/).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText(/HUD/).filter({ visible: true }).first()).toBeVisible();
  // The benchmark is a starting value, never a lock.
  await rent.fill("2400");
  await expectNumericValue(rent, 2400, 5_000);
  await rate.fill("7.1");
  await expectNumericValue(rate, 7.1, 5_000);
  // The app caches HUD state data and FRED observations (in memory for 24 h
  // per server process, and in the Data Cache for page renders), so no
  // provider call is guaranteed to reach the mock here; the values above
  // already proved both paths.
});

// 2026-11 audit A2/A3 (replaces the trust-pass A5 test): the form opens on the
// benchmark rate, so choosing an address changes no rate, shows no rate note,
// and never touches a rate or a rent the visitor typed.
test("choosing an address leaves a typed rate and a typed rent alone, and offers the rent benchmark", async ({ page }) => {
  mock.setFredMode("ok");
  const form = await openAnalyzer(page);
  await form.getByLabel("Price to analyze", { exact: true }).fill("200000");
  await form.getByLabel("Expected gross monthly rent", { exact: true }).fill("1850");
  await expect(page.locator("[data-live-verdict]").filter({ visible: true })).toBeVisible({ timeout: 10_000 });
  await openFinancing(page);
  const rate = form.getByLabel("Interest Rate %", { exact: true });
  await rate.fill("6.1");
  await commitAddress(page, "350 Autofill Test Way, Columbus, OH 43215");
  // The benchmark is offered under the rent field, never written over a typed rent.
  const benchmark = page.locator("[data-rent-benchmark]").filter({ visible: true });
  await expect(benchmark).toContainText("HUD", { timeout: 15_000 });
  await expectNumericValue(form.getByLabel("Expected gross monthly rent", { exact: true }), 1850, 5_000);
  await expectNumericValue(rate, 6.1, 5_000);
  await expect(page.locator("[data-lookup-change]")).toHaveCount(0);
  await expect(page.getByText("Auto-filled from address")).toHaveCount(0);
  // "Use" adopts it, the receipt is the one notice, and Undo restores the typed rent.
  await benchmark.getByRole("button", { name: /^Use/ }).click();
  await expectNumericValue(form.getByLabel("Expected gross monthly rent", { exact: true }), MOCK_OH_STATE_AVERAGE_3BR, 5_000);
  const receipt = page.locator("[data-enrichment-receipt]").filter({ visible: true });
  await expect(receipt).toContainText("Filled rent");
  await receipt.getByRole("button", { name: /^Undo/ }).click();
  await expectNumericValue(form.getByLabel("Expected gross monthly rent", { exact: true }), 1850, 5_000);
});

test.describe("HUD failure modes leave rent empty and the form usable", () => {
  for (const [label, address] of [
    ["HUD 500", "400 Autofill Test Ln, Austin, TX 78701"],
    ["HUD timeout", "500 Autofill Test Rd, Atlanta, GA 30301"],
    ["HUD malformed JSON", "600 Autofill Test Dr, Las Vegas, NV 89101"],
    ["HUD empty dataset", "700 Autofill Test Ct, Seattle, WA 98101"],
  ] as const) {
    test(label, async ({ page }) => {
      mock.setFredMode("ok");
      const form = await openAnalyzer(page);
      await commitAddress(page, address);
      const rent = form.getByLabel("Expected gross monthly rent", { exact: true });
      // Give the 5 s provider timeout room, then assert the field never filled.
      await page.waitForTimeout(label === "HUD timeout" ? 6_500 : 2_500);
      await expect(rent).toHaveValue("");
      await expect(page.locator(".animate-spin").filter({ visible: true })).toHaveCount(0);
      const text = await page.locator("main").innerText();
      expect(text).not.toMatch(/NaN|undefined|Infinity/);
      await rent.fill("1900");
      await form.getByLabel("Price to analyze", { exact: true }).fill("210000");
      await form.locator('button[data-inform-submit="true"]').click();
      await expect(page.locator("section[aria-labelledby='decision-summary-title']")).toBeVisible({ timeout: 30_000 });
    });
  }
});

test("manual property tax (annual $) replaces the 1.1% default and moves cash flow by exactly the difference", async ({ page }) => {
  mock.setFredMode("ok");
  const form = await openAnalyzer(page);
  await form.getByLabel("Property Address", { exact: true }).fill("800 Tax Test Ave, Columbus, OH 43215");
  await form.getByLabel("Price to analyze", { exact: true }).fill("240000");
  await form.getByLabel("Expected gross monthly rent", { exact: true }).fill("2400");
  await openFinancing(page);
  await form.getByLabel("Interest Rate %", { exact: true }).fill("6.5");
  await form.getByLabel("Down Payment %", { exact: true }).fill("20");

  const run = form.locator('button[data-inform-submit="true"]');
  await run.click();
  const summary = page.locator("section[aria-labelledby='decision-summary-title']");
  await expect(summary).toBeVisible({ timeout: 30_000 });
  const readCashFlow = async () => {
    const text = await readNumberFlow(summary.locator('[data-decision-metric="cash-flow"] number-flow-react').first());
    const m = text.match(/-?\$-?[\d,]+/);
    expect(m, `cash flow figure in: ${text.slice(0, 300)}`).not.toBeNull();
    return Number(m![0].replace(/[^0-9-]/g, ""));
  };
  await settledAfterReveal(page);
  const before = await readCashFlow();

  await summary.getByRole("button", { name: "Edit assumptions", exact: true }).click();
  // The tax/insurance modes live in the expenses section's advanced panel.
  // Edit mode opens that panel itself (and hides the toggle); on the fresh
  // form the toggle has to be clicked first.
  const taxMode = page.getByRole("group", { name: "Property tax input mode" });
  await openAdvancedExpenses(page, form);
  await expect(taxMode).toBeVisible({ timeout: 10_000 });
  await taxMode.getByRole("button", { name: "Annual $" }).click();
  const taxField = form.getByLabel("Property Tax (Annual $)", { exact: true });
  await expect(taxField).toBeEditable();
  await taxField.fill("4200"); // $350/mo vs the 1.1% default ($220/mo on $240k)
  await page.getByRole("button", { name: "Done editing", exact: true }).click();
  await expect(summary).toBeVisible();
  await expect.poll(readCashFlow, { timeout: 15_000 }).toBe(before - 130);
});

test("every assumption group is editable after a run", async ({ page }) => {
  mock.setFredMode("ok");
  const form = await openAnalyzer(page);
  await form.getByLabel("Property Address", { exact: true }).fill("900 Edit Test Ave, Columbus, OH 43215");
  await form.getByLabel("Price to analyze", { exact: true }).fill("250000");
  await form.getByLabel("Expected gross monthly rent", { exact: true }).fill("2500");
  await form.locator('button[data-inform-submit="true"]').click();
  const summary = page.locator("section[aria-labelledby='decision-summary-title']");
  await expect(summary).toBeVisible({ timeout: 30_000 });
  await summary.getByRole("button", { name: "Edit assumptions", exact: true }).click();
  await openFinancing(page);
  await openAdvancedExpenses(page, form);
  await expect(page.getByRole("group", { name: "Property tax input mode" })).toBeVisible({ timeout: 10_000 });

  const labels = [
    "Price to analyze",
    "Expected gross monthly rent",
    "Down Payment %",
    "Interest Rate %",
    "Vacancy %",
    "Maintenance %",
    "Management %",
    "CapEx %",
    "HOA (Monthly $)",
    "Utilities",
    "Rent Growth %",
    "Expense Growth %",
  ];
  const missing: string[] = [];
  for (const label of labels) {
    const field = form.getByLabel(label, { exact: true }).first();
    if (!(await field.isVisible().catch(() => false))) {
      missing.push(label);
      continue;
    }
    await expect(field, label).toBeEditable();
  }
  expect(missing, "assumption fields that were not found by label").toEqual([]);
  // Tax and insurance have a mode toggle each.
  for (const group of ["Property tax input mode", "Insurance input mode"]) {
    await expect(page.getByRole("group", { name: group })).toBeVisible();
  }
});
