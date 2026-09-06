import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PRODUCT_SHOTS } from "@/lib/product-shots.generated";
import { findProductShot } from "@/components/marketing/product-shot";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

/**
 * Phase 4 (docs/site-overhaul.md): every product image on the marketing site
 * is a REAL screenshot from the no-account sample flow. No placeholders, no
 * generated faces, no invented facts on the founder card.
 */
describe("product screenshots are real and wired", () => {
  it("ships the captured verdict, waterfall, and memo shots for both viewports", () => {
    for (const shot of ["verdict", "where-the-rent-goes", "memo"]) {
      for (const viewport of ["desktop", "mobile"] as const) {
        const entry = findProductShot(shot, viewport);
        expect(entry, `${shot}-${viewport}`).not.toBeNull();
        expect(entry!.width).toBeGreaterThan(300);
        expect(entry!.height).toBeGreaterThan(200);
        expect(entry!.source).toMatch(/\/analyze\?sample=1$|\/sample-decision-memo$/);
        // The files the module points at exist in public/.
        readFileSync(join(ROOT, "public", entry!.webp));
        readFileSync(join(ROOT, "public", entry!.png));
      }
    }
    expect(PRODUCT_SHOTS.every((s) => s.captured_at.length > 0)).toBe(true);
  });

  it("renders nothing for an unknown shot instead of a placeholder", () => {
    expect(findProductShot("does-not-exist")).toBeNull();
    const source = read("components/marketing/product-shot.tsx");
    expect(source).toContain("if (!entry) return null;");
    expect(source).not.toMatch(/placeholder\.(?:jpg|svg|png)/);
  });

  it("uses the hero screenshot as the preloaded LCP image with a live-sample link", () => {
    const hero = read("components/marketing/marketing-hero.tsx");
    expect(hero).toContain('findProductShot("verdict", "desktop")');
    expect(hero).toContain("priority");
    expect(hero).toContain('href="/analyze?sample=1"');
    expect(hero).toContain("Live sample →");
  });

  it("places a product shot on every listed marketing surface", () => {
    for (const path of [
      "app/pricing/page.tsx",
      "app/for-buy-and-hold/page.tsx",
      "app/for-house-hackers/page.tsx",
      "app/for-agents/page.tsx",
      "app/blog/page.tsx",
      "app/vs/page.tsx",
    ]) {
      expect(read(path), path).toContain("<ProductShot");
    }
  });

  it("keeps the founder card facts-only with no photo and no invented details", () => {
    const card = read("components/marketing/founder-card.tsx");
    expect(card).toContain("Morgan Page");
    expect(card).toContain("Rental investor in Philadelphia. Built TrueCap for my own underwriting.");
    expect(card).toContain('href="/about"');
    expect(card).not.toMatch(/<Image|<img|\.jpg|\.png|placeholder-user/);
    for (const path of ["app/page.tsx", "app/home-authed/page.tsx", "app/pricing/page.tsx"]) {
      expect(read(path), path).toContain("<FounderCard");
    }
    const about = read("app/about/page.tsx");
    expect(about).toContain('"@type": "Person"');
    expect(about).toContain("`${siteUrl}/about#morgan`");
  });
});
