/**
 * scripts/schedule-daily-campaign.ts
 *
 * One-shot script: reads 30 daily content files from
 * /emails/daily-campaign-content/day-01.json … day-30.json, renders
 * each to clean inline-styled HTML + plain text, and creates a Resend
 * broadcast for each one scheduled to send on its `send_date` at
 * 13:00 UTC (9am ET).
 *
 * Why a one-shot (vs. a daily cron):
 *   Pre-scheduling all 30 broadcasts in Resend at creation time means
 *   zero ongoing failure points. No cron to misfire. No filesystem
 *   read at send time. No daily API jitters. Resend owns delivery.
 *   We can walk away and let the campaign run.
 *
 * Why 13:00 UTC = 9am ET send time:
 *   Peak B2B email open rate consistently lands in the 9–10am local
 *   window. 13:00 UTC = 9am EDT in DST (June is fully in DST), which
 *   is also 6am PDT — early but acceptable for a coast-to-coast US
 *   list. The weekly-digest script uses the same time, so the audience
 *   already trains on it.
 *
 * Why inline styles (no <style> tags):
 *   Many major email clients (Gmail web is the worst offender) strip
 *   or sandbox <style> blocks. Inline CSS on every element is the only
 *   way to guarantee styling renders. We pay the verbosity tax once
 *   in the renderer and never think about it again.
 *
 * Why the 30-day Resend cap matters here (the close call):
 *   Resend's Broadcasts API rejects `scheduled_at` more than 30 days
 *   from now. This campaign runs June 1 → June 30 (30 sends). If you
 *   run this script on May 31, June 30 is *exactly* 30 days out — it
 *   just fits. If you run it on June 1 or later, the last day(s) will
 *   fail with "scheduled_at too far in future". The script logs each
 *   failure and continues — re-run later (e.g., June 2) and the new
 *   ones will then fit. Idempotency makes re-runs safe.
 *
 * Required env vars (loaded from .env.local / .env via the same
 * inline loader the sibling script uses):
 *
 *   RESEND_API_KEY=re_...
 *   RESEND_AUDIENCE_ID=2ea9dd69-...
 *   EMAIL_FROM="TrueCap <hello@usetruecap.com>"   (optional)
 *   EMAIL_REPLY_TO=hello@usetruecap.com           (optional)
 *
 * Flags:
 *   --dry-run         Build everything in memory + log subjects/dates.
 *                     No API calls. Safe to run anytime.
 *   --start-day N     Start at day N (inclusive). Default 1.
 *   --end-day N       Stop at day N (inclusive). Default 30.
 *
 * Idempotency:
 *   Before creating each broadcast we list existing broadcasts and
 *   check for an exact name match: `Daily campaign · Day N · YYYY-MM-DD`.
 *   If found, skip. So you can re-run this script as many times as you
 *   want — it will only create missing broadcasts.
 */

import { promises as fs, readFileSync, existsSync } from "node:fs";
import path from "node:path";

// ─────────────────────────────────────────────────────────
// .env loading — same tiny inline loader as schedule-all-broadcasts.ts.
// Avoids a dotenv dependency and matches Next.js's load order.
// ─────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────
const CONTENT_DIR = path.join(
  process.cwd(),
  "emails",
  "daily-campaign-content"
);
const FROM_ADDRESS = process.env.EMAIL_FROM ?? "TrueCap <hello@usetruecap.com>";
const REPLY_TO = process.env.EMAIL_REPLY_TO ?? "hello@usetruecap.com";

// 13:00 UTC = 9am EDT in June. See file header for the rationale.
const SEND_HOUR_UTC = 13;
const SEND_MINUTE_UTC = 0;

const TOTAL_DAYS = 30;

// Brand colors — keep in sync with the rest of TrueCap's marketing surface.
const COLORS = {
  bg: "#FAFBFE",
  card: "#FFFFFF",
  text: "#0F121E",
  muted: "#5B6478",
  border: "#E6E8F0",
  primary: "#5248D4",
  primaryText: "#FFFFFF",
};

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
export type DailyContent = {
  day: number;
  send_date: string; // YYYY-MM-DD
  subject: string;
  preheader: string;
  headline: string;
  body: string[];
  cta_text: string;
  cta_url: string;
  signature_note: string | null;
};

type Args = {
  dryRun: boolean;
  startDay: number;
  endDay: number;
};

// ─────────────────────────────────────────────────────────
// CLI args
// ─────────────────────────────────────────────────────────
function parseArgs(): Args {
  const args = process.argv.slice(2);
  const startArg = args.find((a) => a.startsWith("--start-day="));
  const endArg = args.find((a) => a.startsWith("--end-day="));
  // Also allow `--start-day N` (space-separated) for ergonomics.
  const idxStart = args.indexOf("--start-day");
  const idxEnd = args.indexOf("--end-day");
  const startVal = startArg
    ? Number(startArg.slice("--start-day=".length))
    : idxStart >= 0
      ? Number(args[idxStart + 1])
      : 1;
  const endVal = endArg
    ? Number(endArg.slice("--end-day=".length))
    : idxEnd >= 0
      ? Number(args[idxEnd + 1])
      : TOTAL_DAYS;
  return {
    dryRun: args.includes("--dry-run"),
    startDay: Number.isFinite(startVal) ? startVal : 1,
    endDay: Number.isFinite(endVal) ? endVal : TOTAL_DAYS,
  };
}

// ─────────────────────────────────────────────────────────
// Content loading
// ─────────────────────────────────────────────────────────
async function loadContent(day: number): Promise<DailyContent> {
  const filename = `day-${String(day).padStart(2, "0")}.json`;
  const raw = await fs.readFile(path.join(CONTENT_DIR, filename), "utf8");
  return JSON.parse(raw) as DailyContent;
}

// ─────────────────────────────────────────────────────────
// scheduled_at builder
// "2026-06-15" + 13:00 UTC → "2026-06-15T13:00:00Z"
// ─────────────────────────────────────────────────────────
function scheduledAtFor(sendDate: string): string {
  return `${sendDate}T${String(SEND_HOUR_UTC).padStart(2, "0")}:${String(
    SEND_MINUTE_UTC
  ).padStart(2, "0")}:00Z`;
}

// ─────────────────────────────────────────────────────────
// HTML escaping — applied to every dynamic field. Email content is
// authored by us, but defensive escaping is cheap and prevents the
// "oops we put an unescaped & in a subject and broke 30 sends" class
// of bug.
// ─────────────────────────────────────────────────────────
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─────────────────────────────────────────────────────────
// HTML renderer
//
// Why a string template (not React Email):
//   This script is a one-shot. We don't need component reuse. A plain
//   template string is faster to scan, has no JSX/TSX transform step
//   when running under tsx, and produces exactly the bytes we want
//   without a renderer in the middle deciding what to inline.
//
//   The trade-off: more verbose. Worth it for a 30-email batch.
// ─────────────────────────────────────────────────────────
export function renderHtml(content: DailyContent): string {
  // Eyebrow shows the TrueCap wordmark only — no "Day N of 30" framing.
  // These emails are evergreen value+sell, not a serial campaign.
  // The eyebrow remains because removing it entirely makes the headline
  // feel like it's floating; a brand wordmark gives subscribers a
  // 1-line "where this is from" anchor without implying a sequence.
  const eyebrow = `TRUECAP · usetruecap.com`;

  const bodyHtml = content.body
    .map(
      (p) =>
        `<p style="margin:0 0 18px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:${COLORS.text};">${escapeHtml(p)}</p>`
    )
    .join("\n");

  const psHtml = content.signature_note
    ? `<p style="margin:24px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:${COLORS.muted};font-style:italic;">PS — ${escapeHtml(content.signature_note)}</p>`
    : "";

  // {{{RESEND_UNSUBSCRIBE_URL}}} is Resend's per-recipient
  // substitution placeholder. They swap it for each contact's unique
  // unsubscribe link at send time. We leave it raw (NOT escaped — the
  // triple-brace placeholder must reach Resend intact).
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(content.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.bg};-webkit-font-smoothing:antialiased;">
  <!-- Hidden preheader (preview text in Gmail/Apple Mail). The trailing
       &zwnj; + &nbsp; pad pushes the email's actual body content out of
       the preview so Gmail doesn't show the first paragraph after the
       preheader. -->
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${COLORS.bg};opacity:0;">
    ${escapeHtml(content.preheader)}
    &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <!-- Outer table for max compatibility with Outlook + old clients. -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${COLORS.bg};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="580" style="max-width:580px;width:100%;background-color:${COLORS.card};border:1px solid ${COLORS.border};border-radius:12px;">
          <tr>
            <td style="padding:32px 32px 8px 32px;">
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;letter-spacing:0.04em;text-transform:uppercase;color:${COLORS.muted};margin-bottom:24px;">
                ${escapeHtml(eyebrow)}
              </div>
              <h1 style="margin:0 0 24px 0;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1.25;font-weight:700;color:${COLORS.text};">
                ${escapeHtml(content.headline)}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 8px 32px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 8px 32px;" align="left">
              <!-- Bulletproof button: anchor + table wrapper. Renders
                   consistently in Outlook, Gmail, and Apple Mail. -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td bgcolor="${COLORS.primary}" style="border-radius:8px;">
                    <a href="${escapeHtml(content.cta_url)}"
                       style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;line-height:1;color:${COLORS.primaryText};text-decoration:none;border-radius:8px;background-color:${COLORS.primary};">
                      ${escapeHtml(content.cta_text)}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${
            psHtml
              ? `<tr><td style="padding:0 32px 24px 32px;">${psHtml}</td></tr>`
              : `<tr><td style="padding:0 32px 16px 32px;"></td></tr>`
          }
          <tr>
            <td style="padding:24px 32px 32px 32px;border-top:1px solid ${COLORS.border};">
              <p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:${COLORS.muted};">
                TrueCap &middot; Underwrite any rental in 60 seconds
              </p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${COLORS.muted};">
                <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:${COLORS.muted};text-decoration:underline;">Unsubscribe</a>
                &nbsp;&middot;&nbsp;
                <a href="https://usetruecap.com" style="color:${COLORS.muted};text-decoration:underline;">usetruecap.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────
// Plain-text renderer
//
// Why a plain-text alt: spam filters lower the spam score for messages
// with both parts, and accessibility tools prefer the text part.
// Resend accepts a `text` field on the broadcast payload.
// ─────────────────────────────────────────────────────────
export function renderText(content: DailyContent): string {
  // Match HTML eyebrow — evergreen framing, no day-of-N.
  const eyebrow = `TRUECAP — usetruecap.com`;
  const bodyText = content.body.join("\n\n");
  const cta = `${content.cta_text}: ${content.cta_url}`;
  const ps = content.signature_note ? `\n\nPS — ${content.signature_note}` : "";
  const footer = [
    "",
    "—",
    "TrueCap · Underwrite any rental in 60 seconds",
    "Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}",
    "https://usetruecap.com",
  ].join("\n");

  return [
    eyebrow,
    "",
    content.headline,
    "",
    bodyText,
    "",
    cta,
    ps,
    footer,
  ]
    .join("\n")
    .trim() + "\n";
}

// ─────────────────────────────────────────────────────────
// Resend helpers
// ─────────────────────────────────────────────────────────
type ResendBroadcastSummary = {
  id: string;
  name: string;
  status: string;
};

async function fetchExistingBroadcasts(
  apiKey: string
): Promise<ResendBroadcastSummary[]> {
  const res = await fetch("https://api.resend.com/broadcasts", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const body = (await res.json().catch(() => ({}))) as {
    data?: ResendBroadcastSummary[];
    message?: string;
  };
  if (!res.ok) {
    throw new Error(
      `Failed to list broadcasts (${res.status}): ${body.message ?? "unknown"}`
    );
  }
  return body.data ?? [];
}

async function createScheduledBroadcast(opts: {
  apiKey: string;
  audienceId: string;
  name: string;
  subject: string;
  html: string;
  text: string;
  scheduledAt: string;
}): Promise<{ ok: boolean; broadcastId?: string; error?: string }> {
  // One-shot create with scheduled_at in the body. Resend's Broadcasts
  // API accepts `scheduled_at` directly at create time — no separate
  // /send call needed when you're scheduling for the future. (The
  // weekly-cron does create-then-send because it sends immediately;
  // that's a different flow.)
  const res = await fetch("https://api.resend.com/broadcasts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      audience_id: opts.audienceId,
      from: FROM_ADDRESS,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      name: opts.name,
      reply_to: REPLY_TO,
      scheduled_at: opts.scheduledAt,
      // Required by Resend's API when scheduled_at is set: without
      // send=true, the broadcast is created as a draft and Resend
      // returns 422 "you need to mark it as ready to send by setting
      // the `send` field to `true`". Setting it here commits the
      // schedule in a single API call.
      send: true,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
  };
  if (!res.ok || !body.id) {
    return {
      ok: false,
      error: `Create failed (${res.status}): ${body.message ?? "unknown"}`,
    };
  }
  return { ok: true, broadcastId: body.id };
}

// ─────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────
async function main() {
  const { dryRun, startDay, endDay } = parseArgs();

  if (startDay < 1 || endDay > TOTAL_DAYS || startDay > endDay) {
    console.error(
      `Invalid day range: --start-day=${startDay} --end-day=${endDay}. ` +
        `Must satisfy 1 ≤ start ≤ end ≤ ${TOTAL_DAYS}.`
    );
    process.exit(1);
  }

  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;

  if (!dryRun) {
    if (!apiKey) {
      console.error(
        "Missing RESEND_API_KEY env var (.env.local or .env). Aborting."
      );
      process.exit(1);
    }
    if (!audienceId) {
      console.error(
        "Missing RESEND_AUDIENCE_ID env var (.env.local or .env). Aborting."
      );
      process.exit(1);
    }
  }

  console.log("");
  console.log("Daily campaign · schedule plan");
  console.log("──────────────────────────────");
  console.log(`Range:   day ${startDay} → day ${endDay}`);
  console.log(`Mode:    ${dryRun ? "DRY RUN (no API calls)" : "LIVE"}`);
  console.log(`From:    ${FROM_ADDRESS}`);
  console.log(`ReplyTo: ${REPLY_TO}`);
  console.log("");

  // Pull existing broadcasts ONCE up front for idempotency. Cheaper
  // than N round trips, and Resend's broadcast list is bounded (~few
  // hundred even for active senders).
  let existingNames = new Set<string>();
  if (!dryRun) {
    try {
      const existing = await fetchExistingBroadcasts(apiKey!);
      existingNames = new Set(existing.map((b) => b.name));
      console.log(
        `Found ${existing.length} existing broadcasts in Resend (will skip name-matches).`
      );
      console.log("");
    } catch (error) {
      console.error(
        `Could not list existing broadcasts: ${error instanceof Error ? error.message : String(error)}`
      );
      console.error("Aborting to avoid creating duplicates.");
      process.exit(1);
    }
  }

  let scheduled = 0;
  let skipped = 0;
  let failed = 0;

  // Sequential by design. Resend rate-limits, and broadcast creation
  // is not perf-critical — 30 sequential creates with 250ms gaps is
  // ~7s total. Trading throughput for clean logs.
  for (let day = startDay; day <= endDay; day += 1) {
    let content: DailyContent;
    try {
      content = await loadContent(day);
    } catch (error) {
      console.error(
        `[day ${day}] [err] Could not load content: ${error instanceof Error ? error.message : String(error)}`
      );
      failed += 1;
      continue;
    }

    // Sanity: filename day should match the day field in the JSON.
    if (content.day !== day) {
      console.warn(
        `[day ${day}] [warn] JSON has day=${content.day}, filename is day-${String(day).padStart(2, "0")}.json — using filename day.`
      );
    }

    const scheduledAt = scheduledAtFor(content.send_date);
    const name = `Daily campaign · Day ${day} · ${content.send_date}`;

    // Dry run: render in memory + log. No network calls.
    if (dryRun) {
      const html = renderHtml(content);
      const text = renderText(content);
      console.log(
        `[day ${String(day).padStart(2, "0")}] [dry] scheduled_at=${scheduledAt}  subj="${content.subject}"  html_bytes=${html.length}  text_bytes=${text.length}`
      );
      scheduled += 1;
      continue;
    }

    // Idempotency check: skip if a broadcast with this exact name
    // already exists. Matches schedule-all-broadcasts.ts pattern.
    if (existingNames.has(name)) {
      console.log(
        `[day ${String(day).padStart(2, "0")}] [skip] "${name}" already exists in Resend.`
      );
      skipped += 1;
      continue;
    }

    const html = renderHtml(content);
    const text = renderText(content);

    try {
      const result = await createScheduledBroadcast({
        apiKey: apiKey!,
        audienceId: audienceId!,
        name,
        subject: content.subject,
        html,
        text,
        scheduledAt,
      });
      if (result.ok) {
        console.log(
          `[day ${String(day).padStart(2, "0")}] [ok]  id=${result.broadcastId}  scheduled_at=${scheduledAt}  subj="${content.subject}"`
        );
        scheduled += 1;
        // Update our local set so a future run within the same process
        // sees the new broadcast (defensive — shouldn't matter for a
        // single linear loop, but cheap).
        existingNames.add(name);
      } else {
        // Resend's "scheduled_at too far in future" error lands here.
        // We log + continue so the rest of the batch still goes through.
        console.error(
          `[day ${String(day).padStart(2, "0")}] [err] ${result.error}`
        );
        failed += 1;
      }
    } catch (error) {
      console.error(
        `[day ${String(day).padStart(2, "0")}] [err] ${error instanceof Error ? error.message : String(error)}`
      );
      failed += 1;
    }

    // Small inter-request delay. Be polite to Resend.
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log("");
  console.log("Summary");
  console.log("───────");
  console.log(`Scheduled: ${scheduled}`);
  console.log(`Skipped:   ${skipped}  (already existed)`);
  console.log(`Failed:    ${failed}`);
  console.log("");
  if (failed > 0 && !dryRun) {
    console.log(
      "Some broadcasts failed. If the cause is the 30-day Resend cap,"
    );
    console.log(
      "re-run this script in a day or two — the later days will fit then."
    );
    process.exit(1);
  }
}

// Only auto-run main() when this script is executed directly, NOT when
// it's imported (e.g. by preview-daily-campaign.ts which reuses the
// renderHtml/renderText helpers). Without this guard, importing the
// renderer for preview would also trigger a real Resend schedule call.
const isDirectRun =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("schedule-daily-campaign.ts");

if (isDirectRun) {
  main().catch((error) => {
    console.error("Fatal:", error);
    process.exit(1);
  });
}
