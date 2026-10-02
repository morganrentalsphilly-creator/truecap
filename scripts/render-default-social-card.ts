/**
 * Redraw public/home.jpg, the default social card, from the current homepage
 * card, under Node. No build and no server.
 *
 *   npx -y tsx scripts/render-default-social-card.ts
 *   npx -y tsx scripts/render-default-social-card.ts --out /tmp/home.jpg
 *
 * WHY THE FILE EXISTS. /home.jpg is the og:image of every page that has no
 * card of its own (the market, state and glossary pages, /about, /methodology
 * and the rest), of the root layout, and the `image` of the Article JSON-LD.
 * A page-level openGraph without an image ships no og:image at all, so those
 * pages need a real file at a stable URL. It was last drawn in June 2026 with
 * the old brand and a "STRONG BUY" badge the product no longer shows.
 *
 * WHAT IT DRAWS. Exactly what GET /og/home answers (app/og/home/route.tsx):
 * the homepage headline beside the sample deal's ledger, every figure read
 * from the engine. This script calls that route handler, so the file and the
 * homepage's own card cannot disagree on the day it is run. It is a
 * snapshot: re-run it when the homepage headline, the sample deal or the card
 * frame (lib/og/newsprint.tsx) changes, look at the result, and commit it.
 *
 * It needs network access to fonts.googleapis.com (the card's three faces).
 * If a face does not load it exits non-zero and writes nothing, because the
 * route itself would fall back to next/og's built-in face and this file is
 * kept for months. The output is checked to be 1200 x 630 before it is
 * written; lib/__tests__/public-metadata-contract.test.ts checks the
 * committed file's size too.
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { GET } from "@/app/og/home/route";
import { loadNewsprintFonts, NEWSPRINT, OG_SIZE } from "@/lib/og/newsprint";

const DEFAULT_OUT = "public/home.jpg";

/**
 * The part of sharp this script uses. sharp is installed as one of Next's
 * optional dependencies, not declared in package.json, so it is loaded at run
 * time and typed here: a static import would make the type check (which
 * `next build` runs over scripts/ too) depend on an optional package.
 */
type ImageInfo = { format?: string; width?: number; height?: number };
type ImagePipeline = {
  metadata(): Promise<ImageInfo>;
  flatten(options: { background: string }): ImagePipeline;
  jpeg(options: { quality: number; chromaSubsampling: string; mozjpeg: boolean }): ImagePipeline;
  toBuffer(): Promise<Buffer>;
};
type Sharp = (input: Buffer) => ImagePipeline;

async function loadSharp(): Promise<Sharp> {
  const name = "sharp";
  try {
    const mod = (await import(name)) as { default: Sharp };
    return mod.default;
  } catch {
    throw new Error("sharp is not installed (it comes with next); nothing written");
  }
}

async function main(): Promise<void> {
  const sharp = await loadSharp();
  const outFlag = process.argv.indexOf("--out");
  const out = resolve(
    process.cwd(),
    outFlag > -1 && process.argv[outFlag + 1] ? process.argv[outFlag + 1] : DEFAULT_OUT,
  );

  // The same loader the route uses, cached per process: asking first means
  // the route below draws with these faces or this script stops here.
  const fonts = await loadNewsprintFonts({ display: "TrueCap", text: "TrueCap", mono: "0" });
  if (!fonts || fonts.length < 3) {
    throw new Error(
      `only ${fonts?.length ?? 0} of the card's 3 faces loaded from Google Fonts; nothing written`,
    );
  }

  const response = await GET();
  if (!response.ok) throw new Error(`/og/home answered ${response.status}`);
  const png = Buffer.from(await response.arrayBuffer());

  const drawn = await sharp(png).metadata();
  if (drawn.width !== OG_SIZE.width || drawn.height !== OG_SIZE.height) {
    throw new Error(
      `the card is ${drawn.width} x ${drawn.height}, expected ${OG_SIZE.width} x ${OG_SIZE.height}`,
    );
  }

  // 4:4:4 keeps the hairline rules and the small ledger figures sharp; the
  // card is flat paper and ink, so the file stays small at a high quality.
  const jpeg = await sharp(png)
    .flatten({ background: NEWSPRINT.paper })
    .jpeg({ quality: 90, chromaSubsampling: "4:4:4", mozjpeg: true })
    .toBuffer();
  const written = await sharp(jpeg).metadata();
  if (written.format !== "jpeg" || written.width !== OG_SIZE.width || written.height !== OG_SIZE.height) {
    throw new Error(`the encoded file is ${written.format} ${written.width} x ${written.height}`);
  }

  writeFileSync(out, jpeg);
  console.log(`${out}: ${written.width} x ${written.height} JPEG, ${jpeg.length} bytes`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
