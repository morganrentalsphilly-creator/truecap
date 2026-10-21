import { chromium, LIVE, denyCookies, PROBE, shot, save } from "./lib.mjs";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); await denyCookies(ctx); await ctx.addInitScript(PROBE);
const p = await ctx.newPage(); await p.goto(LIVE + "/", { waitUntil: "load" });
const frames = [];
const t0 = Date.now();
while (Date.now() - t0 < 4500) { const v = await p.evaluate(() => document.querySelector('[data-hero-ledger] [role="slider"]')?.getAttribute("aria-valuenow")); frames.push([Date.now() - t0, v]); if (frames.length % 4 === 0 && frames.length < 40) await shot(p, `glide-1440-${String(frames.length).padStart(2, "0")}`, { clip: { x: 659, y: 127, width: 653, height: 520 }, quality: 60 }); await p.waitForTimeout(60); }
const ev = await p.evaluate(() => window.__probe.events);
save("glide-seq-1440", { frames, ev });
console.log(JSON.stringify(ev));
await b.close();
