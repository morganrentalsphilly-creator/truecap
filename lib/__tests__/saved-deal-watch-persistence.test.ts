import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

const migration = read("supabase/migrations/20260815140000_saved_deal_watch.sql");
const actions = read("app/actions/saved-deal-watch.ts");
const card = read("components/investcalc/saved-deal-watch-card.tsx");
const workspace = read("app/dashboard/saved-analyses/[id]/page.tsx");

describe("Saved Deal Watch migration security", () => {
  it("creates the complete dormant data plane without a sender or scheduler", () => {
    for (const table of [
      "saved_deal_watch_subscriptions",
      "saved_deal_watch_preferences",
      "saved_deal_watch_checkpoints",
      "saved_deal_watch_provider_state",
      "saved_deal_watch_events",
      "saved_deal_watch_outbox",
    ]) {
      expect(migration).toContain(`create table if not exists public.${table}`);
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
    expect(migration).not.toMatch(/create\s+(?:or\s+replace\s+)?(?:trigger|function)[\s\S]{0,100}(?:send_email|resend|deliver_notification)/i);
    expect(migration).not.toMatch(/cron\.schedule|pg_cron/i);
  });

  it("proves tenant ownership through composite foreign keys", () => {
    expect(migration).toContain("references public.saved_analyses(id, user_id)");
    expect(migration.match(/references public\.saved_deal_watch_subscriptions\(id, user_id\)/g))
      .toHaveLength(3);
    expect(migration).toContain(
      "references public.saved_deal_watch_events(id, watch_id, user_id)"
    );
  });

  it("allows users to mutate only opt-in and preference rows", () => {
    for (const table of ["subscriptions", "preferences"]) {
      expect(migration).toContain(`saved_deal_watch_${table}_insert_own`);
      expect(migration).toContain(`saved_deal_watch_${table}_update_own`);
      expect(migration).toContain(`saved_deal_watch_${table}_delete_own`);
    }
    for (const table of ["checkpoints", "events", "outbox"]) {
      expect(migration).toContain(`saved_deal_watch_${table}_select_own`);
      expect(migration).not.toContain(`saved_deal_watch_${table}_insert_own`);
      expect(migration).not.toContain(`saved_deal_watch_${table}_update_own`);
      expect(migration).not.toContain(`saved_deal_watch_${table}_delete_own`);
    }
    expect(migration).not.toContain(
      'create policy "saved_deal_watch_provider_state_select_own"'
    );
    expect(migration).toContain("lock_saved_deal_watch_service_fields_for_users");
    expect(migration).toContain("new.provider_id := old.provider_id");
    expect(migration).toContain("new.saved_analysis_id := old.saved_analysis_id");
  });

  it("dedupes events and can only create consented, held outbox rows", () => {
    expect(migration).toContain("unique (dedupe_key)");
    expect(migration).toContain("delivery_state text not null default 'held'");
    expect(migration).toContain("check (consent_granted = true)");
    expect(migration).toMatch(/email_notifications_enabled\s*=\s*true/);
    expect(migration).toMatch(/in_app_notifications_enabled\s*=\s*true/);
    expect(migration.match(/'held', true/g)?.length).toBe(2);
  });

  it("limits the atomic persistence hook to service_role and rejects stale checkpoints", () => {
    expect(migration).toContain("public.record_saved_deal_watch_evaluation");
    expect(migration).toMatch(/security definer[\s\S]*set search_path = public, pg_temp/);
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
    expect(migration).toContain(
      "where excluded.observed_at >= public.saved_deal_watch_checkpoints.observed_at"
    );
  });

  it("keeps Watch email consent separate and false by default", () => {
    expect(migration).toContain("email_notifications_enabled boolean not null default false");
    expect(migration).toContain("in_app_notifications_enabled boolean not null default false");
    expect(migration).not.toContain("rate_alert_emails");
    expect(migration).not.toContain("marketing_emails");
  });
});

describe("Saved Deal Watch server-action boundaries", () => {
  it("fails every read/write path closed behind the feature flag", () => {
    expect(actions).toContain('isFeatureEnabled("saved_deal_watch")');
    expect(actions.match(/const disabled = featureDisabled\(\)/g)).toHaveLength(3);
  });

  it("uses cookie auth, plan entitlements, and an explicit owned-deal check", () => {
    expect(actions).toContain("createServerSupabaseClient");
    expect(actions).toContain("supabase.auth.getUser()");
    expect(actions).toContain('hasPlanFeature(entitlements, "save_deal")');
    expect(actions).toContain("hasPaidPlanSubscription(supabase, user.id)");
    expect(actions).toContain("requireOwnedDeal");
    expect(actions.match(/\.eq\("user_id", userId\)/g)?.length).toBeGreaterThanOrEqual(4);
    expect(actions).not.toContain("createAdminSupabaseClient");
  });

  it("keeps downgrade revocation open while denying new or loosened consent", () => {
    expect(actions).toContain("canEnableWatch:");
    expect(actions).toContain(
      "if (parsed.data.enabled && !auth.canEnableWatch)",
    );
    expect(actions).toContain("parsed.data.enabled,");
    expect(actions).toContain('.update({ enabled: false })');
    expect(actions).toContain("const loosensConsent = loosensSavedDealWatchConsent(");
    expect(actions).toContain("if (loosensConsent && !auth.canEnableWatch)");
    expect(actions).toContain("loosensConsent,");
    expect(actions).toContain("A downgraded account with no retained row");
  });

  it("never lets a persisted opt-in claim that operations are live", () => {
    expect(actions).toContain("automaticChecksActive: false");
    expect(actions).toContain("notificationsActive: false");
  });
});

describe("Saved Deal Watch workspace UI truthfulness", () => {
  it("is feature-gated while retained downgrade consent remains revocable", () => {
    expect(workspace).toMatch(
      /isFeatureEnabled\("saved_deal_watch"\)[\s\S]{0,120}<SavedDealWatchCard/
    );
    expect(workspace).not.toMatch(
      /isFeatureEnabled\("saved_deal_watch"\) && isPremium/
    );
    expect(card).toContain("!settings.canEnable && !settings.hasStoredConfiguration");
    expect(card).toContain("!settings.canEnable && !settings.subscriptionEnabled");
    expect(card).toContain("!settings.canEnable && !settings.inAppNotificationsEnabled");
    expect(card).toContain("!settings.canEnable && !settings.emailNotificationsEnabled");
    expect(card).toContain("Any retained opt-in or");
  });

  it("states that no listing monitoring or delivery is active", () => {
    expect(card).toContain("Automatic monitoring is not active");
    expect(card).toContain("TrueCap is not checking listing sites");
    expect(card).toContain("neither is configured in this release");
    expect(card).toContain("Saving either preference sends nothing today");
  });

  it("records separate future email consent and analytics only after enable succeeds", () => {
    expect(card).toContain("This consent is separate from rate");
    expect(card).toContain("every deal I save to Watch");
    const successBranch = card.indexOf("if (next)");
    const analytics = card.indexOf('trackEvent("saved_deal_watch_enabled"');
    expect(successBranch).toBeGreaterThan(-1);
    expect(analytics).toBeGreaterThan(successBranch);
    expect(card).toContain("trigger_count: 4");
  });
});
