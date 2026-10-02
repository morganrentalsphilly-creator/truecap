/**
 * Organic sign-ups by landing section → public.seo_conversions_daily.
 *
 * PRIVATE numbers. The repository and its Actions logs are public, so the
 * counts go only to seo_conversions_daily (service role only), which only
 * /admin/seo reads. Founder decision (2026-09-27): "Counts go only to
 * /admin/seo, never the public digest." Under GitHub Actions
 * (GITHUB_ACTIONS=true) the script prints no count at all. Run locally it
 * prints counts only: never an email, a user id or any other user field.
 *
 * Counted: auth users created in the last --days UTC days (today included)
 *   - whose email is confirmed, or who signed up with Google;
 *   - who are not listed in public.demo_accounts;
 *   - whose app_metadata.tc_first_touch (saved at sign-up from the
 *     consent-gated tc_ft cookie, lib/first-touch.ts) has an organic source:
 *     organic_search or organic_ai.
 * An account without a first touch (no cookie consent) is counted nowhere.
 *
 * Rows: one per (sign-up date, section), with event_name 'signup_completed',
 * landing_page the section's root path ('/blog'; '/' for home; '(other)'),
 * page_type the section, topic_cluster 'organic' and conversions the count.
 * The whole window is recomputed on every run. A (date, section) row already
 * in the window that no longer has a count (an account deleted, a demo account
 * listed) is set to 0, so re-runs converge; /admin/seo shows rows above 0.
 *
 * Usage:
 *   node seo/scripts/signups.ts [--days 35] [--dry-run]
 *
 *   --days <n>   window in UTC days, today included (default 35, max 400)
 *   --dry-run    read and count, write nothing
 *
 * Env: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.
 * Both are required; without them the script exits 1 before any request.
 */

import type { Args } from "./lib/cli.ts";
import { check, flagNumber, hasFlag, log, runMain } from "./lib/cli.ts";

// ── Mirrors of lib/first-touch.ts (plain node cannot import the app's
// modules; lib/__tests__/seo-signups.test.ts fails if these drift) ──────

export const FIRST_TOUCH_SOURCES: readonly string[] = [
  "direct",
  "organic_search",
  "organic_ai",
  "organic_social",
  "paid_search",
  "paid_social",
  "email",
  "external_referral",
  "campaign",
];
export const ORGANIC_SOURCES: readonly string[] = ["organic_search", "organic_ai"];
export const LANDING_SECTIONS: readonly string[] = ["home", "blog", "tools", "markets", "states", "glossary", "vs", "pricing", "analyze", "for_agents", "for_investors", "other"];

/** landing_page for each section's rows: its root path ("(other)" is not a path). */
export const SECTION_ROOTS: Readonly<Record<string, string>> = {
  home: "/",
  blog: "/blog",
  tools: "/tools",
  markets: "/markets",
  states: "/states",
  glossary: "/glossary",
  vs: "/vs",
  pricing: "/pricing",
  analyze: "/analyze",
  for_agents: "/for-agents",
  for_investors: "/for-investors",
  other: "(other)",
};

export const EVENT_NAME = "signup_completed";
export const TOPIC_CLUSTER = "organic";
const DEFAULT_DAYS = 35;
const MAX_DAYS = 400;
const USERS_PER_PAGE = 1000;
const MAX_USER_PAGES = 100;
const UPSERT_BATCH = 500;
const CALL_TIMEOUT_MS = 30_000;
const DAY_MS = 86_400_000;

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
export type Supabase = { base: string; key: string; fetch: FetchLike };
export type Window = { start: string; end: string; days: number };
export type ConversionRow = {
  date: string;
  landing_page: string;
  page_type: string;
  topic_cluster: string;
  event_name: string;
  conversions: number;
};
export type SkipReason = "invalid" | "outside_window" | "unconfirmed" | "demo" | "no_first_touch" | "not_organic";
export type Classified = { status: "counted"; date: string; section: string } | { status: "skipped"; reason: SkipReason };

type JsonRecord = Record<string, unknown>;
const isRecord = (value: unknown): value is JsonRecord => typeof value === "object" && value !== null && !Array.isArray(value);
const SOURCE_SET = new Set(FIRST_TOUCH_SOURCES);
const ORGANIC_SET = new Set(ORGANIC_SOURCES);
const SECTION_SET = new Set(LANDING_SECTIONS);

// ── Pure helpers ───────────────────────────────────────────────────

export function utcDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** The last `days` UTC calendar days, today included. */
export function windowFor(days: number, nowMs: number): Window {
  return { start: utcDate(nowMs - (days - 1) * DAY_MS), end: utcDate(nowMs), days };
}

function signedUpWithGoogle(appMetadata: JsonRecord): boolean {
  if (appMetadata.provider === "google") return true;
  return Array.isArray(appMetadata.providers) && appMetadata.providers.includes("google");
}

/**
 * Decide whether one auth user record counts, and under which (date, section).
 * Reads only created_at, email_confirmed_at, is_anonymous, id (for the demo
 * list) and app_metadata; nothing about the user is returned.
 */
export function classifyUser(user: unknown, ctx: { window: Window; demoIds: ReadonlySet<string> }): Classified {
  if (!isRecord(user) || typeof user.id !== "string" || typeof user.created_at !== "string") return { status: "skipped", reason: "invalid" };
  const createdMs = Date.parse(user.created_at);
  if (!Number.isFinite(createdMs)) return { status: "skipped", reason: "invalid" };
  const date = utcDate(createdMs);
  if (date < ctx.window.start || date > ctx.window.end) return { status: "skipped", reason: "outside_window" };
  if (user.is_anonymous === true) return { status: "skipped", reason: "unconfirmed" };
  const appMetadata = isRecord(user.app_metadata) ? user.app_metadata : {};
  const confirmed = (typeof user.email_confirmed_at === "string" && user.email_confirmed_at !== "") || signedUpWithGoogle(appMetadata);
  if (!confirmed) return { status: "skipped", reason: "unconfirmed" };
  if (ctx.demoIds.has(user.id)) return { status: "skipped", reason: "demo" };
  const firstTouch = appMetadata.tc_first_touch;
  if (!isRecord(firstTouch) || firstTouch.v !== 1) return { status: "skipped", reason: "no_first_touch" };
  const { source, section } = firstTouch;
  if (typeof source !== "string" || !SOURCE_SET.has(source)) return { status: "skipped", reason: "no_first_touch" };
  if (typeof section !== "string" || !SECTION_SET.has(section)) return { status: "skipped", reason: "no_first_touch" };
  if (!ORGANIC_SET.has(source)) return { status: "skipped", reason: "not_organic" };
  return { status: "counted", date, section };
}

/** One row per (date, section), sorted by date then section. */
export function groupSignups(entries: ReadonlyArray<{ date: string; section: string }>): ConversionRow[] {
  const counts = new Map<string, number>();
  for (const { date, section } of entries) {
    if (!SECTION_SET.has(section)) continue;
    const key = `${date}|${section}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, conversions]) => {
      const [date, section] = key.split("|");
      return { date, landing_page: SECTION_ROOTS[section], page_type: section, topic_cluster: TOPIC_CLUSTER, event_name: EVENT_NAME, conversions };
    })
    .sort((a, b) => (a.date === b.date ? a.page_type.localeCompare(b.page_type) : a.date.localeCompare(b.date)));
}

/**
 * The rows to upsert: every fresh count, plus a 0 for each row already stored
 * in the window whose (date, landing_page) has no count any more.
 */
export function reconcileRows(
  counted: readonly ConversionRow[],
  existing: ReadonlyArray<{ date?: unknown; landing_page?: unknown; page_type?: unknown }>,
): { rows: ConversionRow[]; zeroed: number } {
  const keys = new Set(counted.map((row) => `${row.date}|${row.landing_page}`));
  const zeros: ConversionRow[] = [];
  for (const row of existing) {
    if (typeof row.date !== "string" || typeof row.landing_page !== "string") continue;
    const key = `${row.date}|${row.landing_page}`;
    if (keys.has(key)) continue;
    keys.add(key);
    zeros.push({
      date: row.date,
      landing_page: row.landing_page,
      page_type: typeof row.page_type === "string" ? row.page_type : "unknown",
      topic_cluster: TOPIC_CLUSTER,
      event_name: EVENT_NAME,
      conversions: 0,
    });
  }
  return { rows: [...counted, ...zeros], zeroed: zeros.length };
}

export type Summary = {
  window: Window;
  scanned: number;
  counted: number;
  skipped: Record<SkipReason, number>;
  bySection: Record<string, number>;
  rows: number;
  zeroed: number;
  dryRun: boolean;
};

/** What the run prints. Redacted (Actions logs are public): no count at all. */
export function summaryLines(summary: Summary, options: { redact: boolean }): string[] {
  const window = `${summary.window.start}..${summary.window.end} (${summary.window.days} UTC days)`;
  if (options.redact) {
    return [
      `signups: window ${window}`,
      summary.dryRun
        ? "signups: dry run, nothing written; counts are not printed on a public runner"
        : "signups: counts written to seo_conversions_daily (private; see /admin/seo); not printed on a public runner",
    ];
  }
  const skipped = Object.entries(summary.skipped)
    .filter(([, n]) => n > 0)
    .map(([reason, n]) => `${n} ${reason.replace(/_/g, " ")}`)
    .join(", ");
  const sections = Object.entries(summary.bySection)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([section, n]) => `${section} ${n}`)
    .join(", ");
  return [
    `signups: window ${window}`,
    `signups: scanned ${summary.scanned} accounts; counted ${summary.counted} organic${skipped ? ` (skipped: ${skipped})` : ""}`,
    `signups: organic by section: ${sections || "none"}`,
    summary.dryRun
      ? `signups: dry run, would upsert ${summary.rows} row(s) (${summary.zeroed} set to 0); nothing written`
      : `signups: upserted ${summary.rows} row(s) (${summary.zeroed} set to 0)`,
  ];
}

// ── Supabase REST (service role) ───────────────────────────────────

/** A short PostgREST/Auth error code, never the message (it can echo data). */
async function errorCode(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (isRecord(body)) {
      const code = body.code ?? body.error_code;
      if (typeof code === "string" && /^[A-Za-z0-9_]{1,40}$/.test(code)) return `, ${code}`;
    }
  } catch {
    /* not JSON */
  }
  return "";
}

async function request(sb: Supabase, pathAndQuery: string, label: string, init: RequestInit = {}): Promise<Response> {
  const response = await sb.fetch(`${sb.base}${pathAndQuery}`, {
    ...init,
    headers: { apikey: sb.key, authorization: `Bearer ${sb.key}`, ...(init.headers as Record<string, string> | undefined) },
    signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`${label} failed (HTTP ${response.status}${await errorCode(response)})`);
  }
  return response;
}

/** Every auth user, all or nothing: a truncated list would undercount silently. */
export async function listAuthUsers(sb: Supabase): Promise<unknown[]> {
  const users: unknown[] = [];
  for (let page = 1; page <= MAX_USER_PAGES; page += 1) {
    const response = await request(sb, `/auth/v1/admin/users?page=${page}&per_page=${USERS_PER_PAGE}`, "auth admin user list");
    if (!response.ok) throw new Error(`auth admin user list failed (HTTP ${response.status})`);
    const body: unknown = await response.json();
    const batch = Array.isArray(body) ? body : isRecord(body) && Array.isArray(body.users) ? body.users : null;
    if (!batch) throw new Error("auth admin user list returned an unexpected shape");
    users.push(...batch);
    if (batch.length < USERS_PER_PAGE) return users;
  }
  throw new Error(`more than ${MAX_USER_PAGES * USERS_PER_PAGE} accounts; raise MAX_USER_PAGES before counting`);
}

/**
 * public.demo_accounts user ids. A missing table (404: the testimonials
 * migration is not applied) lists no demo account, which is exactly what the
 * exclusion list says; any other failure stops the run.
 */
export async function listDemoAccountIds(sb: Supabase): Promise<Set<string>> {
  const response = await request(sb, "/rest/v1/demo_accounts?select=user_id", "demo_accounts read");
  if (response.status === 404) {
    log("signups: public.demo_accounts not found; no account is excluded as a demo");
    return new Set();
  }
  const body: unknown = await response.json();
  if (!Array.isArray(body)) throw new Error("demo_accounts read returned an unexpected shape");
  return new Set(body.flatMap((row) => (isRecord(row) && typeof row.user_id === "string" ? [row.user_id] : [])));
}

export async function listStoredRows(sb: Supabase, window: Window): Promise<JsonRecord[]> {
  const query = new URLSearchParams({ select: "date,landing_page,page_type", event_name: `eq.${EVENT_NAME}`, topic_cluster: `eq.${TOPIC_CLUSTER}` });
  query.append("date", `gte.${window.start}`);
  query.append("date", `lte.${window.end}`);
  const response = await request(sb, `/rest/v1/seo_conversions_daily?${query}`, "seo_conversions_daily read");
  if (!response.ok) throw new Error(`seo_conversions_daily read failed (HTTP ${response.status})`);
  const body: unknown = await response.json();
  if (!Array.isArray(body)) throw new Error("seo_conversions_daily read returned an unexpected shape");
  return body.filter(isRecord);
}

export async function upsertRows(sb: Supabase, rows: readonly ConversionRow[]): Promise<void> {
  for (let index = 0; index < rows.length; index += UPSERT_BATCH) {
    const response = await request(sb, "/rest/v1/seo_conversions_daily?on_conflict=date,landing_page,event_name", "seo_conversions_daily upsert", {
      method: "POST",
      headers: { "content-type": "application/json", prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(rows.slice(index, index + UPSERT_BATCH)),
    });
    if (!response.ok) throw new Error(`seo_conversions_daily upsert failed (HTTP ${response.status})`);
  }
}

export async function runSignups(input: { sb: Supabase; days: number; nowMs: number; dryRun: boolean }): Promise<Summary> {
  const window = windowFor(input.days, input.nowMs);
  const [users, demoIds, stored] = await Promise.all([listAuthUsers(input.sb), listDemoAccountIds(input.sb), listStoredRows(input.sb, window)]);
  const skipped: Record<SkipReason, number> = { invalid: 0, outside_window: 0, unconfirmed: 0, demo: 0, no_first_touch: 0, not_organic: 0 };
  const counted: Array<{ date: string; section: string }> = [];
  const bySection: Record<string, number> = {};
  for (const user of users) {
    const result = classifyUser(user, { window, demoIds });
    if (result.status === "skipped") {
      skipped[result.reason] += 1;
      continue;
    }
    counted.push({ date: result.date, section: result.section });
    bySection[result.section] = (bySection[result.section] ?? 0) + 1;
  }
  const { rows, zeroed } = reconcileRows(groupSignups(counted), stored);
  if (!input.dryRun && rows.length) await upsertRows(input.sb, rows);
  return { window, scanned: users.length, counted: counted.length, skipped, bySection, rows: rows.length, zeroed, dryRun: input.dryRun };
}

// ── CLI ────────────────────────────────────────────────────────────

async function main(args: Args): Promise<number> {
  const days = flagNumber(args, "days", DEFAULT_DAYS);
  if (!Number.isInteger(days) || days < 1 || days > MAX_DAYS) throw new Error(`--days must be an integer from 1 to ${MAX_DAYS}`);
  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!base || !key) throw new Error("needs SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY");
  let protocol = "";
  try {
    protocol = new URL(base).protocol;
  } catch {
    protocol = "";
  }
  if (protocol !== "https:" && protocol !== "http:") throw new Error("SUPABASE_URL is not an http(s) URL");
  const summary = await runSignups({ sb: { base, key, fetch }, days, nowMs: Date.now(), dryRun: hasFlag(args, "dry-run") });
  for (const line of summaryLines(summary, { redact: process.env.GITHUB_ACTIONS === "true" })) console.log(line);
  return 0;
}

async function selfTest(): Promise<void> {
  const now = Date.parse("2026-09-27T15:00:00.000Z");
  const window = windowFor(35, now);
  check(window.start === "2026-08-24" && window.end === "2026-09-27", "35-day window includes today");
  const demoIds = new Set(["demo-1"]);
  const ctx = { window, demoIds };
  const user = (over: JsonRecord): JsonRecord => ({
    id: "u",
    created_at: "2026-09-20T23:59:59Z",
    email_confirmed_at: "2026-09-21T00:01:00Z",
    app_metadata: { provider: "email", tc_first_touch: { source: "organic_search", section: "blog", v: 1 } },
    ...over,
  });
  const counted = classifyUser(user({}), ctx);
  check(counted.status === "counted" && counted.date === "2026-09-20" && counted.section === "blog", "confirmed organic sign-up counted on its UTC date");
  check(classifyUser(user({ email_confirmed_at: null }), ctx).status === "skipped", "unconfirmed email not counted");
  const google = classifyUser(user({ email_confirmed_at: null, app_metadata: { provider: "google", tc_first_touch: { source: "organic_ai", section: "tools", v: 1 } } }), ctx);
  check(google.status === "counted" && google.section === "tools", "Google sign-up counts without email_confirmed_at");
  const reason = (u: unknown): string => {
    const r = classifyUser(u, ctx);
    return r.status === "skipped" ? r.reason : "counted";
  };
  check(reason(user({ id: "demo-1" })) === "demo", "demo account excluded");
  check(reason(user({ created_at: "2026-08-23T23:00:00Z" })) === "outside_window", "before the window");
  check(reason(user({ app_metadata: { provider: "email" } })) === "no_first_touch", "no first touch");
  check(reason(user({ app_metadata: { tc_first_touch: { source: "paid_search", section: "home", v: 1 } } })) === "not_organic", "paid is not organic");
  check(reason(user({ app_metadata: { tc_first_touch: { source: "organic_search", section: "/blog/x", v: 1 } } })) === "no_first_touch", "a raw path is never a section");
  check(reason(user({ app_metadata: { tc_first_touch: { source: "organic_search", section: "blog", v: 2 } } })) === "no_first_touch", "unknown version ignored");
  check(reason(user({ is_anonymous: true })) === "unconfirmed", "anonymous users never count");
  check(reason("not a user") === "invalid", "garbage is invalid");

  const rows = groupSignups([
    { date: "2026-09-02", section: "home" },
    { date: "2026-09-01", section: "blog" },
    { date: "2026-09-01", section: "blog" },
    { date: "2026-09-01", section: "not-a-section" },
  ]);
  check(rows.length === 2, "grouped by (date, section), unknown sections dropped");
  check(rows[0].date === "2026-09-01" && rows[0].landing_page === "/blog" && rows[0].conversions === 2 && rows[0].page_type === "blog", "blog rows summed under /blog");
  check(rows[1].landing_page === "/" && rows[1].topic_cluster === "organic" && rows[1].event_name === "signup_completed", "home is /");

  const reconciled = reconcileRows(rows, [{ date: "2026-09-01", landing_page: "/blog", page_type: "blog" }, { date: "2026-09-03", landing_page: "/tools", page_type: "tools" }]);
  check(reconciled.rows.length === 3 && reconciled.zeroed === 1 && reconciled.rows[2].conversions === 0 && reconciled.rows[2].landing_page === "/tools", "a stored row with no count any more is set to 0");

  const summary: Summary = { window, scanned: 9_871, counted: 7_654, skipped: { invalid: 0, outside_window: 5_432, unconfirmed: 0, demo: 0, no_first_touch: 0, not_organic: 0 }, bySection: { blog: 3_210 }, rows: 1, zeroed: 0, dryRun: false };
  const redacted = summaryLines(summary, { redact: true }).join("\n");
  check(!/9871|7654|5432|3210/.test(redacted), "no count on a public runner");
  check(summaryLines(summary, { redact: false }).join("\n").includes("blog 3210"), "counts printed locally");

  // Dry run against an in-memory stub: reads happen, no POST is sent. No network.
  const methods: string[] = [];
  const stub: FetchLike = async (url, init) => {
    methods.push(`${init?.method ?? "GET"} ${new URL(url).pathname}`);
    const path = new URL(url).pathname;
    const body = path.endsWith("/admin/users") ? { users: [user({})] } : path.endsWith("/demo_accounts") ? [] : [];
    return new Response(JSON.stringify(body), { status: 200 });
  };
  const dry = await runSignups({ sb: { base: "https://example.invalid", key: "k", fetch: stub }, days: 35, nowMs: now, dryRun: true });
  check(dry.counted === 1 && dry.rows === 1 && !methods.some((m) => m.startsWith("POST")), "--dry-run writes nothing");
}

/** Every flag this script reads (lib/cli.ts rejects any other). */
export const CLI_FLAGS: readonly string[] = ["days", "dry-run"];

runMain(import.meta.url, main, selfTest, { flags: CLI_FLAGS });
