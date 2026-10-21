import { chromium, DEVICES, shot, save, LIVE, denyCookies } from "./lib.mjs";
const b = await chromium.launch();
const R = {};
for (const device of ["iphone", "desktop"]) {
  const ctx = await b.newContext({ ...DEVICES[device] }); await denyCookies(ctx);
  const p = await ctx.newPage(); await p.goto(LIVE + "/", { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  const vh = DEVICES[device].viewport.height; const w = DEVICES[device].viewport.width;
  const frames = [];
  for (let y = 0, k = 0; y < H; y += Math.round(vh * 0.9), k++) { await p.evaluate((yy) => window.scrollTo(0, yy), y); await p.waitForTimeout(700); frames.push(await shot(p, `home-${w}-scroll-${String(k).padStart(2, "0")}`, { quality: 55 })); }
  const words = await p.evaluate(() => (document.querySelector("main")?.innerText || "").split(/\s+/).filter(Boolean).length);
  // Text blocks before the instrument on this width.
  const before = await p.evaluate(() => { const fig = document.querySelector("[data-hero-ledger]"); const top = fig.getBoundingClientRect().top + scrollY; const hero = document.querySelector("[data-page-hero]"); return [...hero.querySelectorAll("h1,p,form,a,label,ul,div > span")].filter(e => { const r = e.getBoundingClientRect(); return r.height > 0 && r.top + scrollY < top && !fig.contains(e) && e.innerText.trim().length > 0 && !e.closest("header"); }).map(e => `${e.tagName}:${e.innerText.replace(/\s+/g, " ").slice(0, 50)}`); });
  R[device] = { height: H, words, blocksBeforeInstrument: before, frames };
  await ctx.close();
}
save("home-full", R); console.log(JSON.stringify(R, (k, v) => k === "frames" ? v.length : v, 1));
await b.close();
