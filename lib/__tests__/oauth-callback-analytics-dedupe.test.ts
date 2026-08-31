import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..");
const callback = readFileSync(join(ROOT, "app/auth/callback/route.ts"), "utf8");
const claimMigration = readFileSync(
  join(
    ROOT,
    "supabase/migrations/20260829113000_canonical_analytics_event_claims.sql",
  ),
  "utf8",
);

describe("Google OAuth canonical analytics dedupe wiring", () => {
  it("claims each event by opaque user id before capture", () => {
    const scheduler = callback.indexOf(
      "function scheduleNewOAuthAccountAnalytics",
    );
    const claim = callback.indexOf(
      "await claimCanonicalAnalyticsEvent",
      scheduler,
    );
    const capture = callback.indexOf("await captureServerEvent", scheduler);
    const end = callback.indexOf("\n}\n", scheduler);
    const source = callback.slice(scheduler, end);

    expect(scheduler).toBeGreaterThan(-1);
    expect(claim).toBeGreaterThan(scheduler);
    expect(capture).toBeGreaterThan(claim);
    expect(source).toContain("const admin = createAdminSupabaseClient()");
    expect(source).toContain("eventName: analyticsEvent.event");
    expect(source).toContain("dedupeKey: user.id");
    expect(source).toContain('if (claimState === "duplicate") continue');
    expect(source).toContain('claimState = "unavailable"');
    expect(source).toContain("canonicalAnalyticsEventId(");
    expect(source).toContain("releaseCanonicalAnalyticsEventClaim(");
    expect(source).toContain("try {");
    expect(source).toContain("} catch {");
    expect(source).not.toContain("dedupeKey: user.email");
  });

  it("creates the complete database claim allowlist with a durable key", () => {
    expect(claimMigration).toContain("'account_created'");
    expect(claimMigration).toContain("'product_evaluation_started'");
    expect(claimMigration).toContain("'subscription_started'");
    expect(claimMigration).toContain("'shared_analysis_copied'");
    expect(claimMigration).not.toMatch(
      /^\s*(?:drop table|alter table.*drop primary key)/im,
    );
    expect(claimMigration).toContain("select, insert, delete");
  });
});
