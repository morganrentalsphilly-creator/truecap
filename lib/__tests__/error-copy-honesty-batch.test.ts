import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";

/**
 * Pins for the 2026-09-01 error-copy honesty batch (10 adversarially-confirmed
 * findings). The unifying defect class — advice that cannot fix the trigger —
 * has shipped to production four separate times in this codebase.
 */

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("no user-facing message names a migration or says 'Schema migration pending'", () => {
  it("app/actions is clean of operator jargon in message fields", () => {
    let out = "";
    try {
      out = execFileSync(
        "grep",
        ["-rn", "-E", 'message:\\s*$|message: "', "app/actions"],
        { cwd: process.cwd(), encoding: "utf8" },
      );
    } catch (e) {
      if ((e as { status?: number }).status !== 1) throw e;
    }
    const offenders = out
      .split("\n")
      .filter((l) => /Schema migration pending|\.sql is applied|until (the )?[a-z-]* ?migration/i.test(l));
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});

describe("deterministic failures never get retry advice", () => {
  it("product-evaluation branches on the missing-function codes", () => {
    const s = read("app/actions/product-evaluation.ts");
    expect(s).toContain('error.code === "PGRST202" || error.code === "42883"');
    expect(s).toContain("no action needed on your end");
  });

  it("compare passes the cause-specific message through unchanged", () => {
    const s = read("app/actions/compare.ts");
    expect(s).not.toContain('"Could not verify comparison access. Try again."');
    expect(s).toMatch(/message: usage\.message,/);
  });

  it("share-copy preserves MIGRATION_PENDING and VALIDATION_ERROR diagnoses", () => {
    const s = read("app/actions/public-shares.ts");
    expect(s).toMatch(/saved\.code === "MIGRATION_PENDING" \|\| saved\.code === "VALIDATION_ERROR"/);
  });

  it("the lapsed-session copy no longer says 'Create an account'", () => {
    const s = read("app/actions/product-evaluation.ts");
    expect(s).not.toContain("Create an account to start the evaluation.");
    expect(s).toContain("Your session has expired.");
  });
});

describe("entitlement mutations verify the plan instead of downgrading on a blip", () => {
  const GATED = [
    "app/actions/saved-analyses.ts",
    "app/actions/batch-triage.ts",
    "app/actions/exit-scenarios.ts",
    "app/actions/analysis-templates.ts",
    "app/actions/compare.ts",
    "app/actions/agent-clients.ts",
    "app/actions/user-buy-boxes.ts",
  ];
  for (const f of GATED) {
    it(`${f} uses the verified variant`, () => {
      const s = read(f);
      expect(s).toContain("getVerifiedEntitlementsForUser(supabase");
      // The lenient variant silently substitutes the free plan on a DB error,
      // which made every downstream gate tell an already-Pro user to upgrade.
      expect(s).not.toMatch(/[^d]getEntitlementsForUser\(supabase/);
    });
  }
});

describe("action-confirm dialog race guards", () => {
  const s = read("components/ui/action-confirm-dialog.tsx");
  it("treats an in-flight close as busy in enqueue", () => {
    expect(s).toContain("if (current || settledRef.current) return current;");
  });
  it("finishSettle is idempotent", () => {
    expect(s).toMatch(/if \(!settled\) return;/);
  });
});

describe("rate-limited ceiling renders wait copy, not retry advice", () => {
  it("the resolver's code reaches the renderers", () => {
    const dash = read("components/investcalc/analysis-dashboard.tsx");
    expect(dash).toContain("errorCode: resolved.ok ? null : resolved.code");
    const summary = read("components/investcalc/focused-decision-summary.tsx");
    expect(summary).toContain('offerCeilingErrorCode === "RATE_LIMITED"');
    expect(summary).toContain("no need to retry");
  });
});

describe("buy-box offer targets cannot compose a doomed save", () => {
  it("the list action exposes supportsOfferTargets and the card gates both inputs", () => {
    expect(read("app/actions/user-buy-boxes.ts")).toContain(
      "supportsOfferTargets: fetched.supportsOfferTargets",
    );
    const card = read("components/settings/buy-boxes-card.tsx");
    expect(card.match(/OFFER_TARGET_KEYS\.has\(field\.key\)/g)?.length ?? 0)
      .toBeGreaterThanOrEqual(4); // disabled + title on both field groups
    expect(card).toContain("everything else in this box works");
  });
});

describe("avatar upload maps storage errors", () => {
  it("uses friendlyToastError instead of the raw SDK message", () => {
    const s = read("components/profile/profile-form.tsx");
    expect(s).toContain('friendlyToastError(error, { feature: "profile-avatar" })');
  });
});
