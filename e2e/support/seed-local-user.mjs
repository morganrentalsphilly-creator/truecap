import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const REQUIRED_PRO_FEATURES = [
  "save_deal",
  "dashboard_access",
  "dashboard_insights",
  "compare_deals",
  "exit_scenarios",
  "pdf_export",
];

export function resolveLocalSeedEnvironment(environment) {
  if (environment.PLAYWRIGHT_AUTH_TEST_ENVIRONMENT !== "isolated") {
    throw new Error(
      "Local E2E seeding requires the isolated test-environment guard.",
    );
  }

  const rawUrl = environment.E2E_SUPABASE_URL?.trim();
  const serviceRoleKey = environment.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const email = environment.PLAYWRIGHT_AUTH_EMAIL?.trim().toLowerCase();
  const password = environment.PLAYWRIGHT_AUTH_PASSWORD;
  if (!rawUrl || !serviceRoleKey || !email || !password) {
    throw new Error(
      "Local E2E seeding is missing its URL, service key, email, or password.",
    );
  }

  const url = new URL(rawUrl);
  if (
    url.protocol !== "http:" ||
    !LOOPBACK_HOSTS.has(url.hostname) ||
    url.port !== "54321" ||
    url.pathname !== "/"
  ) {
    throw new Error(
      "Local E2E seeding is blocked unless Supabase is loopback HTTP on port 54321.",
    );
  }
  if (!email.endsWith(".invalid")) {
    throw new Error(
      "Local E2E seeding requires a non-deliverable .invalid email address.",
    );
  }
  if (password.length < 20) {
    throw new Error(
      "Local E2E seeding requires a generated password of at least 20 characters.",
    );
  }

  return {
    url: url.toString().replace(/\/$/, ""),
    serviceRoleKey,
    email,
    password,
  };
}

function featuresFromEntitlements(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Array.isArray(value.features)
    ? value.features.filter((feature) => typeof feature === "string")
    : [];
}

export async function seedLocalAuthenticatedUser(environment = process.env) {
  const resolved = resolveLocalSeedEnvironment(environment);
  const admin = createClient(resolved.url, resolved.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email: resolved.email,
      password: resolved.password,
      email_confirm: true,
    });
  if (createError || !created.user) {
    throw new Error(
      `Could not create the isolated auth user: ${createError?.message ?? "no user returned"}`,
    );
  }
  if (!created.user.email_confirmed_at) {
    throw new Error("The isolated auth user was not email-confirmed.");
  }

  const { data: plan, error: planError } = await admin
    .from("plans")
    .select("id, entitlements")
    .eq("slug", "pro_monthly")
    .single();
  if (planError || !plan) {
    throw new Error(
      `Could not resolve the local Pro plan: ${planError?.message ?? "plan missing"}`,
    );
  }
  const features = new Set(featuresFromEntitlements(plan.entitlements));
  const missingFeatures = REQUIRED_PRO_FEATURES.filter(
    (feature) => !features.has(feature),
  );
  if (missingFeatures.length > 0) {
    throw new Error(
      `Local Pro seed is missing required features: ${missingFeatures.join(", ")}`,
    );
  }

  const periodStart = new Date();
  const periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000);
  const { error: subscriptionError } = await admin
    .from("subscriptions")
    .insert({
      user_id: created.user.id,
      plan_id: plan.id,
      status: "active",
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: false,
    });
  if (subscriptionError) {
    throw new Error(
      `Could not grant isolated Pro access: ${subscriptionError.message}`,
    );
  }

  // 2026-09 audit: a second, FREE account (no subscription row) so the
  // authenticated browser gate can prove free-tier gating as well as Pro
  // access. Same disposable password; email derived from the Pro one.
  const freeEmail = freeEmailFor(resolved.email);
  const { data: createdFree, error: createFreeError } =
    await admin.auth.admin.createUser({
      email: freeEmail,
      password: resolved.password,
      email_confirm: true,
    });
  if (createFreeError || !createdFree.user) {
    throw new Error(
      `Could not create the isolated FREE auth user: ${createFreeError?.message ?? "no user returned"}`,
    );
  }

  // The DB trigger from migration 20260827090000 opens a 21-day no-card
  // evaluation for every new account. The FREE fixture must represent life
  // AFTER that evaluation, so expire it; the Pro fixture keeps its row (a paid
  // subscription outranks it). A missing row means the migration did not
  // apply — fail loudly rather than test the wrong tier.
  // The table enforces a window check on (started_at, expires_at), so move
  // both bounds into the past as one consistent 21-day evaluation.
  const DAY = 24 * 60 * 60 * 1000;
  const expiredStart = new Date(periodStart.getTime() - 30 * DAY).toISOString();
  const expiredAt = new Date(periodStart.getTime() - 9 * DAY).toISOString();
  const { data: expired, error: expireError } = await admin
    .from("product_evaluations")
    .update({ started_at: expiredStart, expires_at: expiredAt })
    .eq("user_id", createdFree.user.id)
    .select("user_id");
  if (expireError) {
    throw new Error(`Could not expire the FREE fixture's evaluation: ${expireError.message}`);
  }
  if (!expired || expired.length !== 1) {
    throw new Error(
      "The FREE fixture has no product_evaluations row: the no-card evaluation trigger (20260827090000) is not applied.",
    );
  }

  return { userId: created.user.id, freeUserId: createdFree.user.id };
}

/** internal-e2e@x.invalid → internal-e2e-free@x.invalid */
export function freeEmailFor(email) {
  const at = email.indexOf("@");
  if (at <= 0) throw new Error("Cannot derive the free account email.");
  return `${email.slice(0, at)}-free${email.slice(at)}`;
}

const executedPath = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : null;
if (executedPath === import.meta.url) {
  seedLocalAuthenticatedUser()
    .then(() => {
      console.log("Seeded the isolated authenticated browser account.");
    })
    .catch((error) => {
      console.error(
        error instanceof Error ? error.message : "Local E2E seed failed.",
      );
      process.exitCode = 1;
    });
}
