/**
 * scripts/schedule-all-broadcasts.ts
 *
 * One-time script: reads every content file in /emails/content/, creates
 * a Resend broadcast for each, and schedules it to send on the date in
 * its filename at 13:00 UTC (9am ET).
 *
 * Why this exists: Vercel cron + filesystem read + Resend API at the
 * moment of fire = three failure points every Tuesday. Pre-scheduling
 * everything in Resend right now = zero failure points going forward.
 * Resend handles delivery on the dates. We walk away.
 *
 * Run once, locally:
 *
 *   npx tsx scripts/schedule-all-broadcasts.ts
 *
 * Required env vars (load with dotenv or paste inline):
 *
 *   RESEND_API_KEY=re_...
 *   RESEND_AUDIENCE_ID=2ea9dd69-...
 *   EMAIL_FROM="TrueCap <hello@usetruecap.com>"   (optional)
 *   EMAIL_REPLY_TO=hello@usetruecap.com           (optional)
 *
 * Flags:
 *
 *   --dry-run    Print what would be scheduled. No API calls.
 *   --from=DATE  Only schedule broadcasts on/after DATE (YYYY-MM-DD).
 *                Useful if you've already manually sent earlier ones.
 *
 * Idempotency: this script does NOT track which broadcasts it has
 * already scheduled. If you run it twice with the same content files,
 * you'll create duplicate scheduled broadcasts. Use --from to skip
 * already-scheduled dates, or delete duplicates in the Resend UI.
 */

import { promises as fs, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { render } from "@react-email/render";
import WeeklyDigestEmail, {
  type WeeklyDigestContent,
} from "../emails/weekly-digest";

/**
 * Tiny inline .env loader — no dotenv dependency required.
 * Reads .env.local then .env (in that priority order, matching Next.js
 * behavior). Only sets vars that aren't already in process.env so
 * command-line overrides still win.
 *
 * Why this exists: running the script with `RESEND_API_KEY=... npm run`
 * is error-prone (zsh swallows quoted-string accidents, restricted keys
 * get pasted by mistake, etc). Loading from .env.local — the same file
 * your app already uses — means the script works with no inline env vars.
 */
function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip surrounding quotes if present.
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
loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));

const CONTENT_DIR = path.join(process.cwd(), "emails", "content");
const FROM_ADDRESS = process.env.EMAIL_FROM ?? "TrueCap <hello@usetruecap.com>";
const REPLY_TO = process.env.EMAIL_REPLY_TO ?? "hello@usetruecap.com";

// 13:00 UTC = 9am ET (8am ET during EST). Matches the cron schedule
// (0 11 * * 2) was previously 11:00 UTC — bumping to 13:00 UTC puts
// the send at 9am ET year-round (close enough; DST shift is one hour).
// Adjust here if you want a different send time.
const SEND_HOUR_UTC = 13;
const SEND_MINUTE_UTC = 0;

/**
 * Resend's Broadcasts API rejects scheduled_at beyond this window. As
 * of 2026, the limit is 30 days. We use 28 to leave a safety buffer
 * for timezone math + clock drift.
 */
const MAX_SCHEDULE_DAYS_OUT = 28;

type Args = {
  dryRun: boolean;
  fromDate: string | null;
  listAudiences: boolean;
  cleanupDrafts: boolean;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const fromArg = args.find((a) => a.startsWith("--from="));
  return {
    dryRun: args.includes("--dry-run"),
    fromDate: fromArg ? fromArg.slice("--from=".length) : null,
    listAudiences: args.includes("--list-audiences"),
    cleanupDrafts: args.includes("--cleanup-drafts"),
  };
}

/**
 * Delete any unscheduled broadcasts whose name starts with "Weekly
 * digest · ". Used to clean up orphan drafts created when the schedule
 * step failed (typically due to the 30-day limit).
 *
 * Defensive: only deletes broadcasts in `draft` status. Never touches
 * scheduled or sent broadcasts. Safe to re-run.
 */
async function cleanupOrphanDrafts(apiKey: string) {
  const listRes = await fetch("https://api.resend.com/broadcasts", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const listBody = (await listRes.json().catch(() => ({}))) as {
    data?: Array<{ id: string; name: string; status: string }>;
    message?: string;
  };
  if (!listRes.ok) {
    console.error(
      `Failed to list broadcasts (${listRes.status}): ${listBody.message ?? "unknown"}`
    );
    process.exit(1);
  }
  const drafts = (listBody.data ?? []).filter(
    (b) =>
      b.status === "draft" &&
      typeof b.name === "string" &&
      b.name.startsWith("Weekly digest · ")
  );
  if (drafts.length === 0) {
    console.log("No orphan drafts found. Nothing to clean up.");
    return;
  }
  console.log(`Found ${drafts.length} orphan weekly-digest drafts:`);
  for (const d of drafts) {
    console.log(`  - ${d.name} (${d.id})`);
  }
  console.log("");
  console.log("Deleting...");
  let deleted = 0;
  let failed = 0;
  for (const d of drafts) {
    const delRes = await fetch(
      `https://api.resend.com/broadcasts/${encodeURIComponent(d.id)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    );
    if (delRes.ok) {
      console.log(`  [ok] deleted ${d.name}`);
      deleted += 1;
    } else {
      const body = (await delRes.json().catch(() => ({}))) as { message?: string };
      console.error(`  [err] ${d.name}: ${body.message ?? delRes.status}`);
      failed += 1;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("");
  console.log(`Done. Deleted: ${deleted}. Failed: ${failed}.`);
}

/**
 * Hit Resend's /audiences endpoint and print each audience's ID +
 * name. Used to find RESEND_AUDIENCE_ID for the .env.local file.
 */
async function listAudiences(apiKey: string) {
  const res = await fetch("https://api.resend.com/audiences", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const body = (await res.json().catch(() => ({}))) as {
    data?: Array<{ id: string; name: string; created_at?: string }>;
    message?: string;
  };
  if (!res.ok) {
    console.error(
      `Failed to list audiences (${res.status}): ${body.message ?? "unknown error"}`
    );
    console.error("");
    console.error("Most likely cause: your RESEND_API_KEY is wrong or doesn't");
    console.error("have Full Access permission. Verify at:");
    console.error("  https://resend.com/api-keys");
    process.exit(1);
  }
  const audiences = body.data ?? [];
  if (audiences.length === 0) {
    console.log("No audiences found in this Resend account.");
    return;
  }
  console.log("");
  console.log("Your Resend audiences");
  console.log("─────────────────────");
  for (const a of audiences) {
    console.log(`  Name: ${a.name}`);
    console.log(`  ID:   ${a.id}`);
    if (a.created_at) console.log(`  Created: ${a.created_at}`);
    console.log("");
  }
  console.log("Paste the ID of the one you want into .env.local:");
  console.log("  RESEND_AUDIENCE_ID=<paste here>");
}

async function listContentFiles(): Promise<string[]> {
  const files = await fs.readdir(CONTENT_DIR);
  return files
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
}

async function loadContent(date: string): Promise<WeeklyDigestContent> {
  const raw = await fs.readFile(path.join(CONTENT_DIR, `${date}.json`), "utf8");
  return JSON.parse(raw) as WeeklyDigestContent;
}

/**
 * Build the scheduled_at ISO string for a content date.
 * Example: "2026-06-02" → "2026-06-02T13:00:00Z"
 */
function scheduledAtFor(date: string): string {
  return `${date}T${String(SEND_HOUR_UTC).padStart(2, "0")}:${String(
    SEND_MINUTE_UTC
  ).padStart(2, "0")}:00Z`;
}

async function renderForBroadcast(content: WeeklyDigestContent) {
  // {{{RESEND_UNSUBSCRIBE_URL}}} is Resend's per-recipient substitution
  // — Resend auto-replaces this with each contact's unique unsubscribe
  // link when the broadcast fires.
  const element = WeeklyDigestEmail({
    content,
    unsubscribeUrl: "{{{RESEND_UNSUBSCRIBE_URL}}}",
    senderAddress: process.env.EMAIL_SENDER_ADDRESS,
  });
  const html = await render(element);
  const text = await render(element, { plainText: true });
  return { html, text };
}

type ResendBroadcastCreate = {
  id?: string;
  message?: string;
};

async function createAndScheduleBroadcast(opts: {
  apiKey: string;
  audienceId: string;
  date: string;
  subject: string;
  html: string;
  text: string;
  scheduledAt: string;
}): Promise<{ ok: boolean; broadcastId?: string; error?: string }> {
  const { apiKey, audienceId, date, subject, html, text, scheduledAt } = opts;

  // Step 1: create the broadcast
  const createRes = await fetch("https://api.resend.com/broadcasts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      audience_id: audienceId,
      from: FROM_ADDRESS,
      subject,
      html,
      text,
      name: `Weekly digest · ${date}`,
      reply_to: REPLY_TO,
    }),
  });
  const createBody = (await createRes
    .json()
    .catch(() => ({}))) as ResendBroadcastCreate;
  if (!createRes.ok || !createBody.id) {
    return {
      ok: false,
      error: `Create failed (${createRes.status}): ${createBody.message ?? "unknown"}`,
    };
  }

  // Step 2: schedule the send with scheduled_at
  const sendRes = await fetch(
    `https://api.resend.com/broadcasts/${encodeURIComponent(createBody.id)}/send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ scheduled_at: scheduledAt }),
    }
  );
  const sendBody = (await sendRes.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
  };
  if (!sendRes.ok) {
    return {
      ok: false,
      broadcastId: createBody.id,
      error: `Schedule failed (${sendRes.status}): ${sendBody.message ?? "unknown"}`,
    };
  }

  return { ok: true, broadcastId: createBody.id };
}

async function main() {
  const {
    dryRun,
    fromDate,
    listAudiences: shouldListAudiences,
    cleanupDrafts: shouldCleanupDrafts,
  } = parseArgs();

  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;

  // --list-audiences short-circuits everything else.
  if (shouldListAudiences) {
    if (!apiKey) {
      console.error("Missing RESEND_API_KEY in .env.local. Aborting.");
      process.exit(1);
    }
    await listAudiences(apiKey);
    return;
  }

  // --cleanup-drafts also short-circuits.
  if (shouldCleanupDrafts) {
    if (!apiKey) {
      console.error("Missing RESEND_API_KEY in .env.local. Aborting.");
      process.exit(1);
    }
    await cleanupOrphanDrafts(apiKey);
    return;
  }

  if (!dryRun) {
    if (!apiKey) {
      console.error("Missing RESEND_API_KEY env var. Aborting.");
      process.exit(1);
    }
    if (!audienceId) {
      console.error("Missing RESEND_AUDIENCE_ID env var. Aborting.");
      process.exit(1);
    }
  }

  const dates = await listContentFiles();
  const filtered = fromDate ? dates.filter((d) => d >= fromDate) : dates;

  // Drop any dates in the past — Resend rejects scheduled_at in the
  // past. If you want to send those, send them manually via the UI.
  const now = new Date();
  const future = filtered.filter((d) => {
    const scheduled = new Date(scheduledAtFor(d));
    return scheduled.getTime() > now.getTime();
  });

  // Resend's Broadcasts API rejects scheduled_at beyond MAX_SCHEDULE_DAYS_OUT
  // (currently 28 days). Split future-dated content into "schedulable now"
  // and "too far out" so we don't create orphan drafts.
  const cutoffMs = now.getTime() + MAX_SCHEDULE_DAYS_OUT * 24 * 60 * 60 * 1000;
  const schedulable: string[] = [];
  const tooFarOut: string[] = [];
  for (const d of future) {
    const scheduled = new Date(scheduledAtFor(d));
    if (scheduled.getTime() <= cutoffMs) {
      schedulable.push(d);
    } else {
      tooFarOut.push(d);
    }
  }

  const skippedPast = filtered.length - future.length;

  console.log(`\nSchedule plan`);
  console.log(`─────────────`);
  console.log(`Content files found:      ${dates.length}`);
  console.log(`After --from filter:      ${filtered.length}`);
  console.log(`Future-dated:             ${future.length}`);
  console.log(`Past-dated (skipped):     ${skippedPast}`);
  console.log(`Within ${MAX_SCHEDULE_DAYS_OUT}-day Resend window:  ${schedulable.length}`);
  console.log(`Beyond ${MAX_SCHEDULE_DAYS_OUT}-day window (skip): ${tooFarOut.length}`);
  console.log(`Mode:                     ${dryRun ? "DRY RUN" : "LIVE"}`);
  if (tooFarOut.length > 0) {
    console.log("");
    console.log(`Resend blocks scheduled_at beyond ${MAX_SCHEDULE_DAYS_OUT} days.`);
    console.log(`Re-run this script periodically (or via Vercel cron) to`);
    console.log(`top up as more content dates come into the window.`);
    console.log(`Beyond-window dates that will be skipped:`);
    for (const d of tooFarOut) console.log(`  - ${d}`);
  }
  console.log("");

  if (schedulable.length === 0) {
    console.log("Nothing to schedule right now. Exiting.");
    return;
  }

  // Re-bind the variable name used below so existing logic continues.
  const future_ = schedulable;

  let succeeded = 0;
  let failed = 0;

  for (const date of future_) {
    const scheduledAt = scheduledAtFor(date);
    try {
      const content = await loadContent(date);
      const subject = content.subject;

      if (dryRun) {
        console.log(`[dry] ${date}  scheduled_at=${scheduledAt}  subj="${subject}"`);
        succeeded += 1;
        continue;
      }

      const { html, text } = await renderForBroadcast(content);
      const result = await createAndScheduleBroadcast({
        apiKey: apiKey!,
        audienceId: audienceId!,
        date,
        subject,
        html,
        text,
        scheduledAt,
      });

      if (result.ok) {
        console.log(
          `[ok] ${date}  id=${result.broadcastId}  scheduled_at=${scheduledAt}`
        );
        succeeded += 1;
      } else {
        console.error(`[err] ${date}  ${result.error}`);
        failed += 1;
      }
    } catch (error) {
      console.error(
        `[err] ${date}  ${error instanceof Error ? error.message : String(error)}`
      );
      failed += 1;
    }

    // Small delay between API calls to be polite to Resend.
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log("");
  console.log(`Done. Succeeded: ${succeeded}. Failed: ${failed}.`);
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});
