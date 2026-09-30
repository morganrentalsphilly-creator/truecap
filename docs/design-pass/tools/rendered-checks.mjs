// Design-pass rendered checks: axe (WCAG 2.1 A/AA) plus the DESIGN.md rules a
// source scan cannot see, measured in the browser at each width. Usage:
//   PAGES=/,/pricing WIDTHS=375,1440 node rendered-checks.mjs <baseUrl> <out.json>
// Consent is pre-answered (denied) so the cookie banner does not cover
// targets; reduced motion is on so nothing is mid-animation.
import { chromium } from "playwright";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const AXE = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const BASE = process.argv[2];
const OUT = process.argv[3];
const PAGES = (process.env.PAGES ?? "/").split(",");
const WIDTHS = (process.env.WIDTHS ?? "375,1440").split(",").map(Number);
const HEIGHT = { 375: 812, 390: 844, 768: 1024, 1095: 760, 1280: 800, 1440: 900 };

const browser = await chromium.launch();
const results = [];

for (const width of WIDTHS) {
  for (const p of PAGES) {
    const mobile = width < 768;
    const ctx = await browser.newContext({
      viewport: { width, height: HEIGHT[width] ?? 900 },
      isMobile: mobile,
      hasTouch: mobile,
      reducedMotion: "reduce",
    });
    await ctx.addInitScript(() => {
      try { window.localStorage.setItem("truecap_cookie_consent_v1", "denied"); } catch {}
    });
    const page = await ctx.newPage();
    const res = await page.goto(BASE + p, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.addScriptTag({ content: AXE });
    const axe = await page.evaluate(async () => {
      const r = await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
      return r.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.slice(0, 6).map((n) => ({ target: n.target.join(" "), summary: (n.failureSummary || "").slice(0, 240) })),
        count: v.nodes.length,
      }));
    });
    const facts = await page.evaluate(() => {
      const visible = (el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
      };
      const text = (el) => (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
      // Controls under 44px. An inline link inside running text is exempt
      // (WCAG 2.5.8's inline exception); a link that is the only thing in its
      // block, a button, a field or a summary is a control.
      const small = [];
      for (const el of document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button]")) {
        if (!visible(el) || el.closest("[aria-hidden=true]")) continue;
        const r = el.getBoundingClientRect();
        if (r.width >= 44 && r.height >= 44) continue;
        if (el.tagName === "A") {
          const block = el.closest("p, li, dd, td, figcaption, span");
          if (block && text(block).length > text(el).length + 3) continue;
        }
        if (r.height >= 44 && r.width >= 24) continue;
        small.push({ tag: el.tagName.toLowerCase(), text: text(el).slice(0, 60), w: Math.round(r.width), h: Math.round(r.height) });
      }
      const leaves = [...document.querySelectorAll("body *")].filter((el) => !el.childElementCount && text(el).length > 1 && visible(el));
      const tinyText = leaves
        .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12 && !el.closest(".sr-only"))
        .map((el) => ({ text: text(el).slice(0, 50), size: getComputedStyle(el).fontSize }));
      const upperSmall = leaves
        .filter((el) => { const s = getComputedStyle(el); return s.textTransform === "uppercase" && parseFloat(s.fontSize) <= 14; })
        .map((el) => text(el).slice(0, 40));
      const arrowLinks = [...document.querySelectorAll("a, button")].filter((a) => /(→|->|»)\s*$/.test(text(a))).map((a) => text(a).slice(0, 60));
      const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(visible).map((h) => Number(h.tagName[1]));
      const skips = [];
      for (let i = 1; i < headings.length; i++) if (headings[i] - headings[i - 1] > 1) skips.push(`h${headings[i - 1]}→h${headings[i]}`);
      const shadowsAtRest = [...document.querySelectorAll("main *")]
        .filter((el) => visible(el) && getComputedStyle(el).boxShadow !== "none" && !el.closest("[role=dialog],[role=menu],[role=listbox]"))
        .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`)
        .slice(0, 10);
      const gradients = [...document.querySelectorAll("main *")]
        .filter((el) => visible(el) && /gradient\(/.test(getComputedStyle(el).backgroundImage))
        .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`)
        .slice(0, 10);
      return {
        title: document.title,
        h1Count: document.querySelectorAll("h1").length,
        h1: text(document.querySelector("h1") || document.body).slice(0, 120),
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        docHeight: document.documentElement.scrollHeight,
        disclaimers: document.querySelectorAll("[data-disclaimer]").length,
        smallTargets: small.slice(0, 25),
        smallTargetCount: small.length,
        tinyText: tinyText.slice(0, 15),
        upperSmall: upperSmall.slice(0, 15),
        arrowLinks,
        headingSkips: skips,
        shadowsAtRest,
        gradients,
        fonts: [...new Set([...document.querySelectorAll("h1,h2,h3,p,a,button,td,th,li")].map((el) => getComputedStyle(el).fontFamily.split(",")[0].trim()))],
      };
    });
    results.push({ page: p, width, status: res ? res.status() : null, finalUrl: page.url().replace(BASE, ""), axe, ...facts });
    process.stdout.write(`checked ${p} @ ${width}: axe ${axe.length}, small ${facts.smallTargetCount}, overflow ${facts.overflowX}\n`);
    await ctx.close();
  }
}

fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
await browser.close();
console.log("done", results.length);
