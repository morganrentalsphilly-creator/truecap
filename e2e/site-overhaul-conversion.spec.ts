import { expect, test } from "@playwright/test";

/**
 * Phase 2 (conversion mechanics) contract — docs/site-overhaul.md.
 *
 *  1. An empty hero submit focuses the field and shows the helper (no nav).
 *  2. An address routes to /analyze, prefills, and produces a result with no
 *     sign-in (the sample path proves the full result; the typed address
 *     proves the handoff + prefill).
 *  3. /guarantee is a permanent redirect to /pricing.
 *  4. At 375px the header is one row and the hero CTA sits in the first
 *     viewport, above the cookie bar.
 */

test("empty hero submit focuses the field, shows the helper, and stays put", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const form = page.locator('form[data-hero-address-form=""]');
  await expect(form).toHaveAttribute("data-hero-form-ready", "true");
  const submit = form.getByRole("button", { name: "Analyze a deal free", exact: true });
  await expect(submit).toBeEnabled();
  await expect(submit).toHaveCSS("opacity", "1");
  await submit.click();
  await expect(
    form.getByRole("alert").filter({ hasText: "Paste an address or a Zillow/Redfin link" }),
  ).toBeVisible();
  await expect(form.getByRole("link", { name: "try the sample deal →" })).toBeVisible();
  await expect(
    form.getByLabel("Property address or listing link", { exact: true }),
  ).toBeFocused();
  expect(new URL(page.url()).pathname).toBe("/");
});

test("a typed address routes to /analyze and prefills the analyzer with no sign-in", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const form = page.locator('form[data-hero-address-form=""]');
  // Before hydration the form is a plain GET (covered by the ?address= test
  // below); this test pins the JS path, so wait for the hydration marker.
  await expect(form).toHaveAttribute("data-hero-form-ready", "true");
  const address = form.getByLabel("Property address or listing link", { exact: true });
  await address.fill("1500 Market St, Philadelphia, PA 19102");
  await address.press("Enter");
  await page.waitForURL(/\/analyze(\?|$)/);
  await expect(
    page.locator('form[data-calc-form="true"][data-calculator-ready="true"]'),
  ).toBeAttached({ timeout: 20_000 });
  await expect(page.getByLabel("Property Address", { exact: true })).toHaveValue(
    /1500 Market St/,
    { timeout: 15_000 },
  );
  // The URL never carried the address (sessionStorage handoff).
  expect(new URL(page.url()).searchParams.get("address")).toBeNull();
});

test("the sample link produces a full decision on /analyze with no sign-in", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "See the sample deal →", exact: true }).click();
  await page.waitForURL(/\/analyze/);
  await expect(page.locator('[data-result-next-action=""]')).toBeVisible({
    timeout: 45_000,
  });
  expect(new URL(page.url()).pathname).toBe("/analyze");
});

test("the plain GET fallback prefills /analyze from ?address=", async ({ page }) => {
  await page.goto("/analyze?address=1500%20Market%20St%2C%20Philadelphia%2C%20PA%2019102", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.locator('form[data-calc-form="true"][data-calculator-ready="true"]'),
  ).toBeAttached({ timeout: 20_000 });
  await expect(page.getByLabel("Property Address", { exact: true })).toHaveValue(
    /1500 Market St/,
    { timeout: 15_000 },
  );
});

test("/guarantee is a permanent redirect to /pricing", async ({ request }) => {
  const response = await request.get("/guarantee", { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers()["location"]).toMatch(/\/pricing$/);
});

test("at 375px the header is one row and the hero CTA is in the first viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const header = page.locator("header").first();
  const headerBox = await header.boundingBox();
  expect(headerBox).not.toBeNull();
  expect(headerBox!.height).toBeLessThanOrEqual(64);
  // No second navigation row under the header.
  await expect(page.locator("[data-marketing-mobile-nav]")).toHaveCount(0);
  const headerAnalyze = header.getByRole("link", { name: "Analyze", exact: true });
  await expect(headerAnalyze).toBeVisible();
  await expect(headerAnalyze).toHaveAttribute("href", "/analyze");
  await expect(header.getByRole("button", { name: "Open menu" })).toBeVisible();

  const cta = page
    .locator('form[data-hero-address-form=""]')
    .getByRole("button", { name: "Analyze a deal free", exact: true });
  const ctaBox = await cta.boundingBox();
  expect(ctaBox).not.toBeNull();
  expect(ctaBox!.y + ctaBox!.height).toBeLessThanOrEqual(667);

  // The cookie bar must not cover the CTA.
  const cookieBar = page.locator('[data-cookie-consent-banner=""]');
  if (await cookieBar.isVisible()) {
    const barBox = await cookieBar.boundingBox();
    expect(barBox).not.toBeNull();
    expect(ctaBox!.y + ctaBox!.height).toBeLessThanOrEqual(barBox!.y);
  }

  // The hamburger opens the rest of the navigation.
  await header.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("link", { name: "Pricing", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Log in", exact: true })).toBeVisible();
});
