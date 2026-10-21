import { chromium, LIVE, denyCookies, DEVICES, save } from "./lib.mjs";
const b = await chromium.launch();
const ctx = await b.newContext({ ...DEVICES.iphone }); await denyCookies(ctx);
const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
const out = {};
async function touchDrag(sel, dx) {
  const el = p.locator(sel).first(); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(400);
  const bb = await el.boundingBox(); const x = bb.x + bb.width / 2, y = bb.y + bb.height / 2;
  const before = await el.getAttribute("aria-valuenow");
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  for (let i = 1; i <= 10; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + (dx * i) / 10, y }] }); await p.waitForTimeout(16); }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await p.waitForTimeout(800);
  return { before, after: await el.getAttribute("aria-valuenow"), scrollY: await p.evaluate(() => scrollY) };
}
await p.goto(LIVE + "/", { waitUntil: "networkidle" }); await p.waitForTimeout(4000);
out.hero = await touchDrag('[data-hero-ledger] [role="slider"]', -120);
await p.goto(LIVE + "/analyze?sample=1", { waitUntil: "networkidle" }); await p.locator("#decision-summary-title").waitFor({ timeout: 30000 }); await p.waitForTimeout(2500);
out.result = await touchDrag('[aria-label="What-if offer price"]', -100);
save("touch-drag", out); console.log(JSON.stringify(out));
await b.close();
