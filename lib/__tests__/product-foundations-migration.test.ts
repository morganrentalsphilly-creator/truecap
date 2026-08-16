import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase/migrations/20260815130000_product_foundations.sql"
);
const migration = readFileSync(MIGRATION_PATH, "utf8");
const savedAnalysesAction = readFileSync(
  join(process.cwd(), "app/actions/saved-analyses.ts"),
  "utf8"
);

describe("product foundations migration", () => {
  it("marks historical analyses honestly instead of assigning v1.0 retroactively", () => {
    expect(migration).toContain("add column if not exists methodology_version text");
    expect(migration).toMatch(
      /set methodology_version\s*=\s*'legacy-unversioned'\s*where methodology_version is null/i
    );
    expect(migration).not.toMatch(/set methodology_version\s*=\s*'(?:v)?1\.0'/i);
    expect(savedAnalysesAction).toContain(
      "methodology_version: result.methodologyVersion"
    );
  });

  it("creates owner-scoped, revisioned financing profiles with one default", () => {
    expect(migration).toContain("create table if not exists public.financing_profiles");
    expect(migration).toContain("terms_version integer not null default 1");
    expect(migration).toContain("financing_profiles_one_default_idx");
    expect(migration).toContain("financing_profiles_ltv_down_payment_check");
    expect(migration).toContain("financing_profiles_default_active_check");
    expect(migration).toContain('create policy "financing_profiles_select_own"');
    expect(migration).toContain('create policy "financing_profiles_insert_own"');
    expect(migration).toContain('create policy "financing_profiles_update_own"');
    expect(migration).toContain('create policy "financing_profiles_delete_own"');
    expect(migration).toContain("for each row execute function public.set_updated_at()");
  });

  it("gives saved analyses a durable profile snapshot independent of the live profile", () => {
    expect(migration).toContain("add column if not exists financing_profile_id uuid");
    expect(migration).toContain("add column if not exists financing_profile_version integer");
    expect(migration).toContain("add column if not exists financing_profile_snapshot jsonb");
    expect(migration).toContain("on delete set null");
    expect(migration).toContain("enforce_financing_profile_snapshot_integrity");
    expect(migration).toContain(
      "financing profile provenance must match the current stored revision"
    );
    expect(migration).toContain("profile.last_verified_at at time zone 'UTC'");
    expect(migration).toContain("'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"'");
  });

  it("keeps every legacy pipeline value while adding the acquisition stages", () => {
    const legacyStages = [
      "researching",
      "analyzing",
      "offer",
      "under_contract",
      "closed",
      "passed",
    ];
    const newStages = [
      "watching",
      "screening",
      "verifying",
      "offer_ready",
      "negotiating",
    ];

    expect(migration).toContain("drop constraint if exists saved_analyses_pipeline_stage_check");
    for (const stage of [...legacyStages, ...newStages]) {
      expect(migration).toContain(`'${stage}'`);
    }
  });

  it("enforces client ownership for deals and buy boxes at the database boundary", () => {
    expect(migration).toContain("security definer");
    expect(migration).toContain("client.agent_user_id = new.user_id");
    expect(migration).toContain("saved_analyses_client_owner_guard");
    expect(migration).toContain("user_buy_boxes_client_owner_guard");
  });
});
