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
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await acceptCookiesIfShown(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({
    path: `${evidenceDirectory}/homepage-1280.png`,
    fullPage: true,
    animations: "disabled",
  });

  const calculator = page.locator('form[data-calc-form="true"]');
  await expect(calculator).toBeVisible();
  await calculator.screenshot({
    path: `${evidenceDirectory}/calculator-1280.png`,
    animations: "disabled",
  });

  await openSampleDecision(page);
  await dismissNotifications(page);
  const decision = page.locator(
    "section[aria-labelledby='decision-summary-title']",
  );
  await expect(decision).toBeVisible();
  await decision.screenshot({
    path: `${evidenceDirectory}/sample-result-1280.png`,
    animations: "disabled",
  });

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

  await page.goto("/pricing", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({
    path: `${evidenceDirectory}/pricing-1280.png`,
    fullPage: true,
    animations: "disabled",
  });
});
