import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
export { chromium, fs, path };
export const OUT = process.env.AUDIT_SHOTS ?? "docs/overhaul-2026-10/adversarial-audit/shots/audit";
export const EV = process.env.AUDIT_EVIDENCE ?? "docs/overhaul-2026-10/adversarial-audit/instruments";
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(EV, { recursive: true });
export const LIVE = process.env.BASE ?? "https://usetruecap.com";
const IPHONE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1";
const PIXEL_UA = "Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36";
export const DEVICES = {
  iphone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: IPHONE_UA },
  android: { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: PIXEL_UA },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  laptop: { viewport: { width: 1095, height: 760 }, deviceScaleFactor: 1 },
  narrow: { viewport: { width: 320, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IPHONE_UA },
};
export const NETWORKS = {
  slow4g: { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8, cpu: 4 },
  fast4g: { latency: 60, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8, cpu: 4 },
};
export async function throttle(ctx, page, net) {
  if (!net) return;
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: net.latency, downloadThroughput: net.downloadThroughput, uploadThroughput: net.uploadThroughput });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: net.cpu });
  return cdp;
}
// Records slider value changes, paints, LCP, long tasks, and when the Radix thumb mounts.
export const PROBE = () => {
  const t = () => Math.round(performance.now());
  const log = (window.__probe = { events: [], longtasks: [], lcp: null });
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) log.longtasks.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: "longtask", buffered: true }); } catch {}
  try { new PerformanceObserver((l) => { const e = l.getEntries().at(-1); if (e) log.lcp = { t: Math.round(e.startTime), el: e.element ? (e.element.tagName + " " + (e.element.textContent || "").slice(0, 40)) : null }; }).observe({ type: "largest-contentful-paint", buffered: true }); } catch {}
  let last = null;
  const mo = new MutationObserver(() => {
    const s = document.querySelector('[data-hero-ledger] [role="slider"]');
    const v = s?.getAttribute("aria-valuenow") ?? null;
    if (v !== last) { log.events.push([t(), "valuenow", v]); last = v; }
  });
  document.addEventListener("DOMContentLoaded", () => { log.events.push([t(), "dcl"]); mo.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ["aria-valuenow"], childList: true }); });
  window.addEventListener("load", () => log.events.push([t(), "load"]));
};
export async function shot(page, name, opts = {}) {
  const p = path.join(OUT, name + ".jpg");
  await page.screenshot({ path: p, type: "jpeg", quality: opts.quality ?? 65, fullPage: !!opts.fullPage, clip: opts.clip, animations: opts.animations });
  return "shots/audit/" + name + ".jpg";
}
export async function denyCookies(ctx) {
  await ctx.addInitScript(() => { try { localStorage.setItem("truecap_cookie_consent_v1", "denied"); } catch {} });
}
export function save(name, obj) { fs.writeFileSync(path.join(EV, name + ".json"), JSON.stringify(obj, null, 2)); }
