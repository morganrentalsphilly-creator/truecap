import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { DEFAULT_FEATURE_FLAGS } from "@/lib/feature-flags";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("permissioned testimonial workflow", () => {
  const migration = read(
    "supabase/migrations/20260829110000_testimonial_workflow_hardening.sql",
  );
  const action = read("app/actions/testimonials.ts");
  const prompt = read("components/marketing/testimonial-prompt.tsx");
  const adminAction = read("app/actions/admin-testimonials.ts");
  const adminPage = read("app/admin/testimonials/page.tsx");

  it("stays dark in production until the typed flag is explicitly enabled", () => {
    expect(DEFAULT_FEATURE_FLAGS.testimonial_collection).toBe(false);
    // The review-by-hand action stays behind the flag. The in-product prompt
    // moved to the consented pipeline (docs/site-overhaul.md Phase 5): it
    // renders only after the SERVER grants the once-per-user claim, so it is
    // dark until the pipeline's tables exist — no flag needed.
    expect(prompt).not.toContain('isFeatureEnabled("testimonial_collection")');
    expect(prompt).toContain("claimTestimonialPromptAction");
    expect(prompt).toContain("submitPublishableTestimonialAction");
    expect(action).toContain('isFeatureEnabled("testimonial_collection")');
    expect(action).toContain('code: "FEATURE_DISABLED"');
  });

  it("adds a private, unapproved workflow in a wholly separate additive table", () => {
    for (const field of [
      "preferred_display_name_format",
      "verification_status",
      "publication_status",
      "approved_at",
      "administrative_notes",
      "withdrawn_at",
      "permission_granted_at",
    ]) {
      expect(migration).toContain(field);
    }
    expect(migration).toContain(
      "create table if not exists public.permissioned_testimonial_submissions",
    );
    expect(migration).toContain("quote text");
    expect(migration).toContain("default 'unverified'");
    expect(migration).toContain("default 'private'");
    expect(migration).toContain("quote is not null");
    expect(migration).toContain("consent_to_publish = true");
    expect(migration).toContain("permission_granted_at is not null");
    expect(migration).toContain("permission_granted_at <= approved_at");
    expect(migration).toContain("publication_status <> 'approved'");
    expect(migration).toContain("publication_status = 'revoked'");
    expect(migration).toContain("Operational rollback");
    expect(migration).not.toMatch(
      /permission_granted_at\s*=\s*(?:now|approved_at)/,
    );
    expect(migration).not.toMatch(
      /alter table public\.testimonial_submissions/i,
    );
    expect(migration).not.toMatch(/drop constraint/i);
    expect(migration).not.toMatch(/update public\.testimonial_submissions/i);
  });

  it("atomically rate-limits an opaque bucket and keeps the RPC service-role only", () => {
    expect(action).toContain('createHmac("sha256"');
    expect(action).toContain(
      "const secret = process.env.TESTIMONIAL_RATE_LIMIT_SECRET",
    );
    expect(action).toContain("secret.length < 32");
    expect(action).not.toContain("process.env.SUPABASE_SERVICE_ROLE_KEY");
    expect(action).toContain(
      'admin.rpc(\n      "submit_permissioned_testimonial_submission"',
    );
    expect(action).not.toContain('.from("testimonial_submissions").insert');
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("rate_limit_key = p_rate_limit_key");
    expect(migration).toContain("force row level security");
    expect(migration).toContain(") from public, anon, authenticated;");
    expect(migration).toContain(") to service_role;");
  });

  it("requires a real sentence plus explicit publish consent in the in-product prompt", () => {
    // The old action still accepts an omitted quote + display format; the
    // consented prompt asks one question and one permission.
    expect(action).toContain("preferredDisplayNameFormat");
    expect(prompt).toContain('name="quote"');
    expect(prompt).toContain('name="consent"');
    expect(prompt).toContain(
      "TrueCap may publish this with my first name, role, and market.",
    );
    expect(prompt).not.toContain('name="preferredDisplayNameFormat"');
  });

  it("requires admin review and exposes promotion only after every gate", () => {
    expect(adminAction).toContain("await checkAdmin()");
    expect(adminAction).toContain('publicationStatus === "approved"');
    expect(adminAction).toContain("current.consent_to_publish !== true");
    expect(adminAction).toContain("!current.permission_granted_at");
    expect(adminAction).toContain("!current.quote?.trim()");
    expect(adminAction).toContain('verificationStatus !== "verified"');
    expect(adminAction).toContain('publicationStatus === "revoked"');
    expect(adminAction).toContain("preferred_display_name_format");
    expect(adminAction).toContain('update.is("withdrawn_at", null)');
    expect(adminAction).toContain("if (!updated)");
    expect(adminPage).toContain("isPromotionEligible(row)");
    expect(adminPage).toContain("!row.withdrawn_at");
    expect(adminPage).toContain("row.permission_granted_at");
    expect(adminPage).toContain("formatTestimonialDisplayName(");
    expect(adminPage).not.toContain(
      "customerName: ${JSON.stringify(row.display_name",
    );
    expect(adminPage).toContain(
      "20260829110000_testimonial_workflow_hardening.sql",
    );
    expect(adminAction).toContain(
      '.from("permissioned_testimonial_submissions")',
    );
    expect(adminPage).toContain(
      '.from("permissioned_testimonial_submissions")',
    );
    expect(adminPage).not.toContain("20260829141000");
  });
});
