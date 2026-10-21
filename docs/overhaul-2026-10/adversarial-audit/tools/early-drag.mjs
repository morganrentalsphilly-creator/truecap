import { chromium, DEVICES, throttle, PROBE, shot, save, LIVE, denyCookies } from "./lib.mjs";
const b = await chromium.launch();
const ctx = await b.newContext({ ...DEVICES.iphone }); await denyCookies(ctx); await ctx.addInitScript(PROBE);
const p = await ctx.newPage(); await throttle(ctx, p, { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8, cpu: 4 });
const t0 = Date.now();
await p.goto(LIVE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
await p.locator("[data-price-scrubber]").waitFor({ state: "attached", timeout: 60000 });
await p.evaluate(() => document.querySelector("[data-price-scrubber]").scrollIntoView({ block: "center" }));
await p.waitForTimeout(100);
const diamond = await p.evaluate(() => {
  const root = document.querySelector("[data-price-scrubber]");
  const cands = [...root.querySelectorAll("*")].filter(e => { const r = e.getBoundingClientRect(); return r.width >= 14 && r.width <= 32 && Math.abs(r.width - r.height) < 3 && r.height > 0; });
  const s = root.querySelector('[role="slider"]'); const sr = s?.getBoundingClientRect();
  const c = cands.find(e => /rotate|diamond/.test(e.className?.toString() || "")) || cands[0];
  const r = c?.getBoundingClientRect();
  return { slider: sr ? { x: sr.x, y: sr.y, w: sr.width, h: sr.height, hidden: getComputedStyle(s).visibility + "/" + getComputedStyle(s).display } : null, static: r ? { x: r.x + r.width / 2, y: r.y + r.height / 2, cls: c.className.toString().slice(0, 80) } : null };
});
const dragAt = Date.now() - t0;
let after = null;
if (diamond.static) {
  await p.mouse.move(diamond.static.x, diamond.static.y); await p.mouse.down(); await p.mouse.move(diamond.static.x - 110, diamond.static.y, { steps: 10 }); await p.mouse.up();
  await p.waitForTimeout(200);
  after = await p.evaluate(() => document.querySelector('[data-price-scrubber] [role="slider"]')?.getAttribute("aria-valuenow") ?? null);
}
const s1 = await shot(p, "flow-early-drag-0");
await p.waitForTimeout(10000);
const s2 = await shot(p, "flow-early-drag-10s");
const probe = await p.evaluate(() => window.__probe);
save("early-drag", { dragAtMs: dragAt, diamond, valueRightAfterDrag: after, valuenowTimeline: probe.events.filter(e => e[1] === "valuenow" || e[1] === "load"), shots: [s1, s2] });
console.log(JSON.stringify({ dragAt, diamond, after, tl: probe.events }));
await b.close();
