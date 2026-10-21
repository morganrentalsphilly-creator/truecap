import { chromium, DEVICES, shot, save, LIVE, denyCookies } from "./lib.mjs";
import { fillDeal } from "./analyzer-lib.mjs";
const b = await chromium.launch();
const out = {};
for (const [name, d] of [["zero-rent", { address: "4821 Larchwood Ave, Philadelphia, PA 19143", price: 250000, beds: 3, rent: 0 }], ["zero-rent-no-beds", { address: "4821 Larchwood Ave, Philadelphia, PA 19143", price: 250000, rent: 0 }]]) {
  const ctx = await b.newContext({ ...DEVICES.desktop }); await denyCookies(ctx);
  const page = await ctx.newPage();
  await page.goto(LIVE + "/analyze", { waitUntil: "networkidle" });
  await fillDeal(page, d);
  const before = await page.locator("#monthlyRent").inputValue();
  await page.waitForTimeout(3000);
  const afterWait = await page.locator("#monthlyRent").inputValue();
  const toastsBefore = await page.locator("[data-sonner-toast], li[data-sonner-toast]").allInnerTexts().catch(() => []);
  await page.locator('[data-inform-submit="true"]').first().click();
  await page.locator("#decision-summary-title").waitFor({ timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const toasts = await page.locator("[data-sonner-toast]").allInnerTexts().catch(() => []);
  const rentAfterRun = await page.locator("#monthlyRent").inputValue().catch(() => "n/a");
  const verdict = await page.locator("#decision-summary-title").innerText().catch(() => null);
  const s = await shot(page, `break-${name}-toast`);
  out[name] = { rentTyped: before, rentAfter3s: afterWait, toastsBeforeRun: toastsBefore, rentAfterRun, toasts, verdict, shot: s };
  await ctx.close();
}
save("zero-rent", out); console.log(JSON.stringify(out, null, 1));
await b.close();
