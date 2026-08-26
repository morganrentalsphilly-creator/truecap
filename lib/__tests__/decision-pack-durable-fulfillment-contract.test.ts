import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

const fulfillmentMigration = read(
  "supabase/review-drafts/decision-pack-durable-fulfillment.sql"
);
const normalizedFulfillmentMigration = fulfillmentMigration.replace(/\s+/g, " ");
const compsMigration = read(
  "supabase/migrations/20260824121000_deal_comps_service_role_writes.sql"
);
const compsOwnerBindingMigration = read(
  "supabase/migrations/20260825221000_deal_comps_owner_binding.sql"
);
const shareRetentionMigration = read(
  "supabase/review-drafts/public-share-retention-service-role.sql"
);
const runbook = read("docs/DECISION-PACK-DURABLE-FULFILLMENT-RUNBOOK.md");
const normalizedRunbook = runbook.replace(/\s+/g, " ");

describe("durable Decision Pack schema contract", () => {
  it("keeps draft SQL out of the executable Supabase migration queue", () => {
    const draftMarker = "TRUECAP_DRAFT_SQL: DO_NOT_APPLY";
    expect(fulfillmentMigration).toContain(draftMarker);
    expect(shareRetentionMigration).toContain(draftMarker);
    expect(
      existsSync(
        join(
          ROOT,
          "supabase/migrations/20260824120000_decision_pack_durable_fulfillment.sql"
        )
      )
    ).toBe(false);
    expect(
      existsSync(
        join(
          ROOT,
          "supabase/migrations/20260824122000_public_share_retention_service_role.sql"
        )
      )
    ).toBe(false);

    for (const migrationName of readdirSync(join(ROOT, "supabase/migrations"))) {
      if (!migrationName.endsWith(".sql")) continue;
      expect(read(`supabase/migrations/${migrationName}`)).not.toContain(draftMarker);
    }
  });

  it("is explicitly inert and review-gated", () => {
    expect(fulfillmentMigration).toContain("NOT APPLIED / SURFACED FOR REVIEW");
    expect(fulfillmentMigration).toContain("It does not change the $5 Price");
    expect(runbook).toContain("Status: designed, not active");
    expect(normalizedRunbook).toContain(
      "fulfillment and retention SQL files are review drafts outside the executable migration queue and must not be applied to production"
    );
    expect(normalizedRunbook).toContain(
      "`deal_comps` write-boundary hardening migration is already recorded in production and must not be edited or replayed"
    );
    expect(normalizedRunbook).toContain(
      "the forward-only owner binding remains part of the next reviewed release batch"
    );
    expect(normalizedRunbook).toContain("No live Checkout Session");
  });

  it("binds one claim and Checkout Session to a complete immutable decision snapshot", () => {
    expect(fulfillmentMigration).toContain(
      "claim_id uuid not null unique"
    );
    expect(fulfillmentMigration).toContain(
      "stripe_checkout_session_id text not null unique"
    );
    for (const field of [
      "input_snapshot jsonb not null",
      "result_snapshot jsonb not null",
      "target_snapshot jsonb not null",
      "snapshot_sha256 text not null",
      "snapshot_contract_version text not null",
      "input_schema_version integer not null",
      "model_version text not null",
      "methodology_version text not null",
      "target_contract_version text not null",
      "target_source text not null",
    ]) {
      expect(fulfillmentMigration).toContain(field);
    }
    expect(fulfillmentMigration).toContain(
      "Decision Pack claim and Checkout Session do not match"
    );
    expect(fulfillmentMigration).toContain(
      "Decision Pack purchase snapshot binding is immutable"
    );
    expect(runbook).toContain("decision-pack.snapshot.v1");
    expect(normalizedRunbook).toContain("must not fetch current form values");
  });

  it("requires complete non-null Stripe facts for every paid lifecycle state", () => {
    expect(normalizedFulfillmentMigration).toContain(
      "payment_status in ('paid', 'partially_refunded', 'refunded') and stripe_payment_intent_id is not null and paid_at is not null"
    );
    expect(normalizedFulfillmentMigration).toContain(
      "and amount_paid_cents is not null and amount_paid_cents > 0 and currency is not null and currency ~ '^[a-z]{3}$'"
    );
  });

  it("makes account claims atomic and keeps the one-way claim marker immutable", () => {
    expect(normalizedFulfillmentMigration).toContain(
      "if tg_op = 'INSERT' and ((new.claimed_user_id is null) <> (new.claimed_at is null)) then"
    );
    expect(normalizedFulfillmentMigration).toContain(
      "if old.claimed_at is not null and new.claimed_at is distinct from old.claimed_at then"
    );
    expect(normalizedFulfillmentMigration).toContain(
      "if old.claimed_user_id is null and old.claimed_at is null and ((new.claimed_user_id is null) <> (new.claimed_at is null)) then"
    );
    expect(fulfillmentMigration).toContain(
      "Decision Pack account claim timestamp is immutable"
    );
  });

  it("reuses the existing Stripe event idempotency ledger instead of creating a rival lock", () => {
    expect(fulfillmentMigration).toContain(
      "references public.stripe_webhook_events(stripe_event_id)"
    );
    expect(fulfillmentMigration).not.toContain(
      "create table if not exists public.decision_pack_stripe_events"
    );
    expect(runbook).toContain("Do not add a second webhook endpoint or independent event lock");
    expect(runbook).toContain("stripe_event_id` remains the global idempotency key");
    expect(runbook).toContain("late or out of order");
    expect(runbook.toLowerCase()).toContain("re-fetch");
  });

  it("stores append-only PDF metadata in a private service-only bucket", () => {
    expect(fulfillmentMigration).toContain(
      "create table if not exists public.decision_pack_artifacts"
    );
    expect(fulfillmentMigration).toContain("content_sha256 text not null");
    expect(fulfillmentMigration).toContain("snapshot_sha256 text not null");
    expect(fulfillmentMigration).toContain("Decision Pack artifacts are append-only");
    expect(fulfillmentMigration).toContain("'decision-pack-artifacts'");
    expect(fulfillmentMigration).toContain("false,\n  10485760,\n  array['application/pdf']");
    expect(fulfillmentMigration).not.toMatch(/create policy[\s\S]+decision-pack-artifacts/i);
    expect(fulfillmentMigration).toContain(
      "grant select, insert on table public.decision_pack_artifacts to service_role"
    );
    expect(fulfillmentMigration).not.toContain(
      "grant select, insert, update on table public.decision_pack_artifacts"
    );
    expect(runbook).toContain("maximum lifetime of 300 seconds");
    expect(runbook).toContain("Never persist or email a permanent public URL");
  });

  it("stores only hashed, bounded recovery capabilities", () => {
    expect(fulfillmentMigration).toContain(
      "create table if not exists public.decision_pack_recovery_grants"
    );
    expect(fulfillmentMigration).toContain("token_hash text not null unique");
    expect(fulfillmentMigration).not.toMatch(/\n\s+token text(?:\s|,)/);
    expect(fulfillmentMigration).toContain("expires_at timestamptz not null");
    expect(fulfillmentMigration).toContain("max_uses integer not null");
    expect(fulfillmentMigration).toContain("use_count integer not null default 0");
    expect(fulfillmentMigration).toContain("recovery revocation is immutable");
    expect(runbook).toContain("at least 256 bits of randomness");
    expect(runbook).toContain("Never resend an old plaintext token");
  });

  it("keeps all durable purchase state behind forced RLS with no client grants", () => {
    for (const table of [
      "decision_pack_fulfillments",
      "decision_pack_artifacts",
      "decision_pack_recovery_grants",
    ]) {
      expect(fulfillmentMigration).toContain(
        `alter table public.${table} force row level security`
      );
      expect(fulfillmentMigration).toContain(
        `revoke all on table public.${table} from public, anon, authenticated, service_role`
      );
    }
    expect(fulfillmentMigration).not.toMatch(/create policy/i);
    expect(fulfillmentMigration).not.toMatch(
      /grant[^;]+on table public\.decision_pack_[^;]+to (?:anon|authenticated)/i
    );
  });

  it("documents every activation blocker and non-destructive rollback", () => {
    for (const required of [
      "Email recovery",
      "Refund, dispute, chargeback, and Pack-credit blocker",
      "Reconciliation and support recovery",
      "Share and provider boundaries preserved by this slice",
      "Provider retention/redisplay rights",
      "Activation gates and accountable owners",
      "After any bound purchase or artifact",
    ]) {
      expect(runbook).toContain(required);
    }
    expect(runbook).toContain("Activation is prohibited while any row is blocked or unassigned");
    expect(runbook).toContain("Never drop the tables or bucket");
    expect(runbook).toContain("already-paid buyers retain retrieval");
  });
});

describe("deal_comps service-role write boundary", () => {
  it("removes direct authenticated writes while preserving owner reads", () => {
    expect(compsMigration).toContain("NOT APPLIED / SURFACED FOR REVIEW");
    expect(compsMigration).toContain("alter table public.deal_comps force row level security");
    for (const policy of [
      "deal_comps_insert_own",
      "deal_comps_update_own",
      "deal_comps_delete_own",
    ]) {
      expect(compsMigration).toContain(
        `drop policy if exists \"${policy}\" on public.deal_comps`
      );
      expect(compsMigration).not.toContain(`create policy \"${policy}\"`);
    }
    expect(compsMigration).toContain("to authenticated\n  using (auth.uid() = user_id)");
    expect(compsMigration).toContain(
      "revoke all on table public.deal_comps from public, anon, authenticated, service_role"
    );
    expect(compsMigration).toContain(
      "grant select on table public.deal_comps to authenticated"
    );
    expect(compsMigration).toContain(
      "grant select, insert, update on table public.deal_comps to service_role"
    );
    expect(compsMigration).not.toContain(
      "grant select, insert, update, delete on table public.deal_comps"
    );
  });

  it("does not recommend reopening the old write policies as rollback", () => {
    expect(compsMigration).toContain("The safe operational rollback");
    expect(compsMigration).toContain("Do not blindly restore");
    expect(runbook).toContain("do not restore the permissive policies");
  });

  it("binds each comp row to the owner of its parent saved analysis", () => {
    expect(compsOwnerBindingMigration).toContain("deal_comps_owned_analysis_fk");
    expect(compsOwnerBindingMigration).toContain("foreign key (analysis_id, user_id)");
    expect(compsOwnerBindingMigration).toContain(
      "references public.saved_analyses(id, user_id)",
    );
    expect(compsOwnerBindingMigration).toContain(
      "dc.user_id is distinct from sa.user_id",
    );
    expect(compsOwnerBindingMigration).toContain(
      "Do not reassign untrusted payloads across tenants.",
    );
  });
});

describe("public-share retention boundary", () => {
  it("adds no implicit purge or invented retention duration", () => {
    expect(shareRetentionMigration).toContain("NOT APPLIED / SURFACED FOR REVIEW");
    expect(shareRetentionMigration).toContain("does not delete a row when applied");
    expect(shareRetentionMigration).toContain("p_grace interval");
    expect(shareRetentionMigration).not.toMatch(/p_grace interval\s+default/i);
    expect(shareRetentionMigration).not.toMatch(/interval '\d+ (?:day|days|hour|hours)'/i);
    expect(shareRetentionMigration).not.toMatch(
      /select\s+public\.purge_expired_or_revoked_public_shares/i
    );
    expect(normalizedRunbook).toContain("chooses no retention duration");
    expect(runbook).toContain("must not be a browser parameter or silent code default");
  });

  it("can purge only expired or revoked rows beyond an explicit grace in bounded batches", () => {
    expect(shareRetentionMigration).toContain("cutoff := clock_timestamp() - p_grace");
    expect(shareRetentionMigration).toContain("s.expires_at <= cutoff");
    expect(shareRetentionMigration).toContain("s.revoked_at <= cutoff");
    expect(shareRetentionMigration).toContain("p_batch_limit > 1000");
    expect(shareRetentionMigration).toContain("limit p_batch_limit");
    expect(shareRetentionMigration).toContain("for update skip locked");
    expect(shareRetentionMigration).toContain("returns integer");
  });

  it("exposes the destructive function only to service role and documents recovery", () => {
    expect(shareRetentionMigration).toContain("security definer");
    expect(shareRetentionMigration).toContain(
      "from public, anon, authenticated, service_role"
    );
    expect(shareRetentionMigration).toContain(
      "grant execute on function public.purge_expired_or_revoked_public_shares(interval, integer)"
    );
    expect(shareRetentionMigration).toContain("to service_role");
    expect(shareRetentionMigration).toContain("cannot restore deleted rows");
    expect(runbook).toContain("Deletion is irreversible outside backup recovery");
  });
});
