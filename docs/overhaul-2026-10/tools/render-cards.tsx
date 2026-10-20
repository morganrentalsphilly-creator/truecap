/**
 * Renders the social cards to PNG without a build: the three route
 * handlers and one card per template, through next/og in Node.
 * Usage: npx tsx docs/overhaul-2026-10/tools/render-cards.tsx <outDir>
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const out = process.argv[2] ?? "docs/overhaul-2026-10/phase-7/after";
mkdirSync(out, { recursive: true });

const cards: Array<[string, () => Promise<Response>]> = [
  ["home", async () => (await import("@/app/og/home/route")).GET()],
  ["for-agents", async () => (await import("@/app/og/for-agents/route")).GET()],
  ["share", async () => (await import("@/app/og/share/route")).GET()],
  ["blog", async () => (await import("@/app/blog/1-percent-rule-rental-property/opengraph-image")).default()],
  ["vs", async () => (await import("@/app/vs/avail/opengraph-image")).default()],
  ["tool", async () => (await import("@/app/tools/1-percent-rule-calculator/opengraph-image")).default()],
  ["analyze", async () => (await import("@/app/analyze/opengraph-image")).default()],
  ["pricing", async () => (await import("@/app/pricing/opengraph-image")).default()],
];

async function main() {
  for (const [name, render] of cards) {
    try {
      const response = await render();
      const png = Buffer.from(await response.arrayBuffer());
      writeFileSync(path.join(out, `${name}.png`), png);
      console.log(name, png.length);
    } catch (error) {
      console.log(name, "FAILED", (error as Error).message);
    }
  }
}

void main();
