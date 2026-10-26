import { expect, test } from "@playwright/test";

test("a cold mobile homepage waits for intent before fetching secondary routes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const prefetchedRoutes: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.searchParams.has("_rsc")) prefetchedRoutes.push(url.pathname);
  });
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByRole("dialog", { name: "Cookie consent" })).toBeVisible();
  expect(prefetchedRoutes).not.toContain("/");
  expect(prefetchedRoutes).not.toContain("/privacy");
  expect(prefetchedRoutes).not.toContain("/for-investors");
  await expect(page.getByRole("link", { name: "For investors", exact: true }).first()).toHaveAttribute("href", "/for-investors");
});

for (const reducedMotion of ["reduce", "no-preference"] as const) {
  test(`figures remain text until the offer price changes (${reducedMotion})`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion });
    // Keep the optional hero demonstration out of the interaction under test.
    await page.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        document.documentElement.setAttribute("data-scrubber-touched", "");
      });
    });
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator("[data-hero-address-form][data-hero-form-ready=true]")).toBeAttached();
    const scrubber = page.locator("[data-price-scrubber]");
    const slider = scrubber.getByRole("slider", { name: "Offer price" });
    await expect(slider).toBeAttached();
    await expect(scrubber.locator("number-flow-react")).toHaveCount(0);
    const priceCell = scrubber.locator("thead th").last();
    const heightBefore = await priceCell.evaluate((element) => element.getBoundingClientRect().height);
    await page.evaluate(() => {
      document.documentElement.dataset.numberAnimations = "0";
      document.addEventListener("animationsstart", (event) => {
        if (!(event.target instanceof Element) || !event.target.closest("[data-price-scrubber]")) return;
        const root = document.documentElement;
        root.dataset.numberAnimations = String(Number(root.dataset.numberAnimations) + 1);
      }, true);
    });
    const initial = await slider.getAttribute("aria-valuenow");
    await slider.focus();
    await slider.press("Home");
    await expect(slider).not.toHaveAttribute("aria-valuenow", initial!);
    const amount = Number(await slider.getAttribute("aria-valuenow"));
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD", maximumFractionDigits: 0,
    }).format(amount);
    await expect.poll(() => scrubber.locator("number-flow-react").count()).toBeGreaterThan(0);
    await expect(scrubber.locator("span.sr-only").filter({ hasText: formatted }).first()).toHaveText(formatted);
    if (reducedMotion === "no-preference") {
      await expect.poll(() => page.locator("html").getAttribute("data-number-animations")).not.toBe("0");
    } else {
      await expect(page.locator("html")).toHaveAttribute("data-number-animations", "0");
    }
    await expect.poll(() => priceCell.evaluate((element) => element.getBoundingClientRect().height)).toBe(heightBefore);
  });
}
