/**
 * The SEO loop's weekly report. Writes two files:
 *   - seo/reports/<year>-W<week>.md, the full record, kept on the seo-state
 *     branch;
 *   - seo/data/digest-<date>.md, a shorter body (at most 60,000 characters)
 *     that the report job posts as the run's one comment on the digest issue.
 *
 * Sections, in the brief's order: the headline (clicks, impressions and the
 * indexed count against last week, plus the sign-ups line); every change made
 * this run; what was skipped and why; both brakes; this run's holdout; next
 * week's top 10 candidates; the skills with no work ("needs X, current Y");
 * the manual Request-indexing list; and the run's turns and cost when given.
 *
 * Load-bearing constraints:
 *   - Sign-up COUNTS never appear. The repo and the state branch are public,
 *     so the founder decided (plan Q3) that the report only ever says
 *     SIGNUPS_LINE. Nothing in this file reads a sign-up number, so none can
 *     leak.
 *   - Most of the text is untrusted: paths and details derived from GSC, the
 *     model's manifest (summaries and skip reasons), and the critic's reasons.
 *     Both outputs pass through sanitizeForGithub(). After it, that text
 *     cannot mention a user, cross-reference or close an issue, or put raw
 *     HTML or an image (a tracking pixel) into a public comment. Table cells
 *     and list items are also flattened to one line, so the text cannot open
 *     a section of its own.
 *   - The report file starts with a one-line HTML comment holding JSON
 *     {clicks28d, impressions28d, indexed, generatedAt}. Next week's run
 *     reads it to diff against. It is the only raw HTML the sanitizer keeps.
 *   - The report job runs `if: always()`, including after a failed model or
 *     verify job, so every input is optional. A missing or unreadable input
 *     is named in the report; it never fails the run.
 *   - writeText() refuses text holding a home-directory or runner path or a
 *     credential shape, and the model works under a runner home directory, so
 *     a skip reason can quote one. A refused write would lose the report, the
 *     digest and any halt notice. So every untrusted cell is redacted as it is
 *     rendered (oneLine), and each finished output is redacted again after
 *     sanitizing (redactDocument), because stripping a tag can join two
 *     harmless pieces into a path. writeText's check stays as the backstop.
 *   - "Changes this run" and "Skipped and why" take what shipped from the
 *     publish job's own decision, --plan (publish-plan.json: include and
 *     dropped with reasons), whenever it exists. Without a plan (publish did
 *     not push), the same decision is recomputed with publish-plan.ts's
 *     buildPlan, so page-group and new-article drops can never drift; the
 *     critic's words only make a dropped file's reason more precise.
 *   - The run id comes from --run-id (or the workflow's SEO_RUN_ID), never
 *     from the model-written manifest: it selects which ledger rows count as
 *     this run's changes and holdout. A manifest that disagrees is logged.
 *   - "Next week's top 10 candidates" leaves out pages withheld by an active
 *     holdout and pages a loop change touched inside the page-touch cooldown
 *     (this run's edits included): the candidates file was scored before
 *     this run's holdout draw and edits, and score.ts drops those pages next
 *     week.
 *   - The ledger is materialized here (status events applied to change
 *     entries), not imported from ledger.ts. The one thing report.ts takes
 *     from another script is publish-plan.ts's pure buildPlan, so what the
 *     report says shipped cannot drift from what publish decides. The
 *     semantics follow ledger.ts: the latest status event for a change wins,
 *     and `ref` is a change id or "pr:<N>".
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Args } from "./lib/cli.ts";
import { check, flagNumber, flagString, hasFlag, log, runMain } from "./lib/cli.ts";
import { loadConfig, type SeoConfig } from "./lib/config.ts";
import { assertPublishable, readJsonl, writeText } from "./lib/io.ts";
import { REPO_ROOT, addDays, datedDataPath, daysBetween, isoWeek, latestDataFile, statePaths, today } from "./lib/paths.ts";
import { buildPlan } from "./publish-plan.ts";
import type { CriticVerdict } from "./publish-plan.ts";
import type {
  Brakes,
  Candidate,
  Candidates,
  GscPull,
  Halt,
  IndexStatus,
  IndexStatusUrl,
  InspectionSnapshot,
  LedgerChange,
  LedgerEvent,
  LedgerLine,
  RunManifest,
  VerifyVerdict,
} from "./lib/types.ts";

export const DIGEST_MAX_CHARS = 60_000;
export const SIGNUPS_LINE = "Organic sign-ups: tracked privately — see /admin/seo";
export const TOP_CANDIDATES = 10;
export const DIGEST_REQUEST_INDEXING = 15;
/** Longest list the digest prints before pointing at the full report. */
export const DIGEST_LIST_CAP = 20;

/** Typed as a code point, never as an escape sequence in source. */
const ZWSP = String.fromCharCode(0x200b);

type JsonRecord = Record<string, unknown>;
const isRecord = (value: unknown): value is JsonRecord => typeof value === "object" && value !== null && !Array.isArray(value);
const finiteOrNull = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);

// ------------------------------------------------------------- sanitizer

const FRONTMATTER_RE = /^<!-- seo-report (\{[^<>\n]*\}) -->(?:\n|$)/;
const FRONTMATTER_KEYS = ["clicks28d", "impressions28d", "indexed", "generatedAt"];
const ISO_INSTANT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const HTML_TAG_RE = /<\/?[A-Za-z][A-Za-z0-9:-]*(?:\s[^<>]*)?\/?>/g;
const IMAGE_RE = /!\[[^\]\n]*\](?:\([^)\n]*\)|\[[^\]\n]*\])?/g;
/** A closing keyword followed by an issue reference (#N, GH-N, owner/repo#N) or a URL. */
const CLOSING_KEYWORD_RE = /\b(?:fix(?:e[sd])?|close[sd]?|resolve[sd]?)(?=\s*:?\s*(?:#|gh-\d|https?:\/\/|[\w.-]+\/[\w.-]+#))/gi;

export type ReportFrontmatter = { clicks28d: number | null; impressions28d: number | null; indexed: number | null; generatedAt: string };

function isFrontmatter(value: unknown): value is ReportFrontmatter {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  if (keys.length !== FRONTMATTER_KEYS.length || !keys.every((key) => FRONTMATTER_KEYS.includes(key))) return false;
  const numberOrNull = (v: unknown): boolean => v === null || finiteOrNull(v) !== null;
  return (
    numberOrNull(value.clicks28d) &&
    numberOrNull(value.impressions28d) &&
    numberOrNull(value.indexed) &&
    typeof value.generatedAt === "string" &&
    ISO_INSTANT_RE.test(value.generatedAt)
  );
}

export function renderFrontmatter(fm: ReportFrontmatter): string {
  const json = JSON.stringify({ clicks28d: fm.clicks28d, impressions28d: fm.impressions28d, indexed: fm.indexed, generatedAt: fm.generatedAt });
  return `<!-- seo-report ${json} -->`;
}

/** The frontmatter at the very start of a report file, or null when absent or malformed. */
export function parseFrontmatter(text: string): ReportFrontmatter | null {
  const match = FRONTMATTER_RE.exec(text);
  if (!match) return null;
  try {
    const value: unknown = JSON.parse(match[1]);
    return isFrontmatter(value) ? value : null;
  } catch {
    return null;
  }
}

function sanitizeBody(text: string): string {
  let out = text.replace(/<!--[\s\S]*?-->/g, "");
  // Repeat until stable: removing one tag can join the pieces of another ("<scr<b>ipt>").
  for (let i = 0; i < 10; i += 1) {
    const next = out.replace(HTML_TAG_RE, "");
    if (next === out) break;
    out = next;
  }
  out = out.replace(IMAGE_RE, "");
  // Whatever still opens a tag, comment or declaration is shown as text, not parsed.
  out = out.replace(/<(?=[A-Za-z!/?])/g, "&lt;");
  out = out.replace(CLOSING_KEYWORD_RE, (keyword) => `${keyword[0]}${ZWSP}${keyword.slice(1)}`);
  out = out.replace(/#(?=\d)/g, `#${ZWSP}`);
  out = out.replace(/\b(gh)-(?=\d)/gi, `$1${ZWSP}-`);
  out = out.replace(/@(?=[A-Za-z0-9])/g, `@${ZWSP}`);
  return out;
}

/**
 * Make markdown safe to publish as a GitHub comment, PR body or state-branch
 * file. Neutralizes `#123`, `GH-123` and `owner/repo#123` references,
 * `@handle` mentions and closing keywords (a zero-width space breaks each
 * one), strips images and raw HTML tags, and escapes any `<` still left
 * before a tag name. A valid report frontmatter on the first line is kept
 * verbatim. Idempotent.
 */
export function sanitizeForGithub(md: string): string {
  const match = FRONTMATTER_RE.exec(md);
  if (match && parseFrontmatter(match[0])) {
    return `${match[0].replace(/\n$/, "")}\n${sanitizeBody(md.slice(match[0].length))}`;
  }
  return sanitizeBody(md);
}

// ------------------------------------------------------------ redaction

/**
 * A home-directory or runner path, up to and including the account directory.
 * Broader than io.ts's tripwire (no trailing slash needed) because the account
 * name is the part that must not be published.
 */
const LOCAL_PATH_RE = /\/(?:Users|home)\/[^/\s'"`]+/g;
export const REDACTED = "[redacted]";

/** io.ts's own test, so the credential shapes are never copied here. */
function publishable(text: string): boolean {
  try {
    assertPublishable(text, "report text");
    return true;
  } catch {
    return false;
  }
}

/**
 * Untrusted text made writable: each local path keeps only what follows the
 * account directory ("~/work/..."), and text that still trips the tripwire
 * (a credential shape) is replaced whole by REDACTED.
 */
export function redact(text: string): string {
  const out = text.replace(LOCAL_PATH_RE, "~");
  return publishable(out) ? out : REDACTED;
}

/**
 * The same redaction over a finished, sanitized output, line by line.
 * Sanitizing strips tags, which can join the pieces of a path, and two cells
 * can form a credential shape together. A line that still trips the tripwire
 * is replaced; a table row stays a row, so the table keeps rendering.
 */
export function redactDocument(md: string): string {
  return md
    .replace(LOCAL_PATH_RE, "~")
    .split("\n")
    .map((line) => (publishable(line) ? line : line.startsWith("|") ? `| ${REDACTED} |` : REDACTED))
    .join("\n");
}

// ------------------------------------------------------ markdown helpers

/** Collapse whitespace (newlines included), redact, and truncate: untrusted text stays inside its line. */
export function oneLine(value: unknown, max = 200): string {
  const text = redact(
    String(value ?? "")
      .replace(/\s+/g, " ")
      .trim(),
  );
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Text for a table cell: one line, no backticks, pipes escaped. */
function cell(value: unknown, max = 120): string {
  return oneLine(value, max).replace(/`/g, "'").replace(/\|/g, "\\|");
}

/** A path or id as a code span (no autolinks, no emphasis). */
function code(value: unknown, max = 160): string {
  const text = cell(value, max);
  return text ? `\`${text}\`` : "—";
}

function int(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

function tierLabel(tier: number | null | undefined): string {
  return tier === 0 || tier === 1 || tier === 2 ? `T${tier}` : "—";
}

function prLabel(pr: number | null | undefined): string {
  return typeof pr === "number" && Number.isInteger(pr) && pr > 0 ? `#${pr}` : "—";
}

/** " (last report 2026-W38: 21; +3, +14%)", or "" when there is nothing to compare with. */
export function comparison(current: number, previous: number | null, basis: string): string {
  if (previous === null) return "";
  const diff = current - previous;
  if (diff === 0) return ` (${basis}: ${int(previous)}; no change)`;
  const sign = diff > 0 ? "+" : "-";
  const share = previous > 0 ? `, ${sign}${Math.round((Math.abs(diff) / previous) * 100)}%` : "";
  return ` (${basis}: ${int(previous)}; ${sign}${int(Math.abs(diff))}${share})`;
}

/** "24 (last report 2026-W38: 21; +3, +14%)". */
export function versus(current: number | null, previous: number | null, basis: string): string {
  return current === null ? "unavailable" : `${int(current)}${comparison(current, previous, basis)}`;
}

/** Keep the first `cap` lines; say how many were left out. `cap` null keeps all. */
function capped(lines: string[], cap: number | null, noun: string): string[] {
  if (cap === null || lines.length <= cap) return lines;
  return [...lines.slice(0, cap), `- …and ${lines.length - cap} more ${noun} (full list in the report)`];
}

// ---------------------------------------------------- previous report

/** The newest `<year>-W<week>.md` strictly before `currentLabel`, or null. */
export function pickPreviousReport(fileNames: string[], currentLabel: string): string | null {
  const labels = fileNames
    .map((name) => /^(\d{4}-W\d{2})\.md$/.exec(name)?.[1] ?? null)
    .filter((label): label is string => label !== null && label < currentLabel)
    .sort();
  return labels.length ? `${labels[labels.length - 1]}.md` : null;
}

// ------------------------------------------------------- indexed count

type IndexStatusUrlExt = IndexStatusUrl & { removedFromSitemap?: string | null };
export type IndexedCount = { asOf: string; indexed: number; total: number; known: number };

function latestSnapshotOnOrBefore(entry: IndexStatusUrl, asOf: string): InspectionSnapshot | null {
  const snapshots: InspectionSnapshot[] = [...(Array.isArray(entry.history) ? entry.history : []), entry];
  let best: InspectionSnapshot | null = null;
  for (const snapshot of snapshots) {
    if (typeof snapshot?.inspectedAt !== "string" || snapshot.inspectedAt.slice(0, 10) > asOf) continue;
    if (!best || snapshot.inspectedAt >= best.inspectedAt) best = snapshot;
  }
  return best;
}

/**
 * How many sitemap URLs were indexed as of `asOf`, as the loop knew it then:
 * each URL's newest inspection on or before that date. The population is the
 * URLs in the sitemap on that date (first seen on or before it, not yet
 * removed), so this week and last week are counted the same way. Null when no
 * URL had been inspected by then.
 */
export function indexedAsOf(status: IndexStatus | null, asOf: string): IndexedCount | null {
  if (!status || !isRecord(status.urls)) return null;
  let indexed = 0;
  let total = 0;
  let known = 0;
  for (const entry of Object.values(status.urls) as IndexStatusUrlExt[]) {
    if (!isRecord(entry)) continue;
    if (typeof entry.firstSeenInSitemap === "string" && entry.firstSeenInSitemap.slice(0, 10) > asOf) continue;
    if (typeof entry.removedFromSitemap === "string" && entry.removedFromSitemap.slice(0, 10) <= asOf) continue;
    total += 1;
    const snapshot = latestSnapshotOnOrBefore(entry, asOf);
    if (!snapshot) continue;
    known += 1;
    if (snapshot.indexed === true) indexed += 1;
  }
  return known ? { asOf, indexed, total, known } : null;
}

// ------------------------------------------------------------- ledger

type HoldoutEvent = Extract<LedgerEvent, { kind: "holdout" }>;
type StatusEvent = Extract<LedgerEvent, { kind: "status" }>;
export type MaterializedLedger = { changes: LedgerChange[]; holdouts: HoldoutEvent[] };

const OUTCOMES = new Set(["pending", "win", "loss", "neutral"]);

function applyStatus(change: LedgerChange, event: StatusEvent): void {
  change.status = event.status;
  if (typeof event.pr === "number") change.pr = event.pr;
  if (typeof event.live_at === "string" && event.live_at) change.live_at = event.live_at;
  if (event.status === "reverted") change.reverted = true;
  if (typeof event.note !== "string" || !event.note.trim().startsWith("{")) return;
  // score-outcomes stores the after-metrics and the label as JSON in the note.
  try {
    const note: unknown = JSON.parse(event.note);
    if (!isRecord(note)) return;
    if (typeof note.outcome === "string" && OUTCOMES.has(note.outcome)) {
      change.outcome = note.outcome as LedgerChange["outcome"];
      change.scored_at = typeof note.scored_at === "string" ? note.scored_at : event.date;
    }
    if (isRecord(note.after)) change.after = note.after as LedgerChange["after"];
  } catch {
    /* a free-text note carries no score */
  }
}

/** Change entries with their status events applied, plus every holdout event, in ledger order. */
export function materializeLedger(lines: Array<LedgerChange | LedgerEvent | LedgerLine>): MaterializedLedger {
  const changes = new Map<string, LedgerChange>();
  const holdouts: HoldoutEvent[] = [];
  for (const line of lines) {
    if (!isRecord(line)) continue;
    if (line.kind === "change") {
      // append-changes is idempotent by id; a duplicate line never replaces the original.
      if (!changes.has(line.id)) changes.set(line.id, { ...(line as LedgerChange) });
    } else if (line.kind === "holdout") {
      holdouts.push(line as HoldoutEvent);
    } else if (line.kind === "status") {
      const event = line as StatusEvent;
      const byPr = /^pr:(\d+)$/.exec(event.ref ?? "");
      const targets = byPr ? [...changes.values()].filter((c) => c.pr === Number(byPr[1])) : [changes.get(event.ref)];
      for (const target of targets) if (target) applyStatus(target, event);
    }
  }
  return { changes: [...changes.values()], holdouts };
}

// ------------------------------------------------ critic, run summary

/** One critic verdict. `verdict` is the raw string (null when absent): publish compares it to "APPROVE" as is. */
export type CriticEntry = { file: string; verdict: string | null; reason: string };

/**
 * The critic job's structured output, `{verdicts: [{file, verdict, reasons}]}`
 * (the --json-schema in seo-weekly.yml), read the way publish-plan.ts reads
 * it: only `verdicts`, keyed by the exact `file`. Any other shape holds no
 * verdict for publish, so it holds none here. lib/types.ts has no critic type.
 */
export function parseCritic(json: unknown): CriticEntry[] {
  const list = isRecord(json) && Array.isArray(json.verdicts) ? json.verdicts : [];
  const out: CriticEntry[] = [];
  for (const value of list) {
    // An entry without a string file can never match a verified path in publish either.
    if (!isRecord(value) || typeof value.file !== "string") continue;
    const reasons = value.reasons ?? value.reason ?? "";
    const reason = Array.isArray(reasons) ? reasons.map((r) => String(r)).join("; ") : String(reasons);
    out.push({ file: value.file, verdict: typeof value.verdict === "string" ? value.verdict : null, reason: oneLine(reason, 300) });
  }
  return out;
}

export type RunCost = { job: string; turns: number | null; costUsd: number | null; denials: number | null; deniedTools: Record<string, number> };

const RUN_SUMMARY_KEYS = ["turns", "num_turns", "costUsd", "cost_usd", "total_cost_usd", "denials", "permission_denials"];
const TOOL_NAME_RE = /^[A-Za-z0-9_.:-]{1,64}$/;

function runCost(job: string, value: JsonRecord): RunCost {
  const denialList = value.permission_denials ?? value.denials;
  const deniedTools: Record<string, number> = {};
  if (Array.isArray(denialList)) {
    for (const denial of denialList) {
      // Only the tool's name is kept. Its input is transcript content and never leaves the run.
      const raw = isRecord(denial) ? (denial.tool_name ?? denial.tool ?? denial.name) : denial;
      const name = typeof raw === "string" && TOOL_NAME_RE.test(raw) ? raw : "other";
      deniedTools[name] = (deniedTools[name] ?? 0) + 1;
    }
  }
  return {
    job: TOOL_NAME_RE.test(job) ? job : "run",
    turns: finiteOrNull(value.turns ?? value.num_turns),
    costUsd: finiteOrNull(value.costUsd ?? value.cost_usd ?? value.total_cost_usd),
    denials: Array.isArray(denialList) ? denialList.length : finiteOrNull(denialList),
    deniedTools,
  };
}

/**
 * `--run-summary` JSON → one row per job. Either a single summary
 * ({turns|num_turns, costUsd|total_cost_usd, denials|permission_denials}) or
 * an object of them keyed by job ({model: {...}, critic: {...}}).
 */
export function parseRunSummary(json: unknown): RunCost[] {
  if (!isRecord(json)) return [];
  if (RUN_SUMMARY_KEYS.some((key) => key in json)) return [runCost("run", json)];
  return Object.entries(json)
    .filter((entry): entry is [string, JsonRecord] => isRecord(entry[1]))
    .map(([job, value]) => runCost(job, value));
}

// ------------------------------------------------ changes and skipped

export type Disposition = {
  path: string;
  file: string;
  skill: string;
  changeType: string;
  tier: 0 | 1 | 2 | null;
  accepted: boolean;
  reason: string | null;
};

/** The critic's wording for why a tier-1 file lacks an APPROVE, or null when it has one. Wording only: buildPlan decides. */
function criticBlocks(file: string, critic: CriticEntry[] | null): string | null {
  // publish-plan keys a Map by file, so the LAST entry for a file wins.
  const said = critic?.findLast((e) => e.file === file) ?? null;
  if (!said) return "no critic verdict for a tier-1 file";
  if (said.verdict === "APPROVE") return null;
  const why = said.reason ? `: ${said.reason}` : "";
  if (said.verdict === "REJECT") return `critic REJECT${why}`;
  const verdict = said.verdict === null ? "gave no verdict" : `said "${oneLine(said.verdict, 40)}"`;
  return `critic ${verdict}, and a tier-1 file needs exactly APPROVE${why}`;
}

/** The publish job's decision (publish-plan.json), as far as the report needs it. */
export type PlanDecision = { include: string[]; dropped: Array<{ file: string; reason: string }> };

/** A --plan file's decision, or null when it is not one (a malformed plan is ignored, never guessed at). */
export function parsePlan(json: unknown): PlanDecision | null {
  if (!isRecord(json) || !Array.isArray(json.include) || !json.include.every((f) => typeof f === "string")) return null;
  const dropped = Array.isArray(json.dropped)
    ? json.dropped.filter(isRecord).map((d) => ({ file: String(d.file ?? ""), reason: typeof d.reason === "string" ? d.reason : "dropped by the publish plan" }))
    : [];
  return { include: json.include as string[], dropped };
}

/**
 * What became of each change the model proposed. verify-static is the only
 * source of tier truth. With the publish job's plan, the plan decides (it is
 * what shipped). Without one, publish-plan.ts's buildPlan decides from the
 * verdict and the critic: a tier-1 file ships only with the critic's exact
 * APPROVE for its exact path (so with no critic file it is dropped), tier 0
 * and tier 2 ship whatever the critic said, and a dropped file takes its page
 * group (or, for a new article, the whole run) with it.
 */
export function dispositions(manifest: RunManifest | null, verdict: VerifyVerdict | null, critic: CriticEntry[] | null, plan: PlanDecision | null = null): Disposition[] {
  const changes = Array.isArray(manifest?.changes) ? manifest.changes : [];
  let decided: PlanDecision | null = plan;
  if (!decided && verdict?.ok && Array.isArray(verdict.files)) {
    const asCritic: CriticVerdict | null = critic === null ? null : { verdicts: critic.map((e) => ({ file: e.file, verdict: e.verdict as "APPROVE" | "REJECT", reasons: e.reason ? [e.reason] : [] })) };
    decided = buildPlan("report", verdict, asCritic);
  }
  const included = new Set(decided?.include ?? []);
  const droppedWhy = new Map((decided?.dropped ?? []).map((d) => [d.file, d.reason]));
  return changes.map((change) => {
    const verified = verdict?.files?.find((f) => f.path === change.file) ?? null;
    const base = {
      path: String(change.path ?? ""),
      file: String(change.file ?? ""),
      skill: String(change.skill ?? ""),
      changeType: String(change.changeType ?? ""),
      tier: verified ? verified.tier : null,
    };
    if (!verdict) return { ...base, accepted: false, reason: "no verify-static verdict for this run" };
    if (!verdict.ok) return { ...base, accepted: false, reason: `verify-static failed the patch (${verdict.violations?.length ?? 0} violation(s))` };
    if (!verified) return { ...base, accepted: false, reason: "not in the verified patch" };
    if (included.has(verified.path)) return { ...base, accepted: true, reason: null };
    // The critic's own words say it best when it is the reason (and only then: a group drop names its cause).
    const own = !plan && verified.tier === 1 ? criticBlocks(verified.path, critic) : null;
    const why = own ?? droppedWhy.get(verified.path) ?? "not in the publish plan";
    return { ...base, accepted: false, reason: oneLine(why, 400) };
  });
}

export type ChangeRow = { path: string; tier: 0 | 1 | 2 | null; changeType: string; skill: string; pr: number | null };

/**
 * This run's changes. The ledger is the record of what was published; when
 * it holds nothing for the run (the report ran before or without publish),
 * the manifest changes that pass publish's rule stand in and are labelled so.
 */
export function changesThisRun(
  ledger: MaterializedLedger,
  runId: string | null,
  decided: Disposition[],
  pr: number | null,
): { source: "ledger" | "manifest" | "none"; rows: ChangeRow[] } {
  if (!runId) return { source: "none", rows: [] };
  const recorded = ledger.changes.filter((c) => c.run_id === runId);
  if (recorded.length) {
    return {
      source: "ledger",
      rows: recorded.map((c) => ({ path: c.url, tier: c.tier, changeType: c.change_type, skill: c.skill, pr: c.pr ?? pr })),
    };
  }
  const accepted = decided.filter((d) => d.accepted);
  if (accepted.length) return { source: "manifest", rows: accepted.map((d) => ({ path: d.path, tier: d.tier, changeType: d.changeType, skill: d.skill, pr })) };
  return { source: "none", rows: [] };
}

/** Candidates in score.ts order: opportunity, then reason count, then path. */
export function topCandidates(candidates: Candidates | null, n: number = TOP_CANDIDATES): Candidate[] {
  const list = Array.isArray(candidates?.candidates) ? [...candidates.candidates] : [];
  list.sort(
    (a, b) =>
      (b.opportunity ?? 0) - (a.opportunity ?? 0) ||
      (b.reasons?.length ?? 0) - (a.reasons?.length ?? 0) ||
      (a.path < b.path ? -1 : a.path > b.path ? 1 : 0),
  );
  return list.slice(0, n);
}

// ------------------------------------------------------------ report

export type ReportMode = "review" | "auto";
export type InputNote = { name: string; date: string | null; problem: string | null };

export type ReportInput = {
  today: string;
  generatedAt: string;
  /** ISO week label, e.g. "2026-W39". */
  label: string;
  base: string;
  caps: SeoConfig["caps"];
  gapArticlesWhileCrawlStalled: number;
  mode: ReportMode;
  runId: string | null;
  pr: number | null;
  gsc: GscPull | null;
  indexStatus: IndexStatus | null;
  candidates: Candidates | null;
  brakes: Brakes | null;
  halt: Halt | null;
  /** The SEO_HALT_ACK repo variable, when the job passes it. */
  haltAck: string | null;
  ledger: MaterializedLedger;
  manifest: RunManifest | null;
  verdict: VerifyVerdict | null;
  critic: CriticEntry[] | null;
  runCost: RunCost[] | null;
  previous: { label: string; frontmatter: ReportFrontmatter } | null;
  inputs: InputNote[];
  /** Why the gate limited this run (e.g. "loop PR still open"); "ok" or null when it did not. */
  gateReason?: string | null;
  /** The publish job's decision (--plan), when publish pushed. */
  plan?: PlanDecision | null;
  /** The data job's result (--data-result); anything but "success" is said in the header. */
  dataResult?: string | null;
};

export type Variant = "report" | "digest";

function oneLineText(value: string): string {
  return value.replace(/[\r\n]+/g, " ").slice(0, 200);
}

function headerLines(input: ReportInput, variant: Variant): string[] {
  const title = variant === "report" ? `# SEO weekly report ${input.label}` : `# SEO weekly digest ${input.label}`;
  const run = [
    input.runId ? `Run ${code(input.runId, 80)}` : "No run id",
    `mode ${input.mode}`,
    input.today,
    ...(input.pr ? [`PR ${prLabel(input.pr)}`] : []),
    ...(input.gateReason && input.gateReason !== "ok" ? [`content paused: ${oneLineText(input.gateReason)}`] : []),
  ].join(" · ");
  const dataFailed = typeof input.dataResult === "string" && input.dataResult !== "" && input.dataResult !== "success";
  const data = input.inputs
    .map((note) => {
      if (note.problem) return `${note.name} ${note.problem}`;
      if (!note.date) return `${note.name} missing`;
      const age = daysBetween(note.date, input.today);
      const date = oneLine(note.date, 10);
      return age > 0 ? `${note.name} ${date} (${age} ${age === 1 ? "day" : "days"} old)` : `${note.name} ${date}`;
    })
    .join(" · ");
  const out = [title, "", run];
  if (dataFailed) {
    out.push(
      "",
      `> **The data job did not succeed (${oneLine(input.dataResult, 20)}).** Nothing was measured this run, no content was proposed, and the run state on \`seo-state\` was left as it was. Open the workflow run to see which step failed.`,
    );
  }
  if (data) out.push("", `Data: ${data}`);
  if (variant === "digest") out.push("", `Full report: \`seo/reports/${input.label}.md\` on the \`seo-state\` branch.`);
  const halt = input.halt;
  if (halt?.halted) {
    const acked = Boolean(halt.clearWithAck && input.haltAck === halt.clearWithAck);
    out.push(
      "",
      acked
        ? `> **Halt ${code(halt.id)} is acknowledged** (SEO_HALT_ACK matches), so it no longer blocks runs.`
        : `> **The loop is halted** since ${oneLine(halt.since ?? "an unknown date", 40)}: ${oneLine(halt.reason ?? "no reason recorded", 300)}. No changes are made until the founder sets the repo variable \`SEO_HALT_ACK\` to ${code(halt.clearWithAck ?? halt.id)}.`,
    );
  }
  return out;
}

function headlineSection(input: ReportInput): string[] {
  const out = ["## Headline", ""];
  const gsc = input.gsc;
  const clicks = finiteOrNull(gsc?.totals?.current?.clicks);
  const impressions = finiteOrNull(gsc?.totals?.current?.impressions);
  const previous = input.previous;
  // Last report's number when it recorded one, else GSC's own prior 28 days.
  const baseline = (fromReport: number | null, fromPrior: unknown): [number | null, string] =>
    previous && fromReport !== null ? [fromReport, `last report ${previous.label}`] : [finiteOrNull(fromPrior), "prior 28 days"];
  const [clicksBefore, clicksBasis] = baseline(previous?.frontmatter.clicks28d ?? null, gsc?.totals?.prior?.clicks);
  const [impressionsBefore, impressionsBasis] = baseline(previous?.frontmatter.impressions28d ?? null, gsc?.totals?.prior?.impressions);
  out.push(`- Clicks (28 days): ${versus(clicks, clicksBefore, clicksBasis)}`);
  out.push(`- Impressions (28 days): ${versus(impressions, impressionsBefore, impressionsBasis)}`);

  const now = indexedAsOf(input.indexStatus, input.today);
  const weekAgo = addDays(input.today, -7);
  const then = indexedAsOf(input.indexStatus, weekAgo);
  if (!now) {
    out.push("- Indexed: unavailable (no index-status.json)");
  } else {
    const head = `- Indexed: ${int(now.indexed)} of ${int(now.total)} sitemap URLs`;
    if (then) out.push(`${head}${comparison(now.indexed, then.indexed, `on ${weekAgo}`)}`);
    else if (previous && previous.frontmatter.indexed !== null) out.push(`${head}${comparison(now.indexed, previous.frontmatter.indexed, `last report ${previous.label}`)}`);
    else out.push(`${head} (no inspection history from a week ago)`);
  }
  out.push(`- ${SIGNUPS_LINE}`);
  const window = gsc?.windows?.current;
  if (window?.startDate && window?.endDate) out.push(`- GSC window: ${oneLine(window.startDate, 10)} to ${oneLine(window.endDate, 10)}`);
  return out;
}

function changesSection(input: ReportInput, decided: Disposition[]): string[] {
  const out = ["## Changes this run", ""];
  const { source, rows } = changesThisRun(input.ledger, input.runId, decided, input.pr);
  if (source === "none") {
    out.push(input.runId ? "No changes this run." : "No run id was given, so no changes are attributed to this run.");
    return out;
  }
  if (source === "manifest") out.push("Not in the ledger yet: these are the manifest changes that pass the publish rule (verify-static accepted them, and a tier-1 file has the critic's APPROVE).", "");
  out.push("| URL | Tier | Type | Skill | PR |", "|---|---|---|---|---|");
  for (const row of rows) out.push(`| ${code(row.path)} | ${tierLabel(row.tier)} | ${cell(row.changeType, 60)} | ${cell(row.skill, 40)} | ${prLabel(row.pr)} |`);
  return out;
}

function capsLine(input: ReportInput): string | null {
  const used = input.verdict?.caps;
  if (!used) return null;
  const stalled = input.candidates?.profile?.crawlStalled === true;
  const articleCap = stalled ? input.gapArticlesWhileCrawlStalled : input.caps.newArticlesPerRun;
  const part = (name: string, value: number, cap: number | null): string =>
    cap === null ? `${name} ${int(value)}` : `${name} ${int(value)}/${int(cap)}${value >= cap ? " (cap reached)" : ""}`;
  return [
    part("files", used.files, input.caps.maxChangedFilesPerRun),
    part("lines", used.lines, input.caps.maxChangedLinesPerRun),
    part("pages", used.pages, input.caps.pagesChangedPerRun),
    part(`new articles${stalled ? " (crawl stalled)" : ""}`, used.newArticles, articleCap),
    part("noindex", used.noindex, null),
  ].join(" · ");
}

function skippedSection(input: ReportInput, decided: Disposition[], variant: Variant): string[] {
  const out = ["## Skipped and why", ""];
  const cap = variant === "digest" ? DIGEST_LIST_CAP : null;
  const manifest = input.manifest;
  const items: string[] = [];
  for (const skip of Array.isArray(manifest?.skipped) ? manifest.skipped : []) {
    items.push(`- ${code(skip.path)}${skip.skill ? ` (${cell(skip.skill, 40)})` : ""}: ${cell(skip.reason, 300) || "no reason given"}`);
  }
  for (const d of decided) if (!d.accepted) items.push(`- ${code(d.path)} (${cell(d.skill, 40)}): ${cell(d.reason, 300)}`);
  for (const issue of Array.isArray(manifest?.issues) ? manifest.issues : []) items.push(`- Deferred to a tier-2 issue: ${cell(issue.title, 200)}`);

  if (!manifest) out.push("No run manifest was given.");
  else if (!items.length) out.push("Nothing skipped.");
  out.push(...capped(items, cap, "items"));

  const violations = Array.isArray(input.verdict?.violations) ? input.verdict.violations : [];
  if (violations.length) {
    out.push("", `verify-static violations (${violations.length}):`, "");
    const lines = violations.map((v) => `- ${cell(v.rule, 60)}${v.path ? ` ${code(v.path)}` : ""}: ${cell(v.detail, 300)}`);
    out.push(...capped(lines, cap, "violations"));
  }
  const caps = capsLine(input);
  if (caps) out.push("", `Caps used: ${caps}`);
  return out;
}

function brakesSection(input: ReportInput, variant: Variant): string[] {
  const out = ["## Brakes", ""];
  const cap = variant === "digest" ? DIGEST_LIST_CAP : null;
  const halt = input.halt;
  if (!halt?.halted) out.push("- Halt: not halted.");
  else {
    const acked = Boolean(halt.clearWithAck && input.haltAck === halt.clearWithAck);
    out.push(
      `- Halt: **halted** since ${oneLine(halt.since ?? "unknown", 40)} (${code(halt.id)}): ${cell(halt.reason ?? "no reason recorded", 300)}.${acked ? " Acknowledged by SEO_HALT_ACK." : ""}`,
    );
  }
  const brakes = input.brakes;
  if (!brakes) {
    out.push("- No brakes-YYYY-MM-DD.json was found, so the brake state for this run is unknown.");
    return out;
  }

  const regressions = (brakes.pageRegressions ?? []).map(
    (r) => `- ${code(r.path)} (${prLabel(r.pr)}): ${cell(r.check, 60)}, ${cell(r.detail, 200)}. Action: revert.`,
  );
  out.push(regressions.length ? `- Page regressions (deterministic): ${regressions.length}` : "- Page regressions (deterministic): none.");
  out.push(...capped(regressions, cap, "regressions").map((line) => `  ${line}`));

  const drops = (brakes.indexDrops ?? []).map((r) => `- ${code(r.path)}: ${cell(r.detail, 200)}. Action: tier-2 issue.`);
  out.push(drops.length ? `- Indexed pages that dropped out after a change: ${drops.length}` : "- Indexed pages that dropped out after a change: none.");
  out.push(...capped(drops, cap, "drops").map((line) => `  ${line}`));

  const losses = (brakes.gscPageLosses ?? []).map(
    (l) => `- ${code(l.path)}: ${pct(l.lossShare)} fewer clicks than its holdout on ${int(l.impressions)} impressions. Action: revert.`,
  );
  out.push(losses.length ? `- Click losses against holdout: ${losses.length}` : "- Click losses against holdout: none.");
  out.push(...capped(losses, cap, "losses").map((line) => `  ${line}`));

  const site = brakes.siteWide;
  if (site) {
    const latest = finiteOrNull(site.latestWeekClicks) ?? 0;
    const prior = finiteOrNull(site.priorWeekClicks) ?? 0;
    // Computed from the two counts, so the wording never depends on dropShare's sign convention.
    const change =
      prior <= 0 ? "no clicks the week before" : latest === prior ? "no change" : `${latest < prior ? "-" : "+"}${pct(Math.abs(latest - prior) / prior)}`;
    const state = site.applied ? "**applied: the loop is halted**" : site.triggered ? "triggered, not applied" : "not triggered";
    out.push(
      `- Site-wide, week over week: ${int(latest)} clicks in the latest week vs ${int(prior)} the week before (${change}); ${state}${site.note ? ` (${cell(site.note, 200)})` : ""}.`,
    );
  }
  const demoted = brakes.demotedChangeTypes ?? [];
  out.push(
    demoted.length
      ? `- Demoted change types (treated as tier 2): ${demoted.map((d) => `${cell(d.changeType, 40)} (loss rate ${pct(d.lossRate)} over ${int(d.scored)} scored)`).join("; ")}`
      : "- Demoted change types: none.",
  );
  return out;
}

function holdoutSection(input: ReportInput, variant: Variant): string[] {
  const out = ["## Holdout this run", ""];
  const mine = input.runId ? input.ledger.holdouts.filter((h) => h.run_id === input.runId) : [];
  const event = mine.length ? mine[mine.length - 1] : null;
  if (!event) out.push("No holdout was recorded for this run.");
  else {
    const urls = Array.isArray(event.urls) ? event.urls : [];
    out.push(`${int(urls.length)} pages are withheld until ${oneLine(event.until, 10)}. They are the comparison group for this run's changes.`);
    if (urls.length) out.push("", ...capped(urls.map((u) => `- ${code(u)}`), variant === "digest" ? DIGEST_LIST_CAP : null, "pages"));
  }
  const active = new Set<string>();
  for (const h of input.ledger.holdouts) if (typeof h.until === "string" && h.until >= input.today) for (const u of h.urls ?? []) active.add(u);
  if (active.size) out.push("", `Active holdouts across all runs: ${int(active.size)} pages.`);
  return out;
}

/**
 * Pages next week's run will not work on: withheld by a holdout still active
 * on `today`, or touched by a loop change inside the page-touch cooldown
 * (score.ts lastTouches: a proposed change's date, a live change's live_at).
 */
export function unavailablePages(ledger: MaterializedLedger, date: string, cooldownDays: number): { holdout: Set<string>; cooling: Set<string> } {
  const holdout = new Set<string>();
  for (const h of ledger.holdouts) if (typeof h.until === "string" && h.until >= date) for (const u of h.urls ?? []) holdout.add(u);
  const cooling = new Set<string>();
  for (const c of ledger.changes) {
    let touched: string | null = null;
    if (c.status === "proposed") touched = c.date;
    else if (c.status === "live" || c.status === "reverted") touched = c.live_at ?? c.date;
    if (!touched || typeof c.url !== "string") continue;
    if (date < addDays(touched.slice(0, 10), cooldownDays)) cooling.add(c.url);
  }
  return { holdout, cooling };
}

/** The top candidates next week's run can actually take, and how many ranked pages were left out and why. */
export function nextCandidates(input: Pick<ReportInput, "candidates" | "ledger" | "today" | "caps">): { top: Candidate[]; heldOut: number; cooling: number } {
  const { holdout, cooling } = unavailablePages(input.ledger, input.today, input.caps.pageTouchCooldownDays);
  const list = Array.isArray(input.candidates?.candidates) ? input.candidates.candidates : [];
  let heldOut = 0;
  let cool = 0;
  const open = list.filter((c) => {
    if (holdout.has(c.path)) {
      heldOut += 1;
      return false;
    }
    if (cooling.has(c.path)) {
      cool += 1;
      return false;
    }
    return true;
  });
  return { top: topCandidates({ ...(input.candidates as Candidates), candidates: open }), heldOut, cooling: cool };
}

function candidatesSection(input: ReportInput): string[] {
  const out = [`## Next week's top ${TOP_CANDIDATES} candidates`, ""];
  if (!input.candidates) {
    out.push("No candidates-YYYY-MM-DD.json was found.");
    return out;
  }
  const { top, heldOut, cooling } = nextCandidates(input);
  if (heldOut || cooling) {
    out.push(
      `Left out: ${int(heldOut)} ranked ${heldOut === 1 ? "page is" : "pages are"} withheld as holdout controls, and ${int(cooling)} ${cooling === 1 ? "was" : "were"} changed by the loop within ${int(input.caps.pageTouchCooldownDays)} days.`,
      "",
    );
  }
  if (!top.length) {
    out.push("No page qualifies for any skill this week.");
    return out;
  }
  out.push("| # | URL | Skill | Reasons | Opportunity | Impr. 28d | Pos. |", "|---:|---|---|---|---:|---:|---:|");
  top.forEach((c, i) => {
    const reasons = (c.reasons ?? []).map((r) => r.reason).join(", ");
    const position = finiteOrNull(c.metrics?.position28d);
    out.push(
      `| ${i + 1} | ${code(c.path)} | ${cell(c.skill, 40)} | ${cell(reasons, 120)} | ${(finiteOrNull(c.opportunity) ?? 0).toFixed(1)} | ${int(finiteOrNull(c.metrics?.impressions28d) ?? 0)} | ${position === null ? "—" : position.toFixed(1)} |`,
    );
  });
  return out;
}

function dormantSection(input: ReportInput): string[] {
  const out = ["## Dormant skills", ""];
  const candidates = input.candidates;
  if (!candidates) {
    out.push("Unknown: no candidates-YYYY-MM-DD.json was found.");
    return out;
  }
  const profile = candidates.profile;
  if (profile?.crawlStalled) {
    const trend = Array.isArray(profile.crawledNotIndexedTrend) ? profile.crawledNotIndexedTrend.map((n) => int(n)).join(" → ") : "";
    out.push(
      `Google's crawl is stalled: ${int(profile.unknownUrls ?? 0)} sitemap URLs have never been crawled${trend ? `; crawled-not-indexed trend ${trend}` : ""}. Gap articles are capped at ${int(input.gapArticlesWhileCrawlStalled)} per run until it moves.`,
      "",
    );
  }
  const dormant = Array.isArray(candidates.dormant) ? candidates.dormant : [];
  if (!dormant.length) out.push("Every skill has work this week.");
  for (const d of dormant) out.push(`- ${cell(d.skill, 40)}: needs ${cell(d.needs, 300)}; current: ${cell(d.current, 300)}`);
  return out;
}

function requestIndexingSection(input: ReportInput, variant: Variant): string[] {
  const out = ["## Request indexing (manual, in Search Console)", ""];
  const list = Array.isArray(input.candidates?.requestIndexing) ? input.candidates.requestIndexing : [];
  if (!input.candidates) {
    out.push("No candidates-YYYY-MM-DD.json was found.");
    return out;
  }
  if (!list.length) {
    out.push("Nothing to request this week.");
    return out;
  }
  out.push("Paste each URL into URL Inspection and choose Request indexing. No API can do this step.", "");
  const shown = variant === "digest" ? list.slice(0, DIGEST_REQUEST_INDEXING) : list;
  const origin = input.base.replace(/\/+$/, "");
  shown.forEach((item, i) => out.push(`${i + 1}. ${code(`${origin}${item.path}`, 200)}: ${cell(item.why, 200)}`));
  if (shown.length < list.length) out.push("", `…and ${list.length - shown.length} more in the full report.`);
  return out;
}

function runCostSection(input: ReportInput): string[] {
  const rows = input.runCost ?? [];
  if (!rows.length) return [];
  const out = ["## Run cost", "", "| Job | Turns | Cost | Permission denials |", "|---|---:|---:|---|"];
  for (const r of rows) {
    const tools = Object.entries(r.deniedTools)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .map(([tool, n]) => `${oneLine(tool, 64)} ×${n}`)
      .join(", ");
    const denials = r.denials === null ? "—" : `${int(r.denials)}${tools ? ` (${tools})` : ""}`;
    out.push(`| ${cell(r.job, 40)} | ${r.turns === null ? "—" : int(r.turns)} | ${r.costUsd === null ? "—" : `$${r.costUsd.toFixed(2)}`} | ${denials} |`);
  }
  if (rows.length > 1) {
    const turns = rows.every((r) => r.turns === null) ? null : rows.reduce((sum, r) => sum + (r.turns ?? 0), 0);
    const cost = rows.every((r) => r.costUsd === null) ? null : rows.reduce((sum, r) => sum + (r.costUsd ?? 0), 0);
    out.push(`| total | ${turns === null ? "—" : int(turns)} | ${cost === null ? "—" : `$${cost.toFixed(2)}`} | |`);
  }
  return out;
}

/** One output as markdown, BEFORE sanitizing. Exported so tests can prove the sanitizer leaves the report's own wording intact. */
export function renderReport(input: ReportInput, variant: Variant): string {
  const decided = dispositions(input.manifest, input.verdict, input.critic, input.plan ?? null);
  const sections = [
    headerLines(input, variant),
    headlineSection(input),
    changesSection(input, decided),
    skippedSection(input, decided, variant),
    brakesSection(input, variant),
    holdoutSection(input, variant),
    candidatesSection(input),
    dormantSection(input),
    requestIndexingSection(input, variant),
    runCostSection(input),
  ].filter((lines) => lines.length);
  return `${sections.map((lines) => lines.join("\n")).join("\n\n")}\n`;
}

/** Cut at a line boundary so the result, note included, fits in `max` characters. */
export function capLength(md: string, max: number, label: string): string {
  if (md.length <= max) return md;
  const note = `\n\n…truncated to fit a GitHub comment. Full report: \`seo/reports/${label}.md\` on the \`seo-state\` branch.\n`;
  const budget = Math.max(0, max - note.length);
  const cut = md.lastIndexOf("\n", budget);
  return `${md.slice(0, cut > 0 ? cut : budget)}${note}`;
}

export function frontmatterFor(input: ReportInput): ReportFrontmatter {
  return {
    clicks28d: finiteOrNull(input.gsc?.totals?.current?.clicks),
    impressions28d: finiteOrNull(input.gsc?.totals?.current?.impressions),
    indexed: indexedAsOf(input.indexStatus, input.today)?.indexed ?? null,
    generatedAt: input.generatedAt,
  };
}

/** Both outputs, sanitized and then redacted. Pure: every input is passed in. */
export function buildReport(input: ReportInput): { report: string; digest: string; frontmatter: ReportFrontmatter } {
  const frontmatter = frontmatterFor(input);
  const report = redactDocument(sanitizeForGithub(`${renderFrontmatter(frontmatter)}\n${renderReport(input, "report")}`));
  const digest = capLength(redactDocument(sanitizeForGithub(renderReport(input, "digest"))), DIGEST_MAX_CHARS, input.label);
  return { report, digest, frontmatter };
}

// --------------------------------------------------------------- main

type Loaded<T> = { value: T | null; problem: string | null };

function readJsonFile<T>(file: string | null): Loaded<T> {
  if (!file) return { value: null, problem: null };
  if (!existsSync(file)) return { value: null, problem: "missing" };
  try {
    return { value: JSON.parse(readFileSync(file, "utf8")) as T, problem: null };
  } catch {
    return { value: null, problem: "unreadable (not valid JSON)" };
  }
}

function dateOf(file: string | null): string | null {
  return file ? (/(\d{4}-\d{2}-\d{2})\.json$/.exec(file)?.[1] ?? null) : null;
}

function displayPath(file: string): string {
  const relative = path.relative(REPO_ROOT, file);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative) ? relative.split(path.sep).join("/") : path.basename(file);
}

export function parseMode(value: string): ReportMode {
  if (value === "review" || value === "auto") return value;
  throw new Error(`--mode must be review or auto, got "${value}"`);
}

export async function main(args: Args): Promise<number> {
  const config = loadConfig();
  const date = today();
  const { label } = isoWeek(date);
  const mode = parseMode(flagString(args, "mode") ?? (process.env.SEO_MODE?.trim() || "review"));
  let pr: number | null = null;
  if (hasFlag(args, "pr")) {
    pr = flagNumber(args, "pr", Number.NaN);
    if (!Number.isInteger(pr) || pr <= 0) throw new Error("--pr must be a positive integer");
  }

  const inputs: InputNote[] = [];
  const dated = <T>(name: string, prefix: string): T | null => {
    const file = latestDataFile(prefix);
    const loaded = readJsonFile<T>(file);
    inputs.push({ name, date: dateOf(file), problem: loaded.problem });
    return loaded.value;
  };
  const optional = <T>(name: string, flag: string): T | null => {
    const file = flagString(args, flag);
    if (!file) return null;
    const loaded = readJsonFile<unknown>(file);
    if (loaded.problem) {
      log(`report: --${flag} ${path.basename(file)} is ${loaded.problem}; reporting without it`);
      inputs.push({ name, date: null, problem: loaded.problem });
    }
    return loaded.value as T | null;
  };

  const gsc = dated<GscPull>("gsc", "gsc");
  const candidates = dated<Candidates>("candidates", "candidates");
  const brakes = dated<Brakes>("brakes", "brakes");

  const statusLoaded = readJsonFile<IndexStatus>(statePaths.indexStatus());
  const indexStatus = statusLoaded.value;
  inputs.push({
    name: "index-status",
    date: typeof indexStatus?.generatedAt === "string" ? indexStatus.generatedAt.slice(0, 10) : null,
    problem: statusLoaded.problem === "missing" ? null : statusLoaded.problem,
  });
  const halt = readJsonFile<Halt>(statePaths.halt()).value;

  let ledgerLines: LedgerLine[] = [];
  try {
    ledgerLines = readJsonl<LedgerLine>(statePaths.ledger());
  } catch (error) {
    inputs.push({ name: "ledger", date: null, problem: "unreadable" });
    log(`report: ${error instanceof Error ? error.message : String(error)}; reporting without the ledger`);
  }

  const manifest = optional<RunManifest>("manifest", "manifest");
  const verdict = optional<VerifyVerdict>("verdict", "verdict");
  const criticJson = optional<unknown>("critic", "critic");
  const summaryJson = optional<unknown>("run-summary", "run-summary");
  const planJson = optional<unknown>("plan", "plan");
  const plan = planJson === null ? null : parsePlan(planJson);
  if (planJson !== null && plan === null) {
    log("report: --plan is not a publish plan; deciding from the verdict and critic instead");
    inputs.push({ name: "plan", date: null, problem: "unreadable (not a publish plan)" });
  }

  // The run id is the workflow's, never the model's manifest (it picks this run's ledger rows).
  const runId = flagString(args, "run-id") ?? (process.env.SEO_RUN_ID?.trim() || null);
  const manifestRunId = typeof manifest?.runId === "string" && manifest.runId ? manifest.runId : null;
  if (manifestRunId && manifestRunId !== runId) log(`report: the manifest names run ${JSON.stringify(manifestRunId.slice(0, 40))}, not ${runId ?? "(none)"}; using ${runId ?? "no run id"}`);

  let previous: ReportInput["previous"] = null;
  const reportsDir = statePaths.reportsDir();
  if (existsSync(reportsDir)) {
    const name = pickPreviousReport(readdirSync(reportsDir), label);
    const frontmatter = name ? parseFrontmatter(readFileSync(path.join(reportsDir, name), "utf8")) : null;
    if (name && frontmatter) previous = { label: name.replace(/\.md$/, ""), frontmatter };
    else if (name) log(`report: ${name} has no readable frontmatter; comparing against the prior 28 days`);
  }

  const input: ReportInput = {
    today: date,
    generatedAt: new Date().toISOString(),
    label,
    base: config.site.base,
    caps: config.caps,
    gapArticlesWhileCrawlStalled: config.gates.gapArticlesWhileCrawlStalled,
    mode,
    runId,
    pr,
    gsc,
    indexStatus,
    candidates,
    brakes,
    halt,
    haltAck: process.env.SEO_HALT_ACK?.trim() || null,
    ledger: materializeLedger(ledgerLines),
    manifest,
    verdict,
    critic: criticJson === null ? null : parseCritic(criticJson),
    runCost: summaryJson === null ? null : parseRunSummary(summaryJson),
    previous,
    inputs,
    gateReason: flagString(args, "gate-reason"),
    plan,
    dataResult: flagString(args, "data-result"),
  };

  const { report, digest } = buildReport(input);
  // Publish job: only the PR body (the digest) is wanted; the weekly report
  // and the digest file are written once, by the report job.
  const prBody = flagString(args, "pr-body");
  if (prBody) {
    writeText(prBody, digest);
    log(`report: wrote the PR body (${digest.length} chars)`);
    return 0;
  }
  if (hasFlag(args, "dry-run")) {
    console.log(digest);
    return 0;
  }
  const reportFile = path.join(reportsDir, `${label}.md`);
  const digestFile = datedDataPath("digest", date, "md");
  writeText(reportFile, report);
  writeText(digestFile, digest);
  log(`report: wrote ${path.basename(reportFile)} (${report.length} chars) and ${path.basename(digestFile)} (${digest.length} chars)`);
  console.log(JSON.stringify({ report: displayPath(reportFile), digest: displayPath(digestFile), reportChars: report.length, digestChars: digest.length }));
  return 0;
}

function selfTest(): void {
  const clean = sanitizeForGithub("see #12, o/r#3 and GH-4, ping @someone, fixes https://x.test/1 <img src=x> ![p](https://t.test/p.gif) <scr<b>ipt>");
  check(!/#\d/.test(clean) && !/gh-\d/i.test(clean), "issue references are neutralized");
  check(!/@[A-Za-z]/.test(clean), "mentions are neutralized");
  check(!/\bfixes\b/i.test(clean), "closing keywords are neutralized");
  check(!/<[A-Za-z]/.test(clean) && !clean.includes("!["), "tags and images are stripped");
  check(sanitizeForGithub(clean) === clean, "the sanitizer is idempotent");

  // Built at run time: the identity sweep forbids the literal path in source.
  const runnerDir = ["", "home", "runner", "work"].join("/");
  check(oneLine(`cannot read ${runnerDir}/r/app/x.tsx`) === "cannot read ~/work/r/app/x.tsx", "a cell keeps only what follows the account directory");
  const joined = redactDocument(sanitizeForGithub(`- ${runnerDir.replace("home", "ho<i></i>me")}/r`));
  check(joined === "- ~/work/r", "a path joined by stripping a tag is redacted after sanitizing");

  const proposal = {
    runId: "r1",
    changes: [
      { path: "/blog/a", file: "a.tsx", skill: "seo-ctr", changeType: "title", summary: "" },
      { path: "/research/b", file: "b.tsx", skill: "seo-citations", changeType: "rewrite", summary: "" },
    ],
    skipped: [],
    issues: [],
  } as unknown as RunManifest;
  const tiers = { ok: true, files: [{ path: "a.tsx", tier: 1 }, { path: "b.tsx", tier: 2 }], violations: [] } as unknown as VerifyVerdict;
  const judged = dispositions(proposal, tiers, parseCritic({ verdicts: [{ file: "a.tsx", verdict: "approve" }, { file: "b.tsx", verdict: "REJECT" }] }));
  check(!judged[0].accepted && judged[1].accepted, "tier 1 needs the exact APPROVE; tier 2 ships whatever the critic said");
  check(dispositions(proposal, tiers, null)[0].reason === "no critic verdict for a tier-1 file", "with no critic file, tier 1 is dropped");

  const fm: ReportFrontmatter = { clicks28d: 24, impressions28d: 3033, indexed: 329, generatedAt: "2026-09-28T09:41:00.000Z" };
  const doc = `${renderFrontmatter(fm)}\n# t\n<!-- hidden -->`;
  const safe = sanitizeForGithub(doc);
  check(parseFrontmatter(safe)?.impressions28d === 3033, "the frontmatter survives the sanitizer");
  check(!safe.includes("hidden"), "other comments are stripped");
  check(pickPreviousReport(["2026-W38.md", "2026-W39.md", "2026-W37.md", "notes.md"], "2026-W39") === "2026-W38.md", "previous report is the newest earlier week");

  const snap = (at: string, indexed: boolean): InspectionSnapshot => ({
    inspectedAt: at,
    source: "api",
    verdict: null,
    coverageState: null,
    indexingState: null,
    robotsTxtState: null,
    pageFetchState: null,
    lastCrawlTime: null,
    googleCanonical: null,
    userCanonical: null,
    indexed,
  });
  const entry = (at: string, indexed: boolean, history: InspectionSnapshot[]): IndexStatusUrl =>
    ({ ...snap(at, indexed), url: "u", path: "/u", family: "other", firstSeenInSitemap: "2026-08-01", history }) as unknown as IndexStatusUrl;
  const status = {
    urls: {
      a: entry("2026-09-27T00:00:00Z", false, [snap("2026-09-14T00:00:00Z", true)]),
      b: entry("2026-09-27T00:00:00Z", true, []),
    },
  } as unknown as IndexStatus;
  check(indexedAsOf(status, "2026-09-28")?.indexed === 1, "now: one indexed");
  check(indexedAsOf(status, "2026-09-21")?.indexed === 1 && indexedAsOf(status, "2026-09-21")?.known === 1, "a week ago: only a was known, and indexed");

  const ledger = materializeLedger([
    { kind: "change", id: "c1", run_id: "r1", url: "/blog/a", pr: null, status: "proposed", tier: 1, change_type: "title", skill: "seo-ctr" } as unknown as LedgerChange,
    { kind: "status", id: "s1", date: "2026-09-29", ref: "c1", status: "live", pr: 57, live_at: "2026-09-29T10:00:00Z" },
  ]);
  check(ledger.changes[0].status === "live" && ledger.changes[0].pr === 57, "status events apply to their change");

  const config = loadConfig();
  const input: ReportInput = {
    today: "2026-09-28",
    generatedAt: fm.generatedAt,
    label: "2026-W40",
    base: config.site.base,
    caps: config.caps,
    gapArticlesWhileCrawlStalled: 0,
    mode: "review",
    runId: "r1",
    pr: null,
    gsc: null,
    indexStatus: status,
    candidates: null,
    brakes: null,
    halt: null,
    haltAck: null,
    ledger,
    manifest: null,
    verdict: null,
    critic: null,
    runCost: null,
    previous: null,
    inputs: [],
  };
  const { report, digest } = buildReport(input);
  const order = ["## Headline", "## Changes this run", "## Skipped and why", "## Brakes", "## Holdout this run", "## Next week's", "## Dormant skills", "## Request indexing"];
  const positions = order.map((heading) => report.indexOf(heading));
  check(positions.every((p, i) => p > 0 && (i === 0 || p > positions[i - 1])), "sections appear in the brief's order");
  check(report.includes(SIGNUPS_LINE) && digest.includes(SIGNUPS_LINE), "the sign-ups line is in both outputs");
  check(parseFrontmatter(report)?.indexed === 1, "the report starts with its frontmatter");
  check(!digest.startsWith("<!--") && digest.length <= DIGEST_MAX_CHARS, "the digest has no frontmatter and fits a comment");
  const long = capLength("line of text\n".repeat(6_000), DIGEST_MAX_CHARS, "2026-W40");
  check(long.length <= DIGEST_MAX_CHARS && long.includes("truncated"), "capLength cuts at a line and says so");
}

/** Every flag this script reads (lib/cli.ts rejects any other). */
export const CLI_FLAGS: readonly string[] = ["critic", "data-result", "dry-run", "gate-reason", "manifest", "mode", "plan", "pr", "pr-body", "run-id", "run-summary", "verdict"];

runMain(import.meta.url, main, selfTest, { flags: CLI_FLAGS });
