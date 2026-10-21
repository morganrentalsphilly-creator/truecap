import { chromium, DEVICES, shot, save, LIVE, denyCookies } from "./lib.mjs";
const b = await chromium.launch();
const ctx = await b.newContext({ ...DEVICES.desktop });
await denyCookies(ctx);
const page = await ctx.newPage();
await page.goto(LIVE + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
const out = [];
const triggers = page.locator('[data-hero-ledger] [data-slot="popover-trigger"]');
const n = await triggers.count();
for (let i = 0; i < n; i++) {
  const t = triggers.nth(i);
  const label = (await t.innerText()).replace(/\s+/g, " ");
  await t.click();
  await page.waitForTimeout(500);
  const body = await page.locator('[data-slot="popover-content"], [role="dialog"]').last().innerText().catch(() => "");
  out.push({ label, body: body.replace(/\s+/g, " ") });
  if (i === 1) await shot(page, "hero-popover-rate");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
}
// The schematic's figures at rest (the ceiling).
const sheet = await page.locator("[data-hero-ledger]").innerText();
save("hero-popovers", { out, sheet });
console.log(JSON.stringify(out, null, 1));
console.log(sheet.replace(/\n+/g, " | ").slice(0, 1500));
await b.close();
