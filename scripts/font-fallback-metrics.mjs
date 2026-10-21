#!/usr/bin/env node
/**
 * Metric-matched fallback faces for the phones and Linux machines that have
 * no Arial (audit A4, 2026-10-21).
 *
 * next/font writes one fallback per face, `src: local("Arial")`. Android and
 * most Linux desktops have no Arial, so the browser skipped that face and set
 * the text in an unadjusted system sans until Hanken Grotesk arrived: the live
 * site measured CLS 0.181 on / and 0.230 on /pricing, every shift "Web font
 * loaded". This script computes the same four overrides next/font computes
 * (its formula, from the same capsize metrics it ships), for the two faces
 * those systems do have:
 *
 *   - Roboto, Android's system sans;
 *   - Liberation Sans, the Linux sans that is metric-compatible with Arial by
 *     design (same advances and vertical metrics), so it takes Arial's numbers.
 *
 *   node scripts/font-fallback-metrics.mjs          print the @font-face block
 *   node scripts/font-fallback-metrics.mjs --check  exit 1 if app/globals.css differs
 *
 * lib/__tests__/display-font-fallback.test.ts runs the check's comparison.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const metrics = JSON.parse(
  readFileSync(join(ROOT, "node_modules/next/dist/server/capsize-font-metrics.json"), "utf8"),
);

/** The faces the site loads, by their capsize key. */
const FACES = [
  { family: "Hanken Grotesk", key: "hankenGrotesk", fallbackName: "TrueCap Text Fallback" },
  { family: "Geist Mono", key: "geistMono", fallbackName: "TrueCap Mono Fallback" },
];

/** The installed faces to fall back to, with the local() names they go by. */
const SYSTEM_FALLBACKS = [
  { name: "Roboto", key: "roboto", local: ["Roboto", "Roboto Regular", "Roboto-Regular"] },
  // Metric-compatible with Arial, which is why next/font's own numbers fit it.
  { name: "Liberation Sans", key: "arial", local: ["Liberation Sans", "LiberationSans", "LiberationSans-Regular"] },
];

const pct = (n) => `${(n * 100).toFixed(2)}%`;

/** next/font's calculation: against Arial it reproduces the overrides next/font writes into the built CSS. */
function overrides(face, fallback) {
  const f = metrics[face];
  const s = metrics[fallback];
  const sizeAdjust = f.xWidthAvg / f.unitsPerEm / (s.xWidthAvg / s.unitsPerEm);
  return {
    ascent: pct(f.ascent / (f.unitsPerEm * sizeAdjust)),
    descent: pct(Math.abs(f.descent) / (f.unitsPerEm * sizeAdjust)),
    lineGap: pct(f.lineGap / (f.unitsPerEm * sizeAdjust)),
    sizeAdjust: pct(sizeAdjust),
  };
}

/** "TrueCap Text Fallback Roboto": named for its role, not the face it stands in for. */
export function fallbackFamily(family, system) {
  const face = FACES.find((f) => f.family === family);
  return `${face ? face.fallbackName : `${family} Fallback`} ${system}`;
}

export function fallbackFaceCss() {
  const blocks = [];
  for (const face of FACES) {
    for (const system of SYSTEM_FALLBACKS) {
      const o = overrides(face.key, system.key);
      blocks.push(
        [
          "@font-face {",
          `  font-family: "${fallbackFamily(face.family, system.name)}";`,
          `  src: ${system.local.map((n) => `local("${n}")`).join(", ")};`,
          `  ascent-override: ${o.ascent};`,
          `  descent-override: ${o.descent};`,
          `  line-gap-override: ${o.lineGap};`,
          `  size-adjust: ${o.sizeAdjust};`,
          "}",
        ].join("\n"),
      );
    }
  }
  return blocks.join("\n");
}

/** The fallback families to list after next/font's own, for one face. */
export function fallbackStack(family) {
  return SYSTEM_FALLBACKS.map((s) => `"${fallbackFamily(family, s.name)}"`).join(", ");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const css = fallbackFaceCss();
  if (process.argv.includes("--check")) {
    const globals = readFileSync(join(ROOT, "app/globals.css"), "utf8");
    if (!globals.includes(css)) {
      console.error("app/globals.css does not carry the generated fallback faces; paste the output of this script.");
      process.exit(1);
    }
    console.log("fallback faces match");
  } else {
    console.log(css);
  }
}
