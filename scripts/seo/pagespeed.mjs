#!/usr/bin/env node
/** Monthly mobile performance QA via Google's PageSpeed Insights API. */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const base = (process.env.SEO_BASE_URL ?? "https://usetruecap.com").replace(/\/$/, "");
const routes = [
  "/",
  "/tools/cap-rate-calculator",
  "/blog/how-to-calculate-cap-rate",
  "/markets/philadelphia",
  "/states/pennsylvania",
  "/pricing",
];
const output = path.join(ROOT, "artifacts/seo/pagespeed.json");
const key = process.env.PAGESPEED_API_KEY;
const results = [];

for (const route of routes) {
  const params = new URLSearchParams({ url: `${base}${route}`, strategy: "mobile", category: "performance" });
  if (key) params.set("key", key);
  try {
    const response = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`, {
      headers: { "user-agent": "TrueCap-SEO-Performance/1.0" },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${body?.error?.message ?? "unknown error"}`);
    const audits = body.lighthouseResult?.audits ?? {};
    const score = body.lighthouseResult?.categories?.performance?.score ?? null;
    const lcpMs = audits["largest-contentful-paint"]?.numericValue ?? null;
    const cls = audits["cumulative-layout-shift"]?.numericValue ?? null;
    const tbtMs = audits["total-blocking-time"]?.numericValue ?? null;
    const passed = score !== null && score >= 0.7 && (lcpMs === null || lcpMs <= 4000) && (cls === null || cls <= 0.25);
    results.push({ route, score, lcpMs, cls, tbtMs, passed });
  } catch (error) {
    results.push({ route, passed: false, error: error instanceof Error ? error.message : String(error) });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  strategy: "mobile",
  thresholds: { performanceScore: 0.7, lcpMs: 4000, cls: 0.25 },
  passed: results.every((result) => result.passed),
  results,
};
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
// Report-only: field variance and API quota must not block a production deploy.
