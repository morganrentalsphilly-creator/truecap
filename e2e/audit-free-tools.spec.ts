/**
 * 2026-09 audit — free tools: the 1% Rule calculator and the spreadsheet
 * download (Phase 2.5).
 */
import { expect, test } from "@playwright/test";

test("1% rule calculator passes, fails, and never prints NaN", async ({ page }) => {
  await page.goto("/tools/1-percent-rule-calculator", { waitUntil: "domcontentloaded" });
  const price = page.locator("#onepct-price");
  const rent = page.locator("#onepct-rent");
  // Both inputs must carry a real label (a11y) — the id is only the handle.
  await expect(page.locator('label[for="onepct-price"]')).toBeVisible();
  await expect(page.locator('label[for="onepct-rent"]')).toBeVisible();
  await expect(price).toBeVisible();
  await expect(rent).toBeVisible();

  await price.fill("200000");
  await rent.fill("2100");
  await expect(page.getByText("Passes 1% rule", { exact: false })).toBeVisible();
  await expect(page.getByText(/1\.05%/)).toBeVisible();

  await rent.fill("1500");
  await expect(page.getByText("Fails 1% rule", { exact: false })).toBeVisible();
  await expect(page.getByText(/0\.75%/)).toBeVisible();

  // Bad data on a type=number field (the browser itself refuses letters):
  // empty, zero, negative and absurdly large.
  for (const value of ["", "0", "-5", "1000000000000"]) {
    await price.fill(value);
    const text = await page.locator("main").innerText();
    expect(text, `price=${JSON.stringify(value)}`).not.toMatch(/NaN|Infinity|undefined/);
  }
  await price.fill("");
  await expect(page.getByText(/Passes 1% rule|Fails 1% rule/)).toHaveCount(0);
  // Pasting a currency string into a number input must not throw or corrupt.
  await price.focus();
  await page.evaluate(() => navigator.clipboard?.writeText?.("$250,000").catch(() => {}));
  await page.keyboard.press("ControlOrMeta+V").catch(() => {});
  const after = await page.locator("main").innerText();
  expect(after).not.toMatch(/NaN|Infinity|undefined/);
});

test("the rental property spreadsheet is a real, ungated .xlsx download", async ({ page, request }) => {
  await page.goto("/tools/rental-property-spreadsheet", { waitUntil: "domcontentloaded" });
  const link = page.getByRole("link", { name: /download/i }).filter({ has: page.locator(":scope") }).first();
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  expect(href).toBe("/downloads/truecap-rental-property-analyzer.xlsx");
  await expect(link).toHaveAttribute("download", /.*/);

  const res = await request.get(href!);
  expect(res.status()).toBe(200);
  const body = await res.body();
  expect(body.length).toBeGreaterThan(5_000);
  // OOXML zip magic: "PK\x03\x04"
  expect(body.subarray(0, 4).toString("hex")).toBe("504b0304");
  expect(res.headers()["content-type"]).toMatch(/spreadsheetml|octet-stream/);
});
