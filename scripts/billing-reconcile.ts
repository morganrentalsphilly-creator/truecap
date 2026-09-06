/**
 * scripts/billing-reconcile.ts — Stripe ↔ user binding reconcile, from a shell.
 *
 *   NODE_OPTIONS=--conditions=react-server npx -y tsx scripts/billing-reconcile.ts            # dry run (default)
 *   NODE_OPTIONS=--conditions=react-server npx -y tsx scripts/billing-reconcile.ts --apply    # bind + backfill
 *
 * `--conditions=react-server` is required: the sync code carries
 * `import "server-only"`, whose package resolves to an empty module under the
 * react-server export condition and throws under plain Node.
 *
 * Needs a real environment (`.env.local` or exported): STRIPE_SECRET_KEY,
 * NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_PRICE_* — the
 * same set the webhook uses. Dry run writes NOTHING. `--apply` runs the same
 * code path as the webhook (upsertSubscriptionFromStripe) for every
 * resolvable subscription and records the unresolvable ones in
 * billing_unresolved_events. Output is a counts-only JSON summary.
 *
 * The production cron at app/api/cron/billing-reconcile/route.ts runs this
 * same core daily inside Vercel (BILLING_RECONCILE_MODE, default dry).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function loadEnvFile(file: string): void {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvFile(path.join(ROOT, ".env.local"));
loadEnvFile(path.join(ROOT, ".env"));

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const apply = args.has("--apply");
  const capArg = [...args].find((a) => a.startsWith("--cap="));
  const listCap = capArg ? Number(capArg.slice("--cap=".length)) : undefined;

  for (const key of ["STRIPE_SECRET_KEY", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
    if (!process.env[key]) {
      console.error(`[billing-reconcile] ${key} is not set — aborting before any call.`);
      process.exitCode = 2;
      return;
    }
  }

  // Dynamic imports so the env check above runs before server-only modules load.
  const [{ getStripe }, { createAdminSupabaseClient }, { runBillingReconcile }] =
    await Promise.all([
      import("@/lib/stripe/client"),
      import("@/lib/supabase/admin"),
      import("@/lib/billing/reconcile"),
    ]);

  const summary = await runBillingReconcile({
    stripe: getStripe(),
    admin: createAdminSupabaseClient(),
    mode: apply ? "apply" : "dry",
    listCap: Number.isFinite(listCap) ? listCap : undefined,
    log: (line) => console.error(line),
  });
  console.log(JSON.stringify(summary, null, 2));
  if (summary.errors > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`[billing-reconcile] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
