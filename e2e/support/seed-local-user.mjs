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

  return { userId: created.user.id };
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
