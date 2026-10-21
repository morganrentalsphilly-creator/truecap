import { chromium, PROBE, save, LIVE } from "./lib.mjs";
const sizes = [[375,667,true],[390,844,true],[412,915,true],[430,932,true],[768,1024,true],[1095,760,false],[1280,720,false],[1440,900,false],[1920,1080,false]];
const b = await chromium.launch();
const rows = [];
for (const [w,h,mobile] of sizes) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
  await ctx.addInitScript(PROBE);
  await ctx.addInitScript(() => { try { localStorage.setItem("truecap_cookie_consent_v1", "denied"); } catch {} });
  const page = await ctx.newPage();
  await page.goto(LIVE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const atLoad = await page.evaluate(() => { const r = document.querySelector("[data-hero-ledger]").getBoundingClientRect(); const vis = Math.max(0, Math.min(innerHeight, r.bottom) - Math.max(0, r.top)); return { top: Math.round(r.top), h: Math.round(r.height), visibleRatioAtLoad: +(vis / r.height).toFixed(3) }; });
  const glidedAtLoad = (await page.evaluate(() => window.__probe.events.filter(e => e[1] === "valuenow").map(e => e[2]))).length > 1;
  // Trust pass (A3): the handle no longer moves; the moment is the meets-range
  // draw, reported on the scrubber root as data-glide.
  const glideAtLoad = await page.evaluate(() => document.querySelector("[data-price-scrubber]")?.getAttribute("data-glide") ?? null);
  // Scroll so the sheet is as visible as it can be, then wait.
  await page.evaluate(() => { const el = document.querySelector("[data-hero-ledger]"); const r = el.getBoundingClientRect(); window.scrollBy(0, r.top - Math.max(0, (innerHeight - r.height) / 2)); });
  await page.waitForTimeout(2500);
  const vals = await page.evaluate(() => window.__probe.events.filter(e => e[1] === "valuenow").map(e => e[2]));
  const maxRatio = +(Math.min(1, h / atLoad.h)).toFixed(3);
  const glideAfterScroll = await page.evaluate(() => document.querySelector("[data-price-scrubber]")?.getAttribute("data-glide") ?? null);
  const maxValuenow = Math.max(...vals.map(Number).filter(Number.isFinite));
  rows.push({ viewport: `${w}x${h}`, ...atLoad, maxPossibleRatio: maxRatio, glidedAtLoad, glidedAfterScroll: vals.length > 1, distinctValues: [...new Set(vals)].length, glideAtLoad, glideAfterScroll, maxValuenow });
  await ctx.close();
}
save("glide-check", rows);
console.table(rows);
await b.close();
