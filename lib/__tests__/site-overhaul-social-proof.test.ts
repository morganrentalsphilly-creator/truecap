import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({ captureMessage: vi.fn(), captureException: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => {
    throw new Error("no database in this test");
  },
}));

import { Testimonials, loadPublishedTestimonials } from "@/components/marketing/testimonials";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

/**
 * Phase 5 (docs/site-overhaul.md): with an EMPTY testimonials table the
 * proof surfaces must show nothing invented — no placeholder quotes, no
 * "coming soon", no stars, no ratings, no user counts.
 */
describe("social proof renders nothing it cannot substantiate", () => {
  it("<Testimonials /> renders null when there are no published rows (or no database)", async () => {
    expect(await loadPublishedTestimonials(3)).toEqual([]);
    expect(await Testimonials({ limit: 3 })).toBeNull();
  });

  it("no placeholder proof appears in the homepage, pricing, or reviews sources", () => {
    const forbidden = [
      /coming soon/i,
      /★|⭐|☆/,
      /\b\d(?:\.\d)?\s*\/\s*5\b/,
      /\b(?:4|5)\s*stars?\b/i,
      /as seen (?:in|on)\b/i,
      /trusted by \d/i,
      /\b\d[\d,]*\+?\s+(?:investors|users|customers)\b/i,
      /aggregateRating/,
      /placeholder-user|placeholder\.jpg/,
    ];
    for (const path of [
      "app/page.tsx",
      "app/home-authed/page.tsx",
      "app/pricing/page.tsx",
      "app/reviews/page.tsx",
      "components/marketing/testimonials.tsx",
      "components/marketing/usage-counter.tsx",
      "components/marketing/landing-sections.tsx",
    ]) {
      const source = read(path);
      for (const pattern of forbidden) {
        expect(source, `${path} matches ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("mounts the testimonials and the reviews page pieces (the proof strip was retired on 2026-09-07)", () => {
    expect(read("components/marketing/marketing-hero.tsx")).not.toContain("ProofStrip");
    for (const path of ["app/page.tsx", "app/home-authed/page.tsx", "app/pricing/page.tsx"]) {
      expect(read(path), path).toContain("<Testimonials limit={3}");
    }
    const reviews = read("app/reviews/page.tsx");
    expect(reviews).toContain("<Testimonials");
    expect(reviews).not.toContain("ProofStrip");
    expect(reviews).toMatch(/UsageCounter|loadUsageLabel/);
  });

  it("keeps /reviews statically prerenderable (declared hourly ISR must be true)", () => {
    // Reading the request session (cookies) opts the route out of
    // prerendering; `/reviews` was "not prerendered" in the build manifest
    // while its header comment promised "Static + hourly ISR".
    const reviews = read("app/reviews/page.tsx");
    expect(reviews).toContain("export const revalidate = 3600;");
    expect(reviews).not.toMatch(/lib\/request-auth|lib\/supabase\/server|next\/headers/);
    expect(reviews).not.toContain("hideAccountLinks");
    // The "(b) three facts" section is what keeps the page above the site's
    // 300-word indexability gate (scripts/seo-audit.ts) after the founder
    // card and proof strip were retired.
    expect(reviews).toContain('aria-labelledby="verify-title"');
    expect(reviews).toContain('href="/methodology"');
    // The publisher sends no email and the veto token belongs to the
    // founder's moderation path, so do not promise a delivered self-service
    // removal link to the person quoted.
    expect(reviews).not.toContain("the person named gets");
    expect(reviews).not.toContain("one-click link");
    expect(reviews).toContain("contact hello@usetruecap.com");
  });

  it("keeps the usage counter computed, never seeded", () => {
    const counter = read("components/marketing/usage-counter.tsx");
    expect(counter).toContain("formatUsageCount");
    expect(counter).not.toMatch(/analysis_runs|51900|50000|50_000/);
    expect(read("lib/testimonials/store.ts")).not.toMatch(/analysis_runs/);
  });
});
