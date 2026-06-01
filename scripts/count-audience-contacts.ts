/**
 * scripts/count-audience-contacts.ts
 *
 * Lists every Resend audience in your account with its name, ID, AND
 * contact count. Solves the "which audience has subscribers" question
 * that `list-audiences` (name + ID only) can't answer.
 *
 * Why this exists:
 *   The daily-campaign scheduler fails with 422 "audience has no
 *   contacts" if RESEND_AUDIENCE_ID points at an empty audience. With
 *   7+ audiences in the account and no count column in the basic list
 *   view, the user had to click each audience in the Resend dashboard
 *   to find the populated one. This script answers it in one call.
 *
 * Usage:
 *   npm run count-audiences
 *
 * Required env vars:
 *   RESEND_API_KEY (loaded from .env.local / .env)
 *
 * Sample output:
 *   Audience                        Contacts   ID
 *   ────────────────────────────    ────────   ──────────────────────────────
 *   General                              247   2ea9dd69-b80d-4dbc-959d-780e9ea08f41
 *   First 200 Agents                     198   bb906ada-24ac-4e31-8d82-e02d6fbeb711
 *   all contacts                           0   43233377-6e3b-48a1-99ee-190c54515dcc
 *   ...
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ─────────────────────────────────────────────────────────
// Minimal .env / .env.local loader (no dotenv dep).
// Same pattern as schedule-all-broadcasts.ts so behavior matches.
// ─────────────────────────────────────────────────────────
function loadEnvFile(file: string): void {
  if (!fs.existsSync(file)) return;
  const raw = fs.readFileSync(file, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // Strip optional surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
loadEnvFile(path.join(ROOT, ".env.local"));
loadEnvFile(path.join(ROOT, ".env"));

// ─────────────────────────────────────────────────────────

type ResendAudience = {
  id: string;
  name: string;
  created_at: string;
};

type ResendContact = {
  id: string;
  email: string;
  unsubscribed?: boolean;
};

async function listAudiences(apiKey: string): Promise<ResendAudience[]> {
  const res = await fetch("https://api.resend.com/audiences", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const body = (await res.json().catch(() => ({}))) as {
    data?: ResendAudience[];
    message?: string;
  };
  if (!res.ok) {
    throw new Error(
      `Failed to list audiences (${res.status}): ${body.message ?? "unknown"}`
    );
  }
  return body.data ?? [];
}

async function countContacts(
  apiKey: string,
  audienceId: string
): Promise<{ total: number; subscribed: number }> {
  // Resend's /audiences/{id}/contacts returns up to ~1000 contacts per
  // call. Most TrueCap audiences will be well under that. If you scale
  // past 1000 per audience, add pagination via the `?after=` cursor.
  const res = await fetch(
    `https://api.resend.com/audiences/${audienceId}/contacts`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );
  const body = (await res.json().catch(() => ({}))) as {
    data?: ResendContact[];
    message?: string;
  };
  if (!res.ok) {
    // Don't throw — log + return 0 so a single broken audience doesn't
    // hide counts for the others.
    console.warn(
      `   (failed to fetch contacts for ${audienceId}: ${body.message ?? res.status})`
    );
    return { total: 0, subscribed: 0 };
  }
  const contacts = body.data ?? [];
  const subscribed = contacts.filter((c) => !c.unsubscribed).length;
  return { total: contacts.length, subscribed };
}

async function main(): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(
      "Missing RESEND_API_KEY env var (.env.local or .env). Aborting."
    );
    process.exit(1);
  }

  const currentAudienceId = (process.env.RESEND_AUDIENCE_ID ?? "").trim();

  console.log("");
  console.log("Resend audiences — with contact counts");
  console.log("──────────────────────────────────────────");
  console.log("");

  let audiences: ResendAudience[];
  try {
    audiences = await listAudiences(apiKey);
  } catch (error) {
    console.error(
      `Could not list audiences: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }

  if (audiences.length === 0) {
    console.log("No audiences found in this Resend account.");
    return;
  }

  // Fetch all counts in parallel — 7-15 small requests, no rate-limit risk.
  const counts = await Promise.all(
    audiences.map((a) => countContacts(apiKey, a.id))
  );

  // Sort by subscribed count descending so the largest populated audience
  // is at the top — usually what you want for picking a target.
  const rows = audiences
    .map((a, i) => ({
      audience: a,
      subscribed: counts[i].subscribed,
      total: counts[i].total,
      isCurrent: a.id === currentAudienceId,
    }))
    .sort((a, b) => b.subscribed - a.subscribed);

  // Pretty-print as a small table.
  const nameWidth = Math.max(20, ...rows.map((r) => r.audience.name.length));
  const header =
    "  " +
    "Name".padEnd(nameWidth) +
    "  " +
    "Subscribed".padStart(10) +
    "  " +
    "Total".padStart(7) +
    "  " +
    "ID";
  console.log(header);
  console.log("  " + "─".repeat(nameWidth) + "  ──────────  ───────  " + "─".repeat(36));

  for (const r of rows) {
    const star = r.isCurrent ? "★ " : "  ";
    const name = r.audience.name.padEnd(nameWidth);
    const sub = String(r.subscribed).padStart(10);
    const tot = String(r.total).padStart(7);
    const id = r.audience.id;
    console.log(`${star}${name}  ${sub}  ${tot}  ${id}`);
  }

  console.log("");
  console.log("★ = currently set as RESEND_AUDIENCE_ID");
  console.log("");
  console.log(
    "To use a different audience, edit .env.local and set:"
  );
  console.log("  RESEND_AUDIENCE_ID=<paste id from the column above>");
  console.log("");
  console.log(
    "Then re-run: npm run schedule-daily-campaign"
  );
  console.log("");
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});
