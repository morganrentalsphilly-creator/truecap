// Design-pass capture harness: first-visit viewport + full-page screenshots
// at fixed widths, plus a few measured facts per page. Usage:
//   node capture.mjs <baseUrl> <outDir> [label]
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2];
const OUT = process.argv[3];
const LABEL = process.argv[4] ?? "local";
const FIRST = process.env.SKIP_FIRST !== "1";
const PAGES = (process.env.PAGES ?? "/,/for-agents,/pricing,/for-buy-and-hold,/sample-decision-memo").split(",");
const WIDTHS = (process.env.WIDTHS ?? "375,768,1095,1440").split(",").map(Number);
const HEIGHT = { 375: 812, 390: 844, 768: 1024, 1095: 760, 1280: 800, 1440: 900 };

fs.mkdirSync(OUT, { recursive: true });
const slugOf = (p) => (p === "/" ? "home" : p.replace(/^\//, "").replace(/\//g, "_"));

const browser = await chromium.launch();
const facts = [];

async function settle(page) {
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(400);
}

async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = Math.max(300, Math.floor(window.innerHeight * 0.8));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(500);
}

for (const width of WIDTHS) {
  const height = HEIGHT[width] ?? 900;
  const mobile = width < 768;
  for (const p of PAGES) {
    const slug = slugOf(p);
    // 1) First visit, as an ad click lands: no stored consent, banner showing.
    if (FIRST) {
      const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
      const page = await ctx.newPage();
      const res = await page.goto(BASE + p, { waitUntil: "domcontentloaded", timeout: 60000 });
      await settle(page);
      await page.screenshot({ path: path.join(OUT, `${slug}-${width}-first.png`) });
      const f = await page.evaluate(() => {
        const h1 = document.querySelector("h1");
        const arrowLinks = [...document.querySelectorAll("a,button")].filter((a) => /→/.test(a.textContent || "")).length;
        const upperSmall = [...document.querySelectorAll("body *")].filter((el) => {
          if (!el.childElementCount && (el.textContent || "").trim().length > 2) {
            const s = getComputedStyle(el);
            return s.textTransform === "uppercase" && parseFloat(s.fontSize) <= 13;
          }
          return false;
        }).length;
        const fonts = new Set([...document.querySelectorAll("h1,h2,h3,p,a,button,td,th,li")].map((el) => getComputedStyle(el).fontFamily.split(",")[0].trim()));
        return {
          title: document.title,
          h1: h1 ? h1.innerText.replace(/\s+/g, " ").trim() : null,
          overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          docHeight: document.documentElement.scrollHeight,
          arrowLinks,
          upperSmall,
          fonts: [...fonts],
          disclaimers: document.querySelectorAll('[data-disclaimer], [data-testid="disclaimer"]').length,
        };
      });
      facts.push({ label: LABEL, page: p, width, status: res ? res.status() : null, finalUrl: page.url(), ...f });
      await ctx.close();
    }
    // 2) Full page with consent answered (denied), after scrolling so lazy content loads.
    // Reduced motion settles the scroll-driven tc-reveal sections, which a
    // full-page capture would otherwise show as blank (their view timeline
    // never reaches them in one tall frame).
    {
      const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, reducedMotion: "reduce" });
      await ctx.addInitScript(() => {
        try { window.localStorage.setItem("truecap_cookie_consent_v1", "denied"); } catch {}
      });
      const page = await ctx.newPage();
      await page.goto(BASE + p, { waitUntil: "domcontentloaded", timeout: 60000 });
      await settle(page);
      await scrollThrough(page);
      await page.screenshot({ path: path.join(OUT, `${slug}-${width}-full.png`), fullPage: true });
      await ctx.close();
    }
    process.stdout.write(`captured ${p} @ ${width}\n`);
  }
}

if (facts.length) fs.writeFileSync(path.join(OUT, "facts.json"), JSON.stringify(facts, null, 2));
await browser.close();
console.log("done", facts.length);
