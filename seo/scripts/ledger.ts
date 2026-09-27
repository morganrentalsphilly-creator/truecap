/**
 * ledger.ts — seo/ledger.jsonl, the loop's append-only, hash-chained memory of
 * what it changed, when each change went live, and what happened next.
 *
 * Record kinds (lib/types.ts):
 *   change        one per accepted file × page, written by the publish job
 *                 (never by the model), status `proposed`;
 *   status        moves a change to live / void / reverted, attaches its PR,
 *                 or carries its scored outcome as JSON in `note`;
 *   holdout       the pages withheld from a run: its control group;
 *   global_event  an owner-made change that would contaminate an outcome.
 * A change's current state is its `change` line with every later `status`
 * line for it applied in file order ("materialized").
 *
 * Load-bearing constraints:
 *   - Append-only and hash-chained. hash = sha256(prev_hash + canonical JSON
 *     of the record), prev_hash = the previous line's hash or "GENESIS".
 *     `verify-chain --previous <old copy>` also proves the old bytes are a
 *     prefix of the new ones (state-push.sh runs it before every push). Every
 *     append re-verifies the chain and refuses to extend a broken one.
 *   - Nothing the model wrote decides a fact. Tier comes from the verify-static
 *     verdict, the file set from the verdict (narrowed by the publish plan),
 *     before-metrics from this run's GSC pull / index-status / crawl, and the
 *     holdout from the holdout events (this run's draw plus every page still
 *     withheld). The manifest only supplies change types and summaries for
 *     files the verdict accepted.
 *   - The holdout share (config.holdout.share) bounds the pages withheld AT
 *     ONCE, not each draw: holdouts last config.holdout.weeks and score.ts
 *     hides withheld pages from the candidates, so a draw only tops the
 *     withheld set back up to the share of (eligible + already withheld).
 *   - Outcomes are counted per decision (run × page × change type), not per
 *     entry: a new article's page, OG image and registry entries score as one.
 *   - A change whose before-window has aged out of the GSC weekly pull (16
 *     weeks) can never be scored: score-outcomes records it once as EXPIRED
 *     (outcome neutral, `expired` note) instead of re-skipping it as "not
 *     scorable yet" forever. lessons.md counts expired changes on their own,
 *     never as neutral results, and the change-type brake ignores them.
 *   - A holdout draw never takes a page the loop changed recently: a proposed
 *     change (it may go live any day) or one live within minAgeDays + 28 days
 *     (its effect is still settling while this holdout serves as a control).
 *   - Idempotent. A change id is sha1(run_id, file, path) and every event id
 *     is derived from its content, so re-running a command appends nothing new.
 *   - `url` / `urls` hold site PATHS ("/blog/x"): run-flags.ts hands holdout
 *     urls to verify-static verbatim. Readers still normalize with pathOf().
 *   - GSC outcomes are directional (a placebo split varies ~4x), so an outcome
 *     is a ratio against the run's holdout pages, and anything inside
 *     config.outcomes.neutralBandRatio is labelled neutral.
 *   - Each change also records `before_crawl`, the page's crawl facts when it
 *     was proposed (a local extension of LedgerChange). Raw crawl files are
 *     not kept between CI runs, so this is what brakes.ts compares against.
 *   - `query` is on the model's tool allow-list, so it only ever reads.
 *
 *   node seo/scripts/ledger.ts append-changes --manifest m.json --verdict v.json --run-id 123 [--plan p.json] [--pr N]
 *   node seo/scripts/ledger.ts holdout --run-id 123 [--candidates c.json] [--out active-holdout.json]
 *   node seo/scripts/ledger.ts set-status --ref <id|pr:N|run:ID> --status live|void|reverted [--live-at ISO] [--pr N]
 *   node seo/scripts/ledger.ts attach-pr --run-id 123 --pr N
 *   node seo/scripts/ledger.ts global-event --description "…" --urls /a,/b|'*' [--pr N] [--exclude-days 56]
 *   node seo/scripts/ledger.ts query [--status live,proposed] [--url /blog/x] [--since YYYY-MM-DD] [--run-id 123] [--full]
 *   node seo/scripts/ledger.ts active-holdouts [--date YYYY-MM-DD]
 *   node seo/scripts/ledger.ts score-outcomes [--dry-run]
 *   node seo/scripts/ledger.ts verify-chain [--previous <old ledger copy>]
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import type { Args } from "./lib/cli.ts";
import { check, flagNumber, flagString, hasFlag, log, runMain } from "./lib/cli.ts";
import type { SeoConfig } from "./lib/config.ts";
import { loadConfig } from "./lib/config.ts";
import { cleanChangeType } from "./lib/change-types.ts";
import { familyOf, isBrandQuery, isExcludedFromOptimization } from "./lib/family.ts";
import { sha256 } from "./lib/html.ts";
import { appendJsonl, assertPublishable, readJson, readJsonIfExists, writeJson, writeText } from "./lib/io.ts";
import { addDays, daysBetween, latestDataFile, statePaths, today } from "./lib/paths.ts";
import { toPath } from "./lib/sitemap.ts";
import { labelOutcome, mean, saltedUnit } from "./lib/stats.ts";
import type {
  Candidates,
  Crawl,
  CrawlPage,
  GscPull,
  IndexStatus,
  IndexStatusUrl,
  LedgerBefore,
  LedgerChange,
  LedgerEvent,
  RunManifest,
  Skill,
  VerifyVerdict,
} from "./lib/types.ts";

// ------------------------------------------------------------------ types

/** A page's crawl facts at one moment: what brakes.ts compares before vs after live_at. */
export type CrawlSnapshot = {
  /** Crawl.generatedAt of the crawl the facts came from. */
  crawledAt: string | null;
  status: number | null;
  noindex: boolean | null;
  canonicalIsSelf: boolean | null;
  jsonLdTypes: string[] | null;
  /** Broken internal link targets from this page; null when that crawl had no link graph. */
  brokenTargets: string[] | null;
  /** Internal link targets from this page; null without a link graph or above the cap. */
  linkTargets: string[] | null;
};

/** LedgerChange plus the local `before_crawl` and `expired` extensions (see the header). */
export type LedgerChangeRecord = LedgerChange & { before_crawl?: CrawlSnapshot | null; expired?: string | null };
export type HoldoutEvent = Extract<LedgerEvent, { kind: "holdout" }>;
export type GlobalEvent = Extract<LedgerEvent, { kind: "global_event" }>;
export type StatusEvent = Extract<LedgerEvent, { kind: "status" }>;
export type LedgerRecord = LedgerChangeRecord | LedgerEvent;
export type ChainedLine = LedgerRecord & { prev_hash: string; hash: string };

/** The JSON a scoring `status` event carries in `note`. */
export type ScoreNote = {
  type: "score";
  scored_at: string;
  outcome: "win" | "loss" | "neutral";
  /** clicks_ratio ÷ holdout_ratio; null when no holdout page was usable. */
  ratio: number | null;
  after: NonNullable<LedgerChange["after"]>;
  before_window: WeekSums;
  weeks: { before: string[]; after: string[] };
  controls: number;
};

/** The JSON a status event carries in `note` when a change can no longer be scored. */
export type ExpiredNote = { type: "expired"; at: string; reason: string };

export type Materialized = {
  changes: LedgerChangeRecord[];
  holdouts: HoldoutEvent[];
  globals: GlobalEvent[];
};

// -------------------------------------------------------------- constants

export const GENESIS = "GENESIS";
/** Days on each side of live_at that an outcome compares (the brief's "28 days after vs 28 days before"). */
export const OUTCOME_WINDOW_DAYS = 28;
export const OUTCOMES_HEADING = "## Outcomes by change type";

const LEDGER_KINDS = new Set(["change", "holdout", "global_event", "status"]);
const SKILLS: ReadonlySet<string> = new Set<Skill>([
  "seo-striking-distance",
  "seo-ctr",
  "seo-refresh",
  "seo-citations",
  "seo-internal-links",
  "seo-market-enrich",
  "seo-gap-article",
  "seo-prune",
  "seo-data-study",
]);
const CLI_STATUSES = ["live", "void", "reverted"] as const;
const RUN_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Pages with more internal links than this store no linkTargets (brakes then treats every broken link as new). */
const MAX_SNAPSHOT_LINKS = 400;

// ---------------------------------------------------------------- helpers

function sha1(text: string): string {
  return createHash("sha1").update(text).digest("hex");
}

function uniqSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort();
}

function round(value: number, digits?: number): number;
function round(value: number | null, digits?: number): number | null;
function round(value: number | null, digits = 4): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

/** "Now" as ISO-8601; pinned to midnight of SEO_TODAY so tests are reproducible. */
export function nowIso(): string {
  return process.env.SEO_TODAY ? `${today()}T00:00:00.000Z` : new Date().toISOString();
}

/** Site path for a stored url/path value: "https://usetruecap.com/blog/x/" and "/blog/x" both → "/blog/x". */
export function pathOf(value: string): string {
  const trimmed = String(value ?? "").trim();
  if (/^https?:\/\//i.test(trimmed)) return toPath(trimmed);
  const bare = trimmed.split(/[?#]/)[0];
  if (bare.length > 1) return bare.replace(/\/+$/, "") || "/";
  return bare || "/";
}

/** Validates CLI input: a path on this site ("/x" or "<base>/x"), returned as a path. */
export function parseSitePath(value: string, base: string): string {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) {
    const host = new URL(base).host;
    let url: URL;
    try {
      url = new URL(v);
    } catch {
      throw new Error(`"${v}" is not a valid URL`);
    }
    if (url.host !== host) throw new Error(`"${v}" is not on ${host}`);
    return toPath(v);
  }
  if (!v.startsWith("/") || v.startsWith("//")) throw new Error(`"${v}" is not a site path (expected /path or ${base}/path)`);
  return pathOf(v);
}

/** Model-written text: one line, no control characters, bounded, and never a credential or local path. */
function cleanText(value: unknown, max: number): string {
  const text = String(value ?? "")
    .replace(/\p{Cc}+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
  try {
    assertPublishable(text, "ledger text");
  } catch {
    return "[withheld: matched the publish tripwire]";
  }
  return text;
}

/** change_type is a grouping key for outcomes and brakes (lib/change-types.ts, shared with brakes, run flags and verify-static). */
export { cleanChangeType };

function isIsoDate(value: string): boolean {
  return DATE_RE.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
}

function toIso(value: string): string {
  const t = Date.parse(value);
  if (!Number.isFinite(t)) throw new Error(`"${value}" is not an ISO-8601 date/time`);
  return new Date(t).toISOString();
}

// ------------------------------------------------------------- hash chain

function canon(value: unknown): string | undefined {
  let v = value;
  if (v !== null && typeof v === "object" && typeof (v as { toJSON?: unknown }).toJSON === "function") {
    v = (v as { toJSON: () => unknown }).toJSON();
  }
  if (v === null) return "null";
  switch (typeof v) {
    case "string":
      return JSON.stringify(v);
    case "number":
      return Number.isFinite(v) ? JSON.stringify(v) : "null";
    case "boolean":
      return v ? "true" : "false";
    case "undefined":
    case "function":
    case "symbol":
      return undefined;
    case "bigint":
      throw new Error("canonicalJson: bigint is not JSON");
    default:
      break;
  }
  if (Array.isArray(v)) return `[${v.map((item) => canon(item) ?? "null").join(",")}]`;
  const record = v as Record<string, unknown>;
  const parts: string[] = [];
  for (const key of Object.keys(record).sort()) {
    const encoded = canon(record[key]);
    if (encoded !== undefined) parts.push(`${JSON.stringify(key)}:${encoded}`);
  }
  return `{${parts.join(",")}}`;
}

/**
 * JSON with object keys sorted recursively. Undefined-valued keys are dropped,
 * exactly as JSON.stringify drops them when the line is written, so a record
 * hashes the same before it is written and after it is read back.
 */
export function canonicalJson(value: unknown): string {
  return canon(value) ?? "null";
}

function withoutChain(record: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) if (key !== "prev_hash" && key !== "hash") out[key] = value;
  return out;
}

export function hashRecord(prevHash: string, record: object): string {
  return sha256(prevHash + canonicalJson(withoutChain(record)));
}

/** The record as a ledger line chained onto `prevHash`. */
export function chainLine<T extends LedgerRecord>(record: T, prevHash: string): T & { prev_hash: string; hash: string } {
  const clean = withoutChain(record) as T;
  return { ...clean, prev_hash: prevHash, hash: hashRecord(prevHash, clean) };
}

export type ChainVerification = { ok: boolean; lines: number; head: string; errors: string[] };

/**
 * Recompute every line's hash and link, and (with `previous`) prove the old
 * copy's bytes are a prefix of the current ones: an attacker who rewrites a
 * line and re-hashes the rest passes the first check but not the second.
 */
export function verifyChain(current: string | Uint8Array, previous: string | Uint8Array | null = null): ChainVerification {
  const cur = Buffer.from(current);
  const errors: string[] = [];
  if (previous !== null) {
    const prev = Buffer.from(previous);
    if (prev.length > cur.length || !cur.subarray(0, prev.length).equals(prev)) {
      errors.push("not an append-only extension of the previous copy: existing bytes were changed or removed");
    }
  }
  const text = cur.toString("utf8");
  if (text.length && !text.endsWith("\n")) errors.push("the file does not end with a newline (an interrupted append?)");
  const rows = text.split("\n");
  if (text.endsWith("\n") || !text.length) rows.pop();
  let expectedPrev = GENESIS;
  let count = 0;
  const changeIds = new Set<string>();
  rows.forEach((raw, i) => {
    const n = i + 1;
    if (!raw.trim()) {
      errors.push(`line ${n} is blank`);
      return;
    }
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      errors.push(`line ${n} is not valid JSON`);
      expectedPrev = "(unparseable line)";
      return;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      errors.push(`line ${n} is not a JSON object`);
      expectedPrev = "(invalid line)";
      return;
    }
    count += 1;
    const prevHash = typeof parsed.prev_hash === "string" ? parsed.prev_hash : "";
    const hash = typeof parsed.hash === "string" ? parsed.hash : "";
    if (prevHash !== expectedPrev) errors.push(`line ${n}: prev_hash does not match ${n === 1 ? GENESIS : `line ${n - 1}'s hash`}`);
    if (hash !== hashRecord(prevHash, parsed)) errors.push(`line ${n}: hash mismatch (the record was edited)`);
    if (typeof parsed.kind !== "string" || !LEDGER_KINDS.has(parsed.kind)) errors.push(`line ${n}: unknown kind ${JSON.stringify(parsed.kind)}`);
    if (parsed.kind === "change" && typeof parsed.id === "string") {
      if (changeIds.has(parsed.id)) errors.push(`line ${n}: duplicate change id ${parsed.id.slice(0, 12)}`);
      changeIds.add(parsed.id);
    }
    expectedPrev = hash;
  });
  return { ok: errors.length === 0, lines: count, head: count ? expectedPrev : GENESIS, errors };
}

export type LoadedLedger = { lines: ChainedLine[]; verification: ChainVerification };

/** Parse ledger bytes. Unparseable lines are skipped here; verifyChain reports them. */
export function parseLedger(bytes: string | Uint8Array): ChainedLine[] {
  const text = typeof bytes === "string" ? bytes : Buffer.from(bytes).toString("utf8");
  const out: ChainedLine[] = [];
  for (const raw of text.split("\n")) {
    if (!raw.trim()) continue;
    try {
      out.push(JSON.parse(raw) as ChainedLine);
    } catch {
      /* reported by verifyChain */
    }
  }
  return out;
}

export function readLedger(file: string = statePaths.ledger()): LoadedLedger {
  const bytes = existsSync(file) ? readFileSync(file) : Buffer.alloc(0);
  return { lines: parseLedger(bytes), verification: verifyChain(bytes) };
}

function assertAppendable(ledger: LoadedLedger): void {
  if (!ledger.verification.ok) {
    throw new Error(`refusing to append to a broken ledger: ${ledger.verification.errors.slice(0, 3).join("; ")}`);
  }
}

function appendRecords(file: string, ledger: LoadedLedger, records: LedgerRecord[]): ChainedLine[] {
  assertAppendable(ledger);
  let prev = ledger.verification.head;
  const lines = records.map((record) => {
    const line = chainLine(record, prev);
    prev = line.hash;
    return line;
  });
  appendJsonl(file, lines);
  return lines;
}

/** Content-derived id for an event: the same event appended twice has the same id. */
export function eventId(event: LedgerEvent): string {
  return sha1(canonicalJson({ ...event, id: undefined }));
}

export function changeId(runId: string, file: string, path: string): string {
  return sha1([runId, file, path].join("\n"));
}

// ------------------------------------------------------------ materialize

export function parseScoreNote(note: string | undefined): ScoreNote | null {
  if (!note || !note.startsWith("{")) return null;
  try {
    const value = JSON.parse(note) as Partial<ScoreNote>;
    if (value?.type !== "score" || !value.after) return null;
    if (value.outcome !== "win" && value.outcome !== "loss" && value.outcome !== "neutral") return null;
    return value as ScoreNote;
  } catch {
    return null;
  }
}

export function parseExpiredNote(note: string | undefined): ExpiredNote | null {
  if (!note || !note.startsWith("{")) return null;
  try {
    const value = JSON.parse(note) as Partial<ExpiredNote>;
    if (value?.type !== "expired" || typeof value.reason !== "string" || typeof value.at !== "string") return null;
    return value as ExpiredNote;
  } catch {
    return null;
  }
}

/** Change records with their status events applied in file order, plus the holdout and global events. */
export function materialize(lines: readonly LedgerRecord[]): Materialized {
  const changes = new Map<string, LedgerChangeRecord>();
  const holdouts: HoldoutEvent[] = [];
  const globals: GlobalEvent[] = [];
  for (const line of lines) {
    if (line.kind === "change") {
      if (!changes.has(line.id)) changes.set(line.id, structuredClone(withoutChain(line)) as LedgerChangeRecord);
    } else if (line.kind === "holdout") {
      holdouts.push(structuredClone(withoutChain(line)) as HoldoutEvent);
    } else if (line.kind === "global_event") {
      globals.push(structuredClone(withoutChain(line)) as GlobalEvent);
    } else if (line.kind === "status") {
      const prRef = /^pr:(\d+)$/.exec(line.ref);
      const targets = prRef ? [...changes.values()].filter((c) => c.pr === Number(prRef[1])) : [changes.get(line.ref)].filter((c): c is LedgerChangeRecord => Boolean(c));
      for (const change of targets) {
        change.status = line.status;
        if (typeof line.pr === "number") change.pr = line.pr;
        if (line.live_at) change.live_at = line.live_at;
        if (line.status === "reverted") change.reverted = true;
        const score = parseScoreNote(line.note);
        if (score) {
          change.outcome = score.outcome;
          change.after = score.after;
          change.scored_at = score.scored_at;
        }
        const expired = parseExpiredNote(line.note);
        if (expired && change.outcome === "pending") {
          change.outcome = "neutral";
          change.scored_at = expired.at;
          change.expired = expired.reason;
        }
      }
    }
  }
  return { changes: [...changes.values()], holdouts, globals };
}

/** Paths withheld by a holdout event whose `until` has not passed on `date`. */
export function activeHoldoutPaths(holdouts: readonly HoldoutEvent[], date: string): string[] {
  const out = new Set<string>();
  for (const event of holdouts) if (event.until.slice(0, 10) >= date && event.date.slice(0, 10) <= date) for (const url of event.urls) out.add(pathOf(url));
  return [...out].sort();
}

/**
 * The control pages a run's changes carry: its own holdout draw plus every
 * page still withheld by an earlier run on `date`. Those are untreated too
 * (score.ts never offers them and verify-static rejects edits to them), and
 * because a draw only tops the withheld share back up, most runs draw few or
 * no pages of their own. holdoutControls later drops any control whose own
 * change went live inside the comparison window.
 */
export function runControls(holdouts: readonly HoldoutEvent[], runId: string, date: string): string[] {
  const own = holdouts.filter((h) => h.run_id === runId).flatMap((h) => h.urls);
  return uniqSorted([...own.map(pathOf), ...activeHoldoutPaths(holdouts, date)]);
}

/** `<id>`, a unique id prefix (≥8 chars), `pr:<N>` or `run:<run id>` → the changes it names. */
export function resolveRef(ref: string, changes: readonly LedgerChangeRecord[]): LedgerChangeRecord[] {
  const pr = /^pr:(\d+)$/.exec(ref);
  if (pr) return changes.filter((c) => c.pr === Number(pr[1]));
  if (ref.startsWith("run:")) return changes.filter((c) => c.run_id === ref.slice(4));
  const exact = changes.filter((c) => c.id === ref);
  if (exact.length) return exact;
  if (/^[0-9a-f]{8,}$/.test(ref)) {
    const prefixed = changes.filter((c) => c.id.startsWith(ref));
    if (prefixed.length > 1) throw new Error(`--ref ${ref} is ambiguous (${prefixed.length} changes); use more characters`);
    return prefixed;
  }
  return [];
}

// ------------------------------------------------------- run-time inputs

export type MetricInputs = { gsc: GscPull | null; indexStatus: IndexStatus | null; crawl: Crawl | null };

const indexCache = new WeakMap<IndexStatus, Map<string, IndexStatusUrl>>();

/** The index-status entry for a path (the file is keyed by full URL). */
export function indexEntry(indexStatus: IndexStatus | null, path: string): IndexStatusUrl | null {
  if (!indexStatus) return null;
  let byPath = indexCache.get(indexStatus);
  if (!byPath) {
    byPath = new Map();
    for (const [key, entry] of Object.entries(indexStatus.urls ?? {})) byPath.set(pathOf(entry.path ?? key), entry);
    indexCache.set(indexStatus, byPath);
  }
  return byPath.get(path) ?? null;
}

type CrawlIndex = { pages: Map<string, CrawlPage>; broken: Map<string, Set<string>> | null; edges: Map<string, Set<string>> | null };
const crawlCache = new WeakMap<Crawl, CrawlIndex>();

function crawlIndexOf(crawl: Crawl): CrawlIndex {
  let index = crawlCache.get(crawl);
  if (index) return index;
  const pages = new Map<string, CrawlPage>();
  for (const page of crawl.pages ?? []) pages.set(pathOf(page.path), page);
  const graph = crawl.linkGraph?.ran === true;
  const group = (pairs: Array<{ from: string; target: string }>): Map<string, Set<string>> => {
    const out = new Map<string, Set<string>>();
    for (const pair of pairs) {
      const from = pathOf(pair.from);
      const set = out.get(from) ?? new Set<string>();
      set.add(pathOf(pair.target));
      out.set(from, set);
    }
    return out;
  };
  index = {
    pages,
    broken: graph ? group(crawl.issues?.brokenInternalLinks ?? []) : null,
    edges: graph ? group(crawl.linkGraph.edges ?? []) : null,
  };
  crawlCache.set(crawl, index);
  return index;
}

/** A page's facts in one crawl, or null when the crawl did not include it. */
export function crawlSnapshot(crawl: Crawl | null, path: string): CrawlSnapshot | null {
  if (!crawl) return null;
  const index = crawlIndexOf(crawl);
  const page = index.pages.get(path);
  if (!page) return null;
  const links = index.edges ? [...(index.edges.get(path) ?? [])].sort() : null;
  return {
    crawledAt: crawl.generatedAt ?? null,
    status: typeof page.status === "number" ? page.status : null,
    noindex: typeof page.noindex === "boolean" ? page.noindex : null,
    canonicalIsSelf: typeof page.canonicalIsSelf === "boolean" ? page.canonicalIsSelf : null,
    jsonLdTypes: Array.isArray(page.jsonLdTypes) ? [...page.jsonLdTypes].sort() : null,
    brokenTargets: index.broken ? [...(index.broken.get(path) ?? [])].sort() : null,
    linkTargets: links && links.length <= MAX_SNAPSHOT_LINKS ? links : null,
  };
}

function gscPageRow(gsc: GscPull | null, path: string): { clicks: number; impressions: number; position: number | null } | null {
  let clicks = 0;
  let impressions = 0;
  let weighted = 0;
  let found = false;
  for (const row of gsc?.pages?.current ?? []) {
    if (pathOf(row.page) !== path) continue;
    found = true;
    clicks += row.clicks;
    impressions += row.impressions;
    weighted += row.position * row.impressions;
  }
  if (!found) return null;
  return { clicks, impressions, position: impressions > 0 ? round(weighted / impressions, 2) : null };
}

/** The page's index and content state now (the non-traffic half of LedgerBefore). */
export function currentState(path: string, inputs: MetricInputs): Pick<LedgerBefore, "indexed" | "coverageState" | "lastCrawlTime" | "mainHash"> {
  const entry = indexEntry(inputs.indexStatus, path) as (IndexStatusUrl & { mainHash?: string | null }) | null;
  const page = inputs.crawl ? crawlIndexOf(inputs.crawl).pages.get(path) : undefined;
  return {
    indexed: typeof entry?.indexed === "boolean" ? entry.indexed : null,
    coverageState: entry?.coverageState ?? null,
    lastCrawlTime: entry?.lastCrawlTime ?? null,
    mainHash: page?.mainHash ?? entry?.mainHash ?? null,
  };
}

/** Before-metrics from this run's data — never from the manifest. */
export function beforeMetrics(path: string, inputs: MetricInputs): LedgerBefore {
  const row = gscPageRow(inputs.gsc, path);
  return {
    clicks_28d: row?.clicks ?? 0,
    impressions_28d: row?.impressions ?? 0,
    position: row?.position ?? null,
    ...currentState(path, inputs),
  };
}

// --------------------------------------------------------- append-changes

export type AppendInput = {
  runId: string;
  date: string;
  pr: number | null;
  manifest: RunManifest;
  verdict: VerifyVerdict;
  /** Files the publish plan kept (critic drops removed); null = every verdict file. */
  include: ReadonlySet<string> | null;
  holdout: readonly string[];
  metrics: MetricInputs;
  existingIds: ReadonlySet<string>;
};

export type AppendResult = { entries: LedgerChangeRecord[]; skipped: Array<{ file: string; path: string | null; reason: string }> };

function manifestPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const path = pathOf(value);
  return path.startsWith("/") ? path : null;
}

/**
 * Change entries for the files verify-static accepted. Throws rather than
 * recording something unattributable: a verdict that is not ok, an accepted
 * file the manifest never declared, or an unknown skill.
 */
export function buildChangeEntries(input: AppendInput): AppendResult {
  const { verdict, manifest } = input;
  if (!verdict.ok) throw new Error(`the verify-static verdict is not ok (${verdict.violations?.length ?? 0} violation(s)); nothing is recorded`);
  const declaredUrls = new Set((verdict.declaredUrls ?? []).map(pathOf));
  const byFile = new Map<string, RunManifest["changes"]>();
  for (const change of manifest.changes ?? []) {
    const file = String(change.file ?? "").replace(/^\.\//, "");
    byFile.set(file, [...(byFile.get(file) ?? []), change]);
  }
  const holdout = uniqSorted(input.holdout.map(pathOf));
  const seen = new Set(input.existingIds);
  const entries: LedgerChangeRecord[] = [];
  const skipped: AppendResult["skipped"] = [];

  for (const file of [...verdict.files].sort((a, b) => a.path.localeCompare(b.path))) {
    const derived = file.url ? pathOf(file.url) : null;
    if (input.include && !input.include.has(file.path)) {
      skipped.push({ file: file.path, path: derived, reason: "not in the publish plan (dropped after verification)" });
      continue;
    }
    if (file.tier !== 0 && file.tier !== 1 && file.tier !== 2) throw new Error(`verdict gives ${file.path} an invalid tier ${JSON.stringify(file.tier)}`);
    const declared = byFile.get(file.path) ?? [];
    if (!declared.length) throw new Error(`verify-static accepted ${file.path} but the run manifest declares no change for it; refusing to record an unattributed change`);

    const targets: Array<{ path: string; changes: RunManifest["changes"] }> = [];
    if (derived) {
      // A page file maps to exactly one URL; the verdict's derivation wins over the manifest's claim.
      const matching = declared.filter((c) => manifestPath(c.path) === derived);
      if (!matching.length) skipped.push({ file: file.path, path: manifestPath(declared[0].path), reason: `manifest path ignored: the file maps to ${derived}` });
      targets.push({ path: derived, changes: matching.length ? matching : declared });
    } else {
      // Shared files (datasets, registries) name their pages in the manifest; each must be a declared URL.
      const byPath = new Map<string, RunManifest["changes"]>();
      for (const change of declared) {
        const path = manifestPath(change.path);
        if (!path) {
          skipped.push({ file: file.path, path: null, reason: `manifest path ${JSON.stringify(change.path)} is not a site path` });
          continue;
        }
        byPath.set(path, [...(byPath.get(path) ?? []), change]);
      }
      for (const [path, changes] of [...byPath].sort(([a], [b]) => a.localeCompare(b))) {
        if (!declaredUrls.has(path)) {
          skipped.push({ file: file.path, path, reason: "not among the verdict's declared URLs" });
          continue;
        }
        targets.push({ path, changes });
      }
    }

    for (const target of targets) {
      const primary = target.changes[0];
      if (!SKILLS.has(primary.skill)) throw new Error(`the manifest change for ${file.path} names an unknown skill ${JSON.stringify(primary.skill)}`);
      const id = changeId(input.runId, file.path, target.path);
      if (seen.has(id)) {
        skipped.push({ file: file.path, path: target.path, reason: "already recorded" });
        continue;
      }
      seen.add(id);
      entries.push({
        kind: "change",
        id,
        run_id: input.runId,
        date: input.date,
        url: target.path,
        file: file.path,
        tier: file.tier,
        change_type: cleanChangeType(primary.changeType),
        skill: primary.skill,
        summary: cleanText(uniqSorted(target.changes.map((c) => cleanText(c.summary, 300))).join(" / "), 600),
        pr: input.pr,
        status: "proposed",
        live_at: null,
        before: beforeMetrics(target.path, input.metrics),
        holdout,
        scored_at: null,
        after: null,
        outcome: "pending",
        reverted: false,
        before_crawl: crawlSnapshot(input.metrics.crawl, target.path),
      });
    }
  }
  return { entries, skipped };
}

// ---------------------------------------------------------------- holdout

/** Crawl-age stratum from lastCrawlTime: "<30d", "<90d", ">=90d" (config buckets) or "never". */
export function crawlAgeBucket(lastCrawlTime: string | null, date: string, bucketsDays: readonly number[]): string {
  if (!lastCrawlTime) return "never";
  const age = daysBetween(lastCrawlTime, date);
  if (!Number.isFinite(age)) return "never";
  const sorted = [...bucketsDays].sort((a, b) => a - b);
  for (const bucket of sorted) if (age < bucket) return `<${bucket}d`;
  return `>=${sorted[sorted.length - 1] ?? 0}d`;
}

const SHARE_EPS = 1e-9;

/** ceil(share × n), without floating point turning 0.2 × 15 into 4. */
function ceilShare(share: number, n: number): number {
  return Math.min(n, Math.max(0, Math.ceil(share * n - SHARE_EPS)));
}

/**
 * Proportional stratified allocation (largest remainder): ceil(share × N)
 * seats in total — or exactly `seats` when given — each stratum gets its
 * floor and the leftover seats go to the largest remainders, ties broken by
 * salted hash. A per-stratum ceil would withhold every page of every one-page
 * stratum.
 */
export function allocateQuotas(sizes: ReadonlyMap<string, number>, share: number, salt: string, seats?: number): Map<string, number> {
  const EPS = SHARE_EPS;
  const total = [...sizes.values()].reduce((a, b) => a + b, 0);
  const target = seats === undefined ? ceilShare(share, total) : Math.min(total, Math.max(0, Math.floor(seats)));
  // With an explicit seat count, each stratum's exact share is seats × n / N, so the remainders sum to exactly the seats left.
  const rate = seats === undefined ? share : total > 0 ? target / total : 0;
  const quotas = new Map<string, number>();
  const remainders: Array<{ key: string; n: number; rem: number; tie: number }> = [];
  let assigned = 0;
  for (const [key, n] of sizes) {
    const exact = rate * n;
    const base = Math.min(n, Math.max(0, Math.floor(exact + EPS)));
    quotas.set(key, base);
    assigned += base;
    remainders.push({ key, n, rem: exact - base, tie: saltedUnit(salt, `stratum:${key}`) });
  }
  remainders.sort((a, b) => b.rem - a.rem || a.tie - b.tie || a.key.localeCompare(b.key));
  for (const r of remainders) {
    if (assigned >= target) break;
    const q = quotas.get(r.key) ?? 0;
    if (r.rem > EPS && q < r.n) {
      quotas.set(r.key, q + 1);
      assigned += 1;
    }
  }
  return quotas;
}

export type HoldoutInput = {
  candidatePaths: readonly string[];
  salt: string;
  share: number;
  stratumOf: (path: string) => string;
  /** Why a page must never be withheld, or null. */
  protectReason: (path: string) => string | null;
  /**
   * Every page in an active holdout (activeHoldoutPaths on the run date). They
   * keep it, are not redrawn, and COUNT toward the share: score.ts drops them
   * from the candidates, so without counting them each weekly draw would take
   * 20% of what is left and eight overlapping draws would withhold ~62%.
   */
  active: ReadonlySet<string>;
  isExcluded: (path: string) => boolean;
};

export type HoldoutPlan = {
  drawn: string[];
  protected: Array<{ path: string; why: string }>;
  alreadyWithheld: string[];
  excluded: string[];
  strata: Array<{ stratum: string; pool: number; quota: number }>;
  /** Pages already withheld before this draw (the active set). */
  activeBefore: number;
  /** ceil(share × (eligible + activeBefore)): the most pages withheld at once after this draw. */
  target: number;
};

/**
 * This run's holdout draw. The share applies to the eligible pool PLUS the
 * pages already withheld, and only the shortfall is drawn:
 * target = ceil(share × (|E| + |A|)), new draws = max(0, target − |A|),
 * spread over family × crawl-age strata by allocateQuotas.
 */
export function planHoldout(input: HoldoutInput): HoldoutPlan {
  const plan: HoldoutPlan = { drawn: [], protected: [], alreadyWithheld: [], excluded: [], strata: [], activeBefore: input.active.size, target: 0 };
  const byStratum = new Map<string, string[]>();
  for (const path of uniqSorted(input.candidatePaths.map(pathOf))) {
    if (input.active.has(path)) {
      plan.alreadyWithheld.push(path);
      continue;
    }
    if (input.isExcluded(path)) {
      plan.excluded.push(path);
      continue;
    }
    const why = input.protectReason(path);
    if (why) {
      plan.protected.push({ path, why });
      continue;
    }
    const key = input.stratumOf(path);
    byStratum.set(key, [...(byStratum.get(key) ?? []), path]);
  }
  const sizes = new Map([...byStratum].map(([key, paths]) => [key, paths.length]));
  const eligible = [...sizes.values()].reduce((a, b) => a + b, 0);
  plan.target = ceilShare(input.share, eligible + plan.activeBefore);
  const seats = Math.max(0, Math.min(eligible, plan.target - plan.activeBefore));
  const quotas = allocateQuotas(sizes, input.share, input.salt, seats);
  for (const [stratum, paths] of [...byStratum].sort(([a], [b]) => a.localeCompare(b))) {
    const quota = quotas.get(stratum) ?? 0;
    const ranked = [...paths].sort((a, b) => saltedUnit(input.salt, a) - saltedUnit(input.salt, b) || a.localeCompare(b));
    plan.drawn.push(...ranked.slice(0, quota));
    plan.strata.push({ stratum, pool: paths.length, quota });
  }
  plan.drawn.sort();
  return plan;
}

/**
 * Pages that are not untreated controls because the loop changed them: a
 * proposed change (it may go live any day, inside this holdout's span), or a
 * live or reverted one that went live fewer than `settleDays` days before
 * `date` (config.outcomes.minAgeDays + OUTCOME_WINDOW_DAYS: its effect is
 * still settling during the windows this holdout's changes are compared
 * over). holdoutControls' ±28-day filter only catches a control changed
 * INSIDE a window; this keeps a still-settling page out of the draw.
 */
export function recentlyTreated(changes: readonly LedgerChangeRecord[], date: string, settleDays: number): Map<string, string> {
  const out = new Map<string, string>();
  for (const change of changes) {
    const path = pathOf(change.url);
    if (change.status === "proposed") out.set(path, `a loop change is proposed for it (run ${change.run_id})`);
    else if ((change.status === "live" || change.status === "reverted") && change.live_at) {
      const age = daysBetween(change.live_at, date);
      if (age < settleDays && !out.has(path)) out.set(path, `a loop change went live ${age} day(s) ago (under ${settleDays}): not an untreated control`);
    }
  }
  return out;
}

/** config.holdout.neverWithhold: pages with real traffic are never used as controls. */
export function holdoutProtection(gsc: GscPull | null, candidates: Candidates, cfg: SeoConfig): (path: string) => string | null {
  const rule = cfg.holdout.neverWithhold;
  const impressions = new Map<string, number>();
  const nonBrandClick = new Set<string>();
  for (const row of gsc?.pages?.current ?? []) {
    const p = pathOf(row.page);
    impressions.set(p, (impressions.get(p) ?? 0) + row.impressions);
  }
  for (const row of gsc?.pageQueries?.current ?? []) if (row.clicks > 0 && !isBrandQuery(row.query)) nonBrandClick.add(pathOf(row.page));
  for (const candidate of candidates.candidates ?? []) {
    const p = pathOf(candidate.path);
    impressions.set(p, Math.max(impressions.get(p) ?? 0, candidate.metrics?.impressions28d ?? 0));
    for (const q of candidate.topQueries ?? []) if (q.clicks > 0 && !isBrandQuery(q.query)) nonBrandClick.add(p);
  }
  return (path) => {
    const impr = impressions.get(path) ?? 0;
    if (impr >= rule.minImpressions28d) return `${Math.round(impr)} impressions in 28 days (never withheld at ≥${rule.minImpressions28d})`;
    if (rule.anyNonBrandClick && nonBrandClick.has(path)) return "has a non-brand click in 28 days";
    return null;
  };
}

/** Stratum = family × crawl-age bucket (from index-status lastCrawlTime). */
export function holdoutStratum(indexStatus: IndexStatus | null, date: string, bucketsDays: readonly number[]): (path: string) => string {
  return (path) => `${familyOf(path)}|${crawlAgeBucket(indexEntry(indexStatus, path)?.lastCrawlTime ?? null, date, bucketsDays)}`;
}

// --------------------------------------------------------- weekly windows

export type WeekSums = { clicks: number; impressions: number; position: number | null };
type WeekRow = { clicks: number; impressions: number; weighted: number };
const weeklyCache = new WeakMap<GscPull, Map<string, Map<string, WeekRow>>>();

/** Mondays of every complete Monday–Sunday week inside [start, end] (inclusive dates). */
export function calendarFullWeeks(start: string, end: string): string[] {
  const out: string[] = [];
  const dow = new Date(`${start}T00:00:00Z`).getUTCDay();
  let monday = addDays(start, (8 - dow) % 7);
  while (addDays(monday, 6) <= end) {
    out.push(monday);
    monday = addDays(monday, 7);
  }
  return out;
}

function weeklyIndex(gsc: GscPull): Map<string, Map<string, WeekRow>> {
  let index = weeklyCache.get(gsc);
  if (index) return index;
  index = new Map();
  for (const row of gsc.weekly?.rows ?? []) {
    const path = pathOf(row.page);
    const byWeek = index.get(path) ?? new Map<string, WeekRow>();
    const acc = byWeek.get(row.weekStart) ?? { clicks: 0, impressions: 0, weighted: 0 };
    acc.clicks += row.clicks;
    acc.impressions += row.impressions;
    acc.weighted += row.position * row.impressions;
    byWeek.set(row.weekStart, acc);
    index.set(path, byWeek);
  }
  weeklyCache.set(gsc, index);
  return index;
}

/** Clicks, impressions and impression-weighted position of a page over some weeks (absent rows are zero). */
export function sumWeeks(gsc: GscPull, path: string, weeks: readonly string[]): WeekSums {
  const byWeek = weeklyIndex(gsc).get(path);
  let clicks = 0;
  let impressions = 0;
  let weighted = 0;
  for (const week of weeks) {
    const row = byWeek?.get(week);
    if (!row) continue;
    clicks += row.clicks;
    impressions += row.impressions;
    weighted += row.weighted;
  }
  return { clicks, impressions, position: impressions > 0 ? round(weighted / impressions, 2) : null };
}

/**
 * The change's holdout pages usable as controls: not the page itself, and not
 * a page that had its own change go live within the comparison window (it
 * would no longer be untreated).
 */
export function holdoutControls(change: LedgerChangeRecord, allChanges: readonly LedgerChangeRecord[]): string[] {
  const own = pathOf(change.url);
  const live = change.live_at?.slice(0, 10);
  if (!live) return [];
  const touched = new Set(
    allChanges
      .filter((c) => c.id !== change.id && c.live_at && Math.abs(daysBetween(live, c.live_at)) <= OUTCOME_WINDOW_DAYS)
      .map((c) => pathOf(c.url)),
  );
  return uniqSorted((change.holdout ?? []).map(pathOf)).filter((p) => p !== own && !touched.has(p));
}

export type HoldoutComparison = {
  beforeWeeks: string[];
  afterWeeks: string[];
  url: { before: WeekSums; after: WeekSums };
  controls: string[];
  /** (url clicks after + 1) / (url clicks before + 1). */
  clicksRatio: number;
  /** Mean over controls of the same ratio; null without a usable control. */
  holdoutRatio: number | null;
  /** clicksRatio ÷ holdoutRatio. */
  ratio: number | null;
};

/**
 * Compare a live change's clicks in the complete GSC weeks after live_at with
 * the complete weeks before it, against the same ratio for its holdout pages.
 * The live day itself is in neither window. Both sides use the same number of
 * weeks (the ones nearest live_at), so a 3-vs-4-week split cannot bias it.
 * `requireCompleteWindows` (outcome scoring) demands every full week of both
 * 28-day windows be in the pull; the brake takes what exists so far.
 */
export function compareToHoldout(
  change: LedgerChangeRecord,
  gsc: GscPull,
  allChanges: readonly LedgerChangeRecord[],
  options: { requireCompleteWindows: boolean },
): HoldoutComparison | { error: string } {
  if (!change.live_at) return { error: "no live_at" };
  const live = change.live_at.slice(0, 10);
  const available = new Set(gsc.weekly?.weeks ?? []);
  const beforeCal = calendarFullWeeks(addDays(live, -OUTCOME_WINDOW_DAYS), addDays(live, -1));
  const afterCal = calendarFullWeeks(addDays(live, 1), addDays(live, OUTCOME_WINDOW_DAYS));
  let before = beforeCal.filter((w) => available.has(w));
  let after = afterCal.filter((w) => available.has(w));
  if (options.requireCompleteWindows && (before.length !== beforeCal.length || after.length !== afterCal.length)) {
    return { error: `the GSC weekly pull does not cover both ${OUTCOME_WINDOW_DAYS}-day windows around ${live}` };
  }
  const k = Math.min(before.length, after.length);
  if (k === 0) return { error: `no complete GSC week on both sides of ${live} yet` };
  before = before.slice(before.length - k);
  after = after.slice(0, k);
  const path = pathOf(change.url);
  const url = { before: sumWeeks(gsc, path, before), after: sumWeeks(gsc, path, after) };
  const controls = holdoutControls(change, allChanges);
  const holdoutRatio = mean(controls.map((c) => (sumWeeks(gsc, c, after).clicks + 1) / (sumWeeks(gsc, c, before).clicks + 1)));
  const clicksRatio = (url.after.clicks + 1) / (url.before.clicks + 1);
  const ratio = holdoutRatio !== null && holdoutRatio > 0 ? clicksRatio / holdoutRatio : null;
  return { beforeWeeks: before, afterWeeks: after, url, controls, clicksRatio, holdoutRatio, ratio };
}

// --------------------------------------------------------- score-outcomes

/**
 * The global event that contaminates this change's outcome, if any: it covers
 * the page (or "*") and its [date, exclude_until] span overlaps the change's
 * after-window [live, live + 28d]. That includes the brief's "covering the URL
 * at live_at" and also an owner change landing mid-window.
 */
export function globalEventCovering(change: LedgerChangeRecord, globals: readonly GlobalEvent[]): GlobalEvent | null {
  if (!change.live_at) return null;
  const live = change.live_at.slice(0, 10);
  const afterEnd = addDays(live, OUTCOME_WINDOW_DAYS);
  const path = pathOf(change.url);
  for (const event of globals) {
    const covers = event.urls.some((u) => u === "*" || pathOf(u) === path);
    if (covers && event.date.slice(0, 10) <= afterEnd && event.exclude_until.slice(0, 10) >= live) return event;
  }
  return null;
}

export type ScoreContext = {
  gsc: GscPull;
  today: string;
  cfg: SeoConfig;
  now: string;
  current: (path: string) => Pick<LedgerBefore, "indexed" | "coverageState" | "lastCrawlTime" | "mainHash">;
};

/**
 * Why a change can never be scored, or null: the first complete week of its
 * 28-day before-window is older than the oldest week the GSC weekly pull
 * holds. The pull only moves forward, so that week never comes back.
 */
export function beforeWindowExpired(change: LedgerChangeRecord, gsc: GscPull): string | null {
  if (!change.live_at) return null;
  const weeks = [...(gsc.weekly?.weeks ?? [])].sort();
  if (!weeks.length) return null;
  const live = change.live_at.slice(0, 10);
  const beforeCal = calendarFullWeeks(addDays(live, -OUTCOME_WINDOW_DAYS), addDays(live, -1));
  if (!beforeCal.length || beforeCal[0] >= weeks[0]) return null;
  return `expired: the ${OUTCOME_WINDOW_DAYS} days before ${live} (from week ${beforeCal[0]}) are no longer in the GSC weekly pull (from week ${weeks[0]})`;
}

export function scoreChange(change: LedgerChangeRecord, m: Materialized, ctx: ScoreContext): { note: ScoreNote } | { skip: string } | { expired: string } {
  if (change.status !== "live") return { skip: `status is ${change.status}` };
  if (change.outcome !== "pending") return { skip: `already scored (${change.outcome})` };
  if (!change.live_at) return { skip: "live without live_at" };
  const age = daysBetween(change.live_at, ctx.today);
  if (age < ctx.cfg.outcomes.minAgeDays) return { skip: `live ${age} of the ${ctx.cfg.outcomes.minAgeDays} days before scoring` };
  const event = globalEventCovering(change, m.globals);
  if (event) return { skip: `excluded by global event ${event.id.slice(0, 12)} (${event.description.slice(0, 80)})` };
  const expired = beforeWindowExpired(change, ctx.gsc);
  if (expired) return { expired };
  const cmp = compareToHoldout(change, ctx.gsc, m.changes, { requireCompleteWindows: true });
  if ("error" in cmp) return { skip: cmp.error };
  const state = ctx.current(pathOf(change.url));
  return {
    note: {
      type: "score",
      scored_at: ctx.now,
      outcome: labelOutcome(cmp.ratio),
      ratio: round(cmp.ratio),
      after: {
        clicks_28d: cmp.url.after.clicks,
        impressions_28d: cmp.url.after.impressions,
        position: cmp.url.after.position,
        ...state,
        holdout_ratio: round(cmp.holdoutRatio),
        clicks_ratio: round(cmp.clicksRatio),
      },
      before_window: cmp.url.before,
      weeks: { before: cmp.beforeWeeks, after: cmp.afterWeeks },
      controls: cmp.controls.length,
    },
  };
}

export type OutcomeRun = {
  events: StatusEvent[];
  scored: Array<{ id: string; path: string; change_type: string; outcome: ScoreNote["outcome"]; ratio: number | null; controls: number }>;
  /** Changes recorded as never scorable this run (terminal, reported apart from scored outcomes). */
  expired: Array<{ id: string; path: string; change_type: string; reason: string }>;
  skipped: Array<{ id: string; path: string; reason: string }>;
};

/** Score every live, pending change that is old enough; one `status` event (note = ScoreNote) each. */
export function scoreOutcomes(m: Materialized, ctx: ScoreContext): OutcomeRun {
  const run: OutcomeRun = { events: [], scored: [], expired: [], skipped: [] };
  for (const change of m.changes) {
    if (change.status !== "live" || change.outcome !== "pending") continue;
    const path = pathOf(change.url);
    const result = scoreChange(change, m, ctx);
    if ("skip" in result) {
      run.skipped.push({ id: change.id, path, reason: result.skip });
      continue;
    }
    if ("expired" in result) {
      const note: ExpiredNote = { type: "expired", at: ctx.now, reason: result.expired };
      const event: StatusEvent = { kind: "status", id: "", date: ctx.today, ref: change.id, status: change.status, note: JSON.stringify(note) };
      event.id = eventId(event);
      run.events.push(event);
      run.expired.push({ id: change.id, path, change_type: change.change_type, reason: result.expired });
      continue;
    }
    const event: StatusEvent = { kind: "status", id: "", date: ctx.today, ref: change.id, status: change.status, note: JSON.stringify(result.note) };
    event.id = eventId(event);
    run.events.push(event);
    run.scored.push({ id: change.id, path, change_type: change.change_type, outcome: result.note.outcome, ratio: result.note.ratio, controls: result.note.controls });
  }
  return run;
}

/**
 * One decision the loop made: every change entry of one run on one page under
 * one change type. append-changes writes an entry per accepted file × page, so
 * a new article (page.tsx, opengraph-image.tsx, lib/blog-posts.ts) is three
 * entries that score-outcomes labels identically from the same URL and
 * controls. Counting entries would make one losing article three losses.
 */
export type OutcomeUnit = {
  run_id: string;
  path: string;
  change_type: string;
  ids: string[];
  /** The siblings' scored outcome (identical by construction), else "pending". */
  outcome: LedgerChange["outcome"];
  /** Any sibling is live. */
  live: boolean;
  /** Any sibling was reverted. */
  reverted: boolean;
  /** The siblings were recorded as never scorable (outcome reads neutral, but it is no result). */
  expired: boolean;
};

export function outcomeUnits(changes: readonly LedgerChangeRecord[]): OutcomeUnit[] {
  const units = new Map<string, OutcomeUnit>();
  for (const change of changes) {
    const path = pathOf(change.url);
    const key = JSON.stringify([change.run_id, path, change.change_type]);
    const unit = units.get(key) ?? { run_id: change.run_id, path, change_type: change.change_type, ids: [], outcome: "pending", live: false, reverted: false, expired: false };
    unit.ids.push(change.id);
    if (unit.outcome === "pending" && change.outcome !== "pending") unit.outcome = change.outcome;
    if (change.expired) unit.expired = true;
    if (change.status === "live") unit.live = true;
    if (change.reverted) unit.reverted = true;
    units.set(key, unit);
  }
  return [...units.values()];
}

function mdCell(text: string): string {
  return text.replace(/\|/g, "\\|");
}

/** The `## Outcomes by change type` section of seo/lessons.md, counted in OutcomeUnits (decisions), not entries. */
export function outcomesSection(changes: readonly LedgerChangeRecord[], cfg: SeoConfig, date: string): string {
  type Row = { win: number; loss: number; neutral: number; awaiting: number; reverted: number };
  const rows = new Map<string, Row>();
  const expired = new Map<string, number>();
  for (const unit of outcomeUnits(changes)) {
    if (unit.expired && unit.outcome === "neutral") {
      // Never scorable: not a neutral result, so it stays out of every count below.
      expired.set(unit.change_type, (expired.get(unit.change_type) ?? 0) + 1);
      continue;
    }
    const scored = unit.outcome !== "pending";
    const awaiting = unit.live && !scored;
    if (!scored && !awaiting && !unit.reverted) continue;
    const row = rows.get(unit.change_type) ?? { win: 0, loss: 0, neutral: 0, awaiting: 0, reverted: 0 };
    if (unit.outcome === "win") row.win += 1;
    else if (unit.outcome === "loss") row.loss += 1;
    else if (unit.outcome === "neutral") row.neutral += 1;
    else if (awaiting) row.awaiting += 1;
    if (unit.reverted) row.reverted += 1;
    rows.set(unit.change_type, row);
  }
  const band = cfg.outcomes.neutralBandRatio;
  const brake = cfg.brakes.changeTypeLossRate;
  const lines = [
    OUTCOMES_HEADING,
    "",
    `Updated ${date} by \`ledger.ts score-outcomes\`. A change is scored ${cfg.outcomes.minAgeDays} days after it goes live: ` +
      `its clicks in the complete weeks of the ${OUTCOME_WINDOW_DAYS} days after going live against the ${OUTCOME_WINDOW_DAYS} days before, ` +
      `divided by the same ratio averaged over its holdout pages. A ratio inside the ×${band} placebo band is neutral, ` +
      `so at today's traffic most changes read neutral. Counts are per run, page and change type (a new article's page, image and ` +
      `registry entries are one change). Loss rate counts wins and losses only; brakes.ts treats a change type ` +
      `as tier 2 once it exceeds ${Math.round(brake.maxLossRate * 100)}% over at least ${brake.minScoredNonNeutral} of them.`,
    "",
  ];
  if (!rows.size && !expired.size) {
    lines.push("No change has gone live yet.");
  } else if (rows.size) {
    lines.push("| Change type | Win | Loss | Neutral | Awaiting score | Reverted | Loss rate |", "|---|---:|---:|---:|---:|---:|---:|");
    for (const [type, row] of [...rows].sort(([a], [b]) => a.localeCompare(b))) {
      const decided = row.win + row.loss;
      const rate = decided ? `${Math.round((row.loss / decided) * 100)}%` : "—";
      lines.push(`| ${mdCell(type)} | ${row.win} | ${row.loss} | ${row.neutral} | ${row.awaiting} | ${row.reverted} | ${rate} |`);
    }
  }
  if (expired.size) {
    const list = [...expired].sort(([a], [b]) => a.localeCompare(b)).map(([type, n]) => `${mdCell(type)} ${n}`).join(", ");
    lines.push("", `Expired, never scored (their before-window left the GSC weekly pull before a run could score them): ${list}. They count as no result.`);
  }
  return lines.join("\n");
}

/**
 * Replace the section that starts at `heading` (up to the next # or ##
 * heading outside a code fence) with `section`; append it when absent. Every
 * other byte of the document is kept verbatim.
 */
export function replaceSection(markdown: string, heading: string, section: string): string {
  const lines = markdown.split("\n");
  let inFence = false;
  let start = -1;
  let end = lines.length;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (start === -1) {
      if (line.trimEnd() === heading) start = i;
    } else if (/^#{1,2}\s/.test(line)) {
      end = i;
      break;
    }
  }
  const body = section.replace(/\s+$/, "");
  if (start === -1) {
    const kept = markdown.replace(/\s+$/, "");
    return `${kept ? `${kept}\n\n` : ""}${body}\n`;
  }
  const head = lines.slice(0, start).join("\n");
  const tail = lines.slice(end).join("\n");
  return `${start ? `${head}\n` : ""}${body}\n${end < lines.length ? `\n${tail}` : ""}`;
}

// -------------------------------------------------------------------- CLI

function requireFlag(args: Args, name: string): string {
  const value = flagString(args, name);
  if (value === null || value === "") throw new Error(`--${name} is required`);
  return value;
}

function requireRunId(args: Args): string {
  const runId = requireFlag(args, "run-id");
  if (!RUN_ID_RE.test(runId)) throw new Error(`--run-id must match ${RUN_ID_RE.source}`);
  return runId;
}

function optionalPr(args: Args): number | null {
  const raw = flagString(args, "pr");
  if (raw === null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`--pr must be a positive integer, got "${raw}"`);
  return n;
}

function readLatest<T>(prefix: string, date: string): T | null {
  return readJsonIfExists<T>(latestDataFile(prefix, date));
}

function loadMetricInputs(date: string): MetricInputs {
  return {
    gsc: readLatest<GscPull>("gsc", date),
    indexStatus: readJsonIfExists<IndexStatus>(statePaths.indexStatus()),
    crawl: readLatest<Crawl>("crawl", date),
  };
}

function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

function cmdAppendChanges(args: Args): number {
  const date = today();
  const runId = requireRunId(args);
  const manifest = readJson<RunManifest>(requireFlag(args, "manifest"));
  const verdict = readJson<VerifyVerdict>(requireFlag(args, "verdict"));
  const planFile = flagString(args, "plan");
  const plan = planFile ? readJson<{ include?: unknown }>(planFile) : null;
  const include = plan ? new Set(Array.isArray(plan.include) ? plan.include.filter((f): f is string => typeof f === "string") : []) : null;
  const file = statePaths.ledger();
  const ledger = readLedger(file);
  assertAppendable(ledger);
  const m = materialize(ledger.lines);
  const holdout = runControls(m.holdouts, runId, date);
  if (!m.holdouts.some((h) => h.run_id === runId)) log(`warning: run ${runId} has no holdout event of its own; controls come from the holdouts still active on ${date}`);
  if (!holdout.length) log(`warning: no holdout page is active on ${date}; run ${runId}'s changes will be scored without controls (neutral)`);
  const metrics = loadMetricInputs(date);
  if (!metrics.gsc) throw new Error("no gsc-<date>.json on or before today: before-metrics must come from this run's GSC pull");
  if (!metrics.indexStatus) log("warning: no index-status.json; before.indexed/coverageState are null");
  if (!metrics.crawl) log("warning: no crawl-<date>.json; before.mainHash and before_crawl are null");
  const result = buildChangeEntries({
    runId,
    date,
    pr: optionalPr(args),
    manifest,
    verdict,
    include,
    holdout,
    metrics,
    existingIds: new Set(m.changes.map((c) => c.id)),
  });
  if (result.entries.length) appendRecords(file, ledger, result.entries);
  log(`append-changes: ${result.entries.length} recorded, ${result.skipped.length} skipped`);
  printJson({
    run_id: runId,
    appended: result.entries.map((e) => ({ id: e.id, url: e.url, file: e.file, tier: e.tier, change_type: e.change_type, skill: e.skill })),
    skipped: result.skipped,
  });
  return 0;
}

function cmdHoldout(args: Args): number {
  const cfg = loadConfig();
  const date = today();
  const runId = requireRunId(args);
  const candidatesFile = flagString(args, "candidates") ?? latestDataFile("candidates", date);
  if (!candidatesFile) throw new Error("no candidates file: pass --candidates or run score.ts first");
  const candidates = readJson<Candidates>(candidatesFile);
  const file = statePaths.ledger();
  const ledger = readLedger(file);
  assertAppendable(ledger);
  const m = materialize(ledger.lines);
  let event = m.holdouts.find((h) => h.run_id === runId) ?? null;
  let plan: HoldoutPlan | null = null;
  if (event) {
    log(`run ${runId} already has a holdout (${event.urls.length} pages); not redrawn`);
  } else {
    const salt = `holdout-${date}`;
    const treated = recentlyTreated(m.changes, date, cfg.outcomes.minAgeDays + OUTCOME_WINDOW_DAYS);
    const traffic = holdoutProtection(readLatest<GscPull>("gsc", date), candidates, cfg);
    plan = planHoldout({
      candidatePaths: (candidates.candidates ?? []).map((c) => c.path),
      salt,
      share: cfg.holdout.share,
      stratumOf: holdoutStratum(readJsonIfExists<IndexStatus>(statePaths.indexStatus()), date, cfg.holdout.crawlAgeBucketsDays),
      protectReason: (path) => treated.get(path) ?? traffic(path),
      active: new Set(activeHoldoutPaths(m.holdouts, date)),
      isExcluded: isExcludedFromOptimization,
    });
    event = { kind: "holdout", id: sha1(`holdout\n${runId}`), run_id: runId, date, urls: plan.drawn, until: addDays(date, cfg.holdout.weeks * 7), salt };
    appendRecords(file, ledger, [event]);
    m.holdouts.push(event);
  }
  const active = activeHoldoutPaths(m.holdouts, date);
  const out = flagString(args, "out");
  if (out) writeJson(out, active);
  log(`holdout: ${event.urls.length} withheld this run, ${active.length} withheld in total until their holdouts end${plan ? ` (target ${plan.target} = ${Math.round(cfg.holdout.share * 100)}% of eligible + already withheld)` : ""}`);
  printJson({
    run_id: runId,
    salt: event.salt,
    until: event.until,
    withheld: event.urls,
    active,
    ...(plan ? { target: plan.target, activeBefore: plan.activeBefore, protected: plan.protected, alreadyWithheld: plan.alreadyWithheld, excluded: plan.excluded, strata: plan.strata } : {}),
  });
  return 0;
}

/** Status events that move `targets` to `status`; a change already there (same PR, same live_at) is left alone. */
export function planStatusEvents(
  targets: readonly LedgerChangeRecord[],
  opts: { status: LedgerChange["status"]; liveAt: string | null; pr: number | null; date: string; now: string },
): { events: StatusEvent[]; unchanged: string[] } {
  const events: StatusEvent[] = [];
  const unchanged: string[] = [];
  for (const change of targets) {
    const sameStatus = change.status === opts.status;
    const prChanges = opts.pr !== null && change.pr !== opts.pr;
    const liveAtChanges = opts.status === "live" && opts.liveAt !== null && change.live_at !== opts.liveAt;
    if (sameStatus && !prChanges && !liveAtChanges) {
      unchanged.push(change.id);
      continue;
    }
    const event: StatusEvent = { kind: "status", id: "", date: opts.date, ref: change.id, status: opts.status };
    if (opts.pr !== null) event.pr = opts.pr;
    if (opts.status === "live") event.live_at = opts.liveAt ?? (sameStatus ? change.live_at : null) ?? opts.now;
    event.id = eventId(event);
    events.push(event);
  }
  return { events, unchanged };
}

function cmdSetStatus(args: Args): number {
  const ref = requireFlag(args, "ref");
  const status = requireFlag(args, "status");
  if (!(CLI_STATUSES as readonly string[]).includes(status)) throw new Error(`--status must be one of ${CLI_STATUSES.join(", ")}`);
  const liveAtFlag = flagString(args, "live-at");
  const file = statePaths.ledger();
  const ledger = readLedger(file);
  assertAppendable(ledger);
  const targets = resolveRef(ref, materialize(ledger.lines).changes);
  if (!targets.length) throw new Error(`--ref ${ref} matches no change in the ledger`);
  const { events, unchanged } = planStatusEvents(targets, {
    status: status as LedgerChange["status"],
    liveAt: liveAtFlag ? toIso(liveAtFlag) : null,
    pr: optionalPr(args),
    date: today(),
    now: nowIso(),
  });
  if (events.length) appendRecords(file, ledger, events);
  log(`set-status: ${events.length} change(s) → ${status}, ${unchanged.length} already there`);
  printJson({ appended: events.map((e) => ({ ref: e.ref, status: e.status, live_at: e.live_at ?? null, pr: e.pr ?? null })), unchanged });
  return 0;
}

function cmdAttachPr(args: Args): number {
  const runId = requireRunId(args);
  const pr = optionalPr(args);
  if (pr === null) throw new Error("--pr is required");
  const file = statePaths.ledger();
  const ledger = readLedger(file);
  assertAppendable(ledger);
  const targets = materialize(ledger.lines).changes.filter((c) => c.run_id === runId);
  const date = today();
  const events: StatusEvent[] = [];
  for (const change of targets) {
    if (change.pr === pr) continue;
    const event: StatusEvent = { kind: "status", id: "", date, ref: change.id, status: change.status, pr };
    event.id = eventId(event);
    events.push(event);
  }
  if (events.length) appendRecords(file, ledger, events);
  log(`attach-pr: PR #${pr} attached to ${events.length} change(s) of run ${runId} (${targets.length} recorded)`);
  printJson({ run_id: runId, pr, attached: events.map((e) => e.ref) });
  return 0;
}

function cmdGlobalEvent(args: Args): number {
  const cfg = loadConfig();
  const date = today();
  const description = cleanText(requireFlag(args, "description"), 500);
  const rawUrls = requireFlag(args, "urls").trim();
  const urls = rawUrls === "*" ? ["*"] : uniqSorted(rawUrls.split(",").map((u) => u.trim()).filter(Boolean).map((u) => parseSitePath(u, cfg.site.base)));
  if (!urls.length) throw new Error("--urls needs at least one path, or '*' for the whole site");
  const days = flagNumber(args, "exclude-days", cfg.outcomes.minAgeDays);
  if (!Number.isInteger(days) || days < 0) throw new Error("--exclude-days must be a non-negative integer");
  const event: GlobalEvent = { kind: "global_event", id: "", date, description, urls, pr: optionalPr(args), exclude_until: addDays(date, days) };
  event.id = eventId(event);
  const file = statePaths.ledger();
  const ledger = readLedger(file);
  assertAppendable(ledger);
  if (materialize(ledger.lines).globals.some((g) => g.id === event.id)) {
    log("global-event: already recorded");
  } else {
    appendRecords(file, ledger, [event]);
    log(`global-event: ${urls.length} URL(s) excluded from outcome scoring until ${event.exclude_until}`);
  }
  printJson(event);
  return 0;
}

function cmdQuery(args: Args): number {
  const ledger = readLedger();
  if (!ledger.verification.ok) log(`warning: the ledger chain does not verify (${ledger.verification.errors[0]})`);
  const statuses = flagString(args, "status");
  const url = flagString(args, "url");
  const since = flagString(args, "since");
  const runId = flagString(args, "run-id");
  if (since && !isIsoDate(since)) throw new Error("--since must be YYYY-MM-DD");
  const wanted = statuses ? new Set(statuses.split(",").map((s) => s.trim())) : null;
  const path = url ? pathOf(url) : null;
  const full = hasFlag(args, "full");
  const changes = materialize(ledger.lines)
    .changes.filter((c) => !wanted || wanted.has(c.status))
    .filter((c) => !path || pathOf(c.url) === path)
    .filter((c) => !since || c.date >= since)
    .filter((c) => !runId || c.run_id === runId)
    .map((c) => {
      if (full) return c;
      const { before_crawl: _omitted, ...rest } = c;
      return rest;
    });
  printJson(changes);
  return 0;
}

function cmdActiveHoldouts(args: Args): number {
  const date = flagString(args, "date") ?? today();
  if (!isIsoDate(date)) throw new Error("--date must be YYYY-MM-DD");
  printJson(activeHoldoutPaths(materialize(readLedger().lines).holdouts, date));
  return 0;
}

function cmdScoreOutcomes(args: Args): number {
  const cfg = loadConfig();
  const date = today();
  const dryRun = hasFlag(args, "dry-run");
  const file = statePaths.ledger();
  const ledger = readLedger(file);
  if (!dryRun) assertAppendable(ledger);
  const metrics = loadMetricInputs(date);
  if (!metrics.gsc) throw new Error("no gsc-<date>.json on or before today: run gsc-pull.ts first");
  const m = materialize(ledger.lines);
  const run = scoreOutcomes(m, { gsc: metrics.gsc, today: date, cfg, now: nowIso(), current: (p) => currentState(p, metrics) });
  const section = outcomesSection(materialize([...ledger.lines, ...run.events]).changes, cfg, date);
  if (!dryRun) {
    if (run.events.length) appendRecords(file, ledger, run.events);
    const lessons = statePaths.lessons();
    const existing = existsSync(lessons) ? readFileSync(lessons, "utf8") : "# SEO loop lessons\n";
    writeText(lessons, replaceSection(existing, OUTCOMES_HEADING, section));
  }
  log(`score-outcomes: ${run.scored.length} scored, ${run.expired.length} expired (never scorable), ${run.skipped.length} live change(s) not scorable yet${dryRun ? " (dry run: nothing written)" : ""}`);
  printJson({ scored: run.scored, expired: run.expired, skipped: run.skipped });
  return 0;
}

function cmdVerifyChain(args: Args): number {
  const file = statePaths.ledger();
  const current = existsSync(file) ? readFileSync(file) : Buffer.alloc(0);
  const previousFile = flagString(args, "previous");
  let previous: Buffer | null = null;
  if (previousFile) {
    if (!existsSync(previousFile)) throw new Error("--previous names a file that does not exist");
    previous = readFileSync(previousFile);
  }
  const result = verifyChain(current, previous);
  console.log(JSON.stringify({ ok: result.ok, lines: result.lines, head: result.head, errors: result.errors.slice(0, 50) }));
  if (!result.ok) log(`verify-chain FAILED: ${result.errors.length} problem(s)`);
  return result.ok ? 0 : 1;
}

const USAGE = [
  "usage: node seo/scripts/ledger.ts <command> [flags]",
  "  append-changes --manifest <run-manifest.json> --verdict <verdict.json> --run-id <id> [--plan <publish-plan.json>] [--pr N]",
  "  holdout --run-id <id> [--candidates <candidates.json>] [--out <active-holdout.json>]",
  "  set-status --ref <id|pr:N|run:ID> --status live|void|reverted [--live-at ISO] [--pr N]",
  "  attach-pr --run-id <id> --pr N",
  "  global-event --description <text> --urls </a,/b|'*'> [--pr N] [--exclude-days N]",
  "  query [--status s1,s2] [--url /path] [--since YYYY-MM-DD] [--run-id <id>] [--full]",
  "  active-holdouts [--date YYYY-MM-DD]",
  "  score-outcomes [--dry-run]",
  "  verify-chain [--previous <old ledger copy>]",
].join("\n");

export async function main(args: Args): Promise<number> {
  switch (args.positionals[0]) {
    case "append-changes":
      return cmdAppendChanges(args);
    case "holdout":
      return cmdHoldout(args);
    case "set-status":
      return cmdSetStatus(args);
    case "attach-pr":
      return cmdAttachPr(args);
    case "global-event":
      return cmdGlobalEvent(args);
    case "query":
      return cmdQuery(args);
    case "active-holdouts":
      return cmdActiveHoldouts(args);
    case "score-outcomes":
      return cmdScoreOutcomes(args);
    case "verify-chain":
      return cmdVerifyChain(args);
    default:
      log(USAGE);
      return 1;
  }
}

// -------------------------------------------------------------- self-test

function selfTest(): void {
  const cfg = loadConfig();
  check(canonicalJson({ b: 1, a: { d: [2, 1], c: undefined } }) === '{"a":{"d":[2,1]},"b":1}', "canonicalJson sorts keys and drops undefined");

  const change = {
    kind: "change",
    id: changeId("1", "app/blog/x/page.tsx", "/blog/x"),
    run_id: "1",
    date: "2026-06-01",
    url: "/blog/x",
    file: "app/blog/x/page.tsx",
    tier: 1,
    change_type: "title",
    skill: "seo-ctr",
    summary: "s",
    pr: 7,
    status: "proposed",
    live_at: null,
    before: { clicks_28d: 0, impressions_28d: 0, position: null, indexed: true, coverageState: null, lastCrawlTime: null, mainHash: null },
    holdout: ["/blog/h"],
    scored_at: null,
    after: null,
    outcome: "pending",
    reverted: false,
  } satisfies LedgerChangeRecord;
  const l1 = chainLine(change, GENESIS);
  const status: StatusEvent = { kind: "status", id: "", date: "2026-06-02", ref: "pr:7", status: "live", live_at: "2026-06-02T00:00:00.000Z" };
  status.id = eventId(status);
  const l2 = chainLine(status, l1.hash);
  const text = `${JSON.stringify(l1)}\n${JSON.stringify(l2)}\n`;
  check(verifyChain(text).ok && verifyChain(text).lines === 2, "a fresh chain verifies");
  check(verifyChain(text, `${JSON.stringify(l1)}\n`).ok, "an append-only extension verifies");
  check(!verifyChain(text.replace('"summary":"s"', '"summary":"t"')).ok, "an edited record fails");
  check(!verifyChain(`${JSON.stringify(l2)}\n`).ok, "a removed first line fails");
  check(!verifyChain(`${JSON.stringify(l1)}\n`, text).ok, "a truncated ledger is not an extension of its previous copy");

  const m = materialize(parseLedger(text));
  check(m.changes[0].status === "live" && m.changes[0].live_at === "2026-06-02T00:00:00.000Z", "pr:N status events apply");

  const quotas = allocateQuotas(new Map([["a", 1], ["b", 1], ["c", 1], ["d", 1], ["e", 1]]), 0.2, "s");
  check([...quotas.values()].reduce((x, y) => x + y, 0) === 1, "five one-page strata withhold one page, not five");
  const plan = planHoldout({
    candidatePaths: ["/blog/a", "/blog/b", "/blog/c", "/blog/d", "/blog/e", "/blog/busy", "/blog/held"],
    salt: "holdout-2026-06-01",
    share: cfg.holdout.share,
    stratumOf: () => "blog-post|never",
    protectReason: (p) => (p === "/blog/busy" ? "traffic" : null),
    active: new Set(["/blog/held"]),
    isExcluded: () => false,
  });
  check(plan.drawn.length === 1 && !plan.drawn.includes("/blog/busy") && !plan.drawn.includes("/blog/held"), "holdout draws 20% and skips protected / already-withheld pages");
  const pool = Array.from({ length: 50 }, (_, i) => `/blog/p${i}`);
  const events: HoldoutEvent[] = [];
  for (let week = 0; week < 10; week += 1) {
    const date = addDays("2026-06-01", week * 7);
    const active = new Set(activeHoldoutPaths(events, date));
    const draw = planHoldout({ candidatePaths: pool.filter((p) => !active.has(p)), salt: `holdout-${date}`, share: cfg.holdout.share, stratumOf: () => "s", protectReason: () => null, active, isExcluded: () => false });
    events.push({ kind: "holdout", id: String(week), run_id: String(week), date, urls: draw.drawn, until: addDays(date, cfg.holdout.weeks * 7), salt: "" });
    check(activeHoldoutPaths(events, date).length <= Math.ceil(cfg.holdout.share * pool.length), `week ${week}: overlapping holdouts stay within the share`);
  }
  const units = outcomeUnits(["page.tsx", "opengraph-image.tsx", "blog-posts.ts"].map((f, i) => ({ ...change, id: `u${i}`, file: f, outcome: "loss" as const })));
  check(units.length === 1 && units[0].outcome === "loss" && units[0].ids.length === 3, "one run's entries for one page and change type are one outcome");

  check(calendarFullWeeks("2026-06-02", "2026-06-29").join() === "2026-06-08,2026-06-15,2026-06-22", "full weeks inside a window");
  const md = "# L\n\n## Baseline F0\n\nkeep me\n\n## Outcomes by change type\n\nold\n\n## Later\n\nkeep too\n";
  const replaced = replaceSection(md, OUTCOMES_HEADING, `${OUTCOMES_HEADING}\n\nnew`);
  check(replaced === "# L\n\n## Baseline F0\n\nkeep me\n\n## Outcomes by change type\n\nnew\n\n## Later\n\nkeep too\n", "replaceSection keeps other sections verbatim");
  check(cleanChangeType("Title Rewrite!") === "title-rewrite" && cleanChangeType("") === "unspecified", "change types are slugs");
}

/** Every flag this script reads, across its subcommands (lib/cli.ts rejects any other). */
export const CLI_FLAGS: readonly string[] = [
  "candidates", "date", "description", "dry-run", "exclude-days", "full", "live-at", "manifest", "out", "plan",
  "pr", "previous", "ref", "run-id", "since", "status", "url", "urls", "verdict",
];

runMain(import.meta.url, main, selfTest, { flags: CLI_FLAGS });
