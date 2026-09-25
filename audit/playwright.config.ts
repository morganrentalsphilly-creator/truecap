import { defineConfig } from "@playwright/test";

/**
 * Audit-only Playwright config (2026-09 full-site audit). Separate from the
 * release config so the crawl never runs inside `npm run test:e2e` or CI.
 *
 *   npx playwright test -c audit/playwright.config.ts
 *
 * Env:
 *   AUDIT_BASE_URL       server to crawl (default http://127.0.0.1:3100, the
 *                        isolated server from scripts/dev-isolated.sh)
 *   AUDIT_ROLE           anon | free | pro (label for the output folder)
 *   AUDIT_STORAGE_STATE  Playwright storageState JSON for a signed-in role
 *   AUDIT_RUN            output folder name under artifacts/audit (default baseline)
 *   AUDIT_WIDTHS         comma list of viewport widths (default 375,768,1280,1440)
 *   AUDIT_AXE_WIDTHS     widths that also run axe-core (default 375,1280)
 *   AUDIT_ROUTES         "sitemap" (default) | "private" | comma list of paths
 *   AUDIT_LIMIT          crawl only the first N routes (smoke runs)
 */
export default defineConfig({
  testDir: ".",
  testMatch: /.*\.audit\.ts$/,
  fullyParallel: true,
  workers: Number(process.env.AUDIT_WORKERS ?? 4),
  retries: 0,
  timeout: 0,
  reporter: [["list"]],
  outputDir: "../artifacts/audit/playwright-output",
  use: {
    baseURL: process.env.AUDIT_BASE_URL ?? "http://127.0.0.1:3100",
    trace: "off",
    video: "off",
    screenshot: "off",
  },
});
