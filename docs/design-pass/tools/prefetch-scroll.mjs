// Scroll-time prefetch check (PR #151/#152's rule): at 390x844, load a page,
// wait for idle, then scroll top to bottom and count the JS chunks and RSC
// payloads requested DURING the scroll. Links below the fold must prefetch on
// intent (hover/focus), never on scroll, so a converted page should show ~0.
//   PAGES=/,/pricing node prefetch-scroll.mjs <baseUrl> <out.json>
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.argv[2];
const OUT = process.argv[3];
const PAGES = (process.env.PAGES ?? "/").split(",");

const browser = await chromium.launch();
const results = [];
for (const p of PAGES) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => {
    try { window.localStorage.setItem("truecap_cookie_consent_v1", "denied"); } catch {}
  });
  const page = await ctx.newPage();
  await page.goto(BASE + p, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  const seen = [];
  const onRequest = (req) => {
    const url = req.url();
    if (/_rsc=|[?&]__rsc|\.rsc\b/.test(url) || req.headers()["rsc"] === "1") seen.push({ kind: "rsc", url });
    else if (/\/_next\/static\/.*\.js(\?|$)/.test(url)) seen.push({ kind: "js", url });
  };
  const sizes = new Map();
  page.on("request", onRequest);
  page.on("response", async (res) => {
    try {
      const body = await res.body();
      sizes.set(res.url(), body.length);
    } catch {}
  });
  await page.evaluate(async () => {
    const step = Math.max(300, Math.floor(window.innerHeight * 0.7));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 180));
    }
  });
  await page.waitForTimeout(2000);
  page.off("request", onRequest);
  const js = seen.filter((s) => s.kind === "js");
  const rsc = seen.filter((s) => s.kind === "rsc");
  const kb = (list) => Math.round(list.reduce((n, s) => n + (sizes.get(s.url) ?? 0), 0) / 1024);
  const row = {
    page: p,
    js: js.length,
    jsKB: kb(js),
    rsc: rsc.length,
    rscKB: kb(rsc),
    rscTargets: [...new Set(rsc.map((s) => new URL(s.url).pathname))].slice(0, 20),
  };
  results.push(row);
  console.log(`${p}: ${row.js} JS / ${row.jsKB} KB, ${row.rsc} RSC / ${row.rscKB} KB`);
  await ctx.close();
}
fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
await browser.close();
