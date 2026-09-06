/**
 * scripts/capture-screenshots.ts — real product screenshots for the marketing
 * site (Phase 4 of docs/site-overhaul.md).
 *
 *   npx -y tsx scripts/capture-screenshots.ts                       # http://127.0.0.1:3100
 *   npx -y tsx scripts/capture-screenshots.ts --base http://127.0.0.1:3100 --out public/product
 *
 * A local server must already be running (`npm run build && npm run start
 * -- --hostname 127.0.0.1 --port 3100`). Everything is captured from the
 * NO-ACCOUNT sample flow (/analyze?sample=1) and the public sample memo, so
 * no customer data, no seeded user, and no credentials are involved. Light
 * theme, 2× device scale, 1280×800 and 390×844, reduced motion.
 *
 * Output: optimized PNG + WebP pairs in public/product/, named
 *   <shot>-<viewport>.{png,webp}
 * plus manifest.json (shot, viewport, width, height, captured_at, source url)
 * which the <ProductShot /> component reads for intrinsic dimensions.
 *
 * Shots that need an authenticated dashboard (side-by-side comparison) are
 * listed in DEFERRED so the manifest records the gap honestly instead of
 * shipping a placeholder.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { chromium, type Locator, type Page } from "@playwright/test";
import sharp from "sharp";

type Viewport = { name: "desktop" | "mobile"; width: number; height: number };
const VIEWPORTS: Viewport[] = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
];

type ManifestEntry = {
  shot: string;
  viewport: Viewport["name"];
  width: number;
  height: number;
  png: string;
  webp: string;
  source: string;
  captured_at: string;
};

const DEFERRED = [
  {
    shot: "ten-year-cash-flow",
    reason:
      "The 10-Year Projections tab is Pro-gated and is not rendered for the anonymous sample run; capturing it needs an authenticated Pro session (a seeded demo account), which this environment cannot create without database credentials.",
  },
  {
    shot: "comparison",
    reason:
      "Side-by-side comparison lives in the authenticated dashboard; capturing it needs a seeded demo account, which this environment cannot create without database credentials.",
  },
];

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  const inline = process.argv.find((a) => a.startsWith(`${name}=`));
  return inline ? inline.slice(name.length + 1) : fallback;
}

async function dismissCookieBanner(page: Page) {
  const reject = page.getByRole("button", { name: "Reject", exact: true });
  try {
    await reject.waitFor({ state: "visible", timeout: 4000 });
    await reject.click();
  } catch {
    /* banner already dismissed or not rendered */
  }
}

async function save(
  buffer: Buffer,
  outDir: string,
  shot: string,
  viewport: Viewport,
  source: string,
  manifest: ManifestEntry[],
) {
  const base = `${shot}-${viewport.name}`;
  const pngPath = path.join(outDir, `${base}.png`);
  const webpPath = path.join(outDir, `${base}.webp`);
  const image = sharp(buffer);
  const meta = await image.metadata();
  await image.clone().png({ compressionLevel: 9, palette: false }).toFile(pngPath);
  await image.clone().webp({ quality: 82 }).toFile(webpPath);
  manifest.push({
    shot,
    viewport: viewport.name,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    png: `/product/${base}.png`,
    webp: `/product/${base}.webp`,
    source,
    captured_at: new Date().toISOString(),
  });
  console.log(`saved ${base} (${meta.width}×${meta.height})`);
}

/** Hide sticky chrome (header, bottom bars) so it never paints over an element shot. */
async function hideStickyChrome(page: Page) {
  await page.addStyleTag({
    content:
      "header, [data-sticky-bottom-bar], [data-cookie-consent-banner], [data-calc-bar], [data-conversion-bar-root] { visibility: hidden !important; }",
  });
}

async function elementShot(locator: Locator): Promise<Buffer> {
  await locator.scrollIntoViewIfNeeded();
  await locator.waitFor({ state: "visible", timeout: 30_000 });
  // Let images/fonts settle after scrolling.
  await locator.page().waitForTimeout(400);
  return locator.screenshot({ type: "png", animations: "disabled" });
}

async function main() {
  const base = arg("--base", "http://127.0.0.1:3100").replace(/\/$/, "");
  const outDir = path.resolve(arg("--out", "public/product"));
  await fs.mkdir(outDir, { recursive: true });
  const manifest: ManifestEntry[] = [];

  const browser = await chromium.launch();
  try {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 2,
        colorScheme: "light",
        reducedMotion: "reduce",
        isMobile: viewport.name === "mobile",
        hasTouch: viewport.name === "mobile",
      });
      const page = await context.newPage();

      // ── The sample decision on /analyze (no account) ────────────────────
      const analyzeUrl = `${base}/analyze?sample=1`;
      await page.goto(analyzeUrl, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await hideStickyChrome(page);
      const summary = page.locator('section[aria-labelledby="decision-summary-title"]');
      await summary.waitFor({ state: "visible", timeout: 60_000 });
      await save(await elementShot(summary), outDir, "verdict", viewport, analyzeUrl, manifest);

      // "Where the rent goes" lives in the Cash Flow tab.
      // The result tabs are plain buttons carrying the label as `title`.
      const cashFlowTab = page.locator('button[title="Cash Flow"]').first();
      if (await cashFlowTab.count()) {
        await cashFlowTab.click();
      }
      const waterfall = page.locator('section[aria-label="Cash flow waterfall"]');
      if (await waterfall.count()) {
        await save(await elementShot(waterfall), outDir, "where-the-rent-goes", viewport, analyzeUrl, manifest);
      } else {
        console.warn("waterfall section not found — skipped");
      }

      // 10-year projections (the sample run previews the Pro panel).
      const projectionsTab = page.locator('button[title="10-Year Projections"]').first();
      if (await projectionsTab.count()) {
        await projectionsTab.click();
        // The panel renders the projections trio (summary cards, table,
        // charts) inside the tab's content region; capture the region that
        // contains the "10-Year" heading.
        const panel = page
          .locator("section, div")
          .filter({ has: page.getByRole("heading", { name: /10-year/i }) })
          .last();
        if (await panel.count()) {
          await save(await elementShot(panel), outDir, "ten-year-cash-flow", viewport, analyzeUrl, manifest);
        }
      } else {
        console.warn("projections tab not found — skipped");
      }

      // ── The written memo ────────────────────────────────────────────────
      const memoUrl = `${base}/sample-decision-memo`;
      await page.goto(memoUrl, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await hideStickyChrome(page);
      const memoMain = page.locator("main").first();
      await memoMain.waitFor({ state: "visible", timeout: 30_000 });
      await save(await elementShot(memoMain), outDir, "memo", viewport, memoUrl, manifest);

      await context.close();
    }
  } finally {
    await browser.close();
  }

  const generatedAt = new Date().toISOString();
  await fs.writeFile(
    path.join(outDir, "manifest.json"),
    `${JSON.stringify({ generated_at: generatedAt, shots: manifest, deferred: DEFERRED }, null, 2)}\n`,
  );
  // Typed module for <ProductShot /> (static import → the build never reads
  // the filesystem at runtime; an empty list renders nothing).
  const generatedModule = path.resolve(arg("--module", "lib/product-shots.generated.ts"));
  await fs.writeFile(
    generatedModule,
    [
      "/**",
      " * GENERATED by scripts/capture-screenshots.ts — do not edit by hand.",
      " * Real product screenshots captured from the no-account sample flow; the",
      " * <ProductShot /> component reads intrinsic sizes from here. An empty list",
      " * means the pipeline has not run yet and every ProductShot renders nothing.",
      " */",
      "export type ProductShotEntry = {",
      "  shot: string;",
      '  viewport: "desktop" | "mobile";',
      "  width: number;",
      "  height: number;",
      "  png: string;",
      "  webp: string;",
      "  source: string;",
      "  captured_at: string;",
      "};",
      "",
      `export const PRODUCT_SHOTS: readonly ProductShotEntry[] = ${JSON.stringify(manifest, null, 2)};`,
      `export const PRODUCT_SHOTS_GENERATED_AT: string | null = ${JSON.stringify(generatedAt)};`,
      "",
    ].join("\n"),
  );
  console.log(`wrote ${manifest.length} images + manifest.json to ${outDir}; module ${generatedModule}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
