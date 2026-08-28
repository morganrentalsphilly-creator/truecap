import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import {
  acceptCookiesIfShown,
  dismissNotifications,
  openSampleDecision,
} from "./support/product-flows";

const evidenceDirectory = "artifacts/current-visual-evidence";
const captureVisuals = process.env.PLAYWRIGHT_CAPTURE_VISUALS === "true";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  test.skip(
    !captureVisuals,
    "Set PLAYWRIGHT_CAPTURE_VISUALS=true to regenerate evidence.",
  );
  await mkdir(evidenceDirectory, { recursive: true });
});

test("capture public product evidence without entering checkout", async ({
  page,
}) => {
  test.setTimeout(240_000);

  // Match the public baseline at desktop and 390px mobile. Saved-deal and
  // comparison evidence is intentionally owned by visual-authenticated: this
  // public capture never fakes an account or bypasses RLS.
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await acceptCookiesIfShown(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.screenshot({
      path: `${evidenceDirectory}/homepage-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });

    const sampleCard = page.locator('[data-hero-sample-card=""]');
    await expect(sampleCard).toBeVisible();
    await sampleCard.screenshot({
      path: `${evidenceDirectory}/homepage-sample-${width}.png`,
      animations: "disabled",
    });

    const calculator = page.locator('form[data-calc-form="true"]');
    await expect(calculator).toBeVisible();
    await calculator.screenshot({
      path: `${evidenceDirectory}/initial-analysis-${width}.png`,
      animations: "disabled",
    });

    await openSampleDecision(page);
    await dismissNotifications(page);
    const decision = page.locator(
      "section[aria-labelledby='decision-summary-title']",
    );
    await expect(decision).toBeVisible();
    await decision.screenshot({
      path: `${evidenceDirectory}/results-${width}.png`,
      animations: "disabled",
    });

    if (width === 1280) {
      await decision.getByText("More actions", { exact: true }).click();
      await decision
        .getByRole("button", { name: "Export PDF", exact: true })
        .click();
      const blockedCheckout = page.getByRole("dialog", {
        name: "PDF reports are included with Pro",
      });
      await expect(blockedCheckout).toBeVisible();
      await blockedCheckout.screenshot({
        path: `${evidenceDirectory}/blocked-checkout-1280.png`,
        animations: "disabled",
      });
    }

    await page.goto("/pricing", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.screenshot({
      path: `${evidenceDirectory}/pricing-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });

    await page.goto("/auth/sign-up?plan=pro&billing=monthly", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.screenshot({
      path: `${evidenceDirectory}/signup-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
  }
});
