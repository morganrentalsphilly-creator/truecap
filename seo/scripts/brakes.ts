/**
 * brakes.ts — the loop's stop conditions, evaluated every run after outcomes
 * are scored. It only DECIDES: it writes seo/data/brakes-<date>.json, and
 * seo/data/halt.json when the site-wide brake applies. It never runs git,
 * opens a PR or edits a page; seo-shepherd acts on the decision and the
 * founder clears a halt (repo var SEO_HALT_ACK = the halt's id).
 *
 *   (a) pageRegressions   a live changed page vs its crawl record from just
 *                         before it went live: stopped answering 200, became
 *                         noindex, canonical no longer self, a JSON-LD type
 *                         lost, new broken internal links, or gone from a
 *                         full crawl → revert. These are deterministic, so
 *                         they are the brakes that act; GSC numbers at this
 *                         volume are not.
 *       indexDrops        indexed before live_at, not indexed since → a tier-2
 *                         issue, never a revert (Google drops and restores
 *                         stale pages on its own schedule).
 *   (b) gscPageLosses     live ≥ minDaysLive, ≥ minImpressions across the
 *                         compared weeks, clicks down more than
 *                         lossShareVsHoldout against its holdout → revert.
 *   (c) siteWide          site clicks down more than dropShare week over week
 *                         → halt, but only when the prior week had at least
 *                         minPriorWeekClicks. Below that floor it is
 *                         report-only: at 3-7 clicks a week one click is a
 *                         20% "drop".
 *   (d) demotedChangeTypes  loss rate above maxLossRate over at least
 *                         minScoredNonNeutral win/loss outcomes → that change
 *                         type is treated as tier 2 (neutral never counts).
 *                         Counted per decision (run × page × change type,
 *                         ledger.ts outcomeUnits), so a new article's three
 *                         file entries are one outcome, not three.
 *   `revertRequests` folds the revert actions of (a) and (b) into one entry
 *   per PR, the shape a consumer turns into a `seo-regression` issue.
 *
 * Load-bearing constraints:
 *   - A page's current state is blamed on ONE change: the newest live change
 *     on that page (a new article's sibling entries from one deploy count as
 *     one). Older live changes on the page are named in a note, never
 *     reverted: the newer change (e.g. a prune to noindex.json) is what the
 *     crawl now shows. A change is not judged at all once an owner
 *     global_event covering its page (or '*') is dated on or after the day
 *     the change was proposed, because the owner's change may be what moved
 *     the page (a template that drops a schema type, a redirect).
 *   - The "before" record for (a) is the latest crawl FILE generated at or
 *     before live_at, or the page's `before_crawl` snapshot the ledger took
 *     when the change was proposed, whichever is newer; then the baseline
 *     file. CI keeps no raw crawl files between runs, so in practice the
 *     ledger snapshot is the reference. A check whose before-value is unknown
 *     does not fire: a revert needs evidence the change caused it.
 *   - The status check is the one exception to that rule: a changed page that
 *     now answers 3xx or 4xx is reverted even without a before-record (a new
 *     article has none, and "not found after the change" needs no baseline);
 *     it is exempt only when the before-record shows the same failure. A
 *     status that proves nothing about the page never reverts: no HTTP answer
 *     (status 0) or 429 after crawl.ts's retry is a note, and a 5xx reverts
 *     only when the previous crawl, also taken after live_at, returned a 5xx
 *     too. CI keeps no previous crawl file, so there a 5xx stays a note.
 *   - The "became noindex" exemption for prune changes requires the change to
 *     be content/seo/noindex.json itself (the only way the loop may noindex a
 *     page), not just a change_type the model named.
 *   - Holdout comparison and ledger materialization are imported from
 *     ledger.ts, so the brake and the outcome scorer can never disagree on a
 *     ratio.
 *   - `is-halted` prints exactly "true" or "false" for the gate job, and fails
 *     closed: an unreadable halt file reads as halted.
 *   - `stop-check` is the same decision for THIS run, taken in the data job
 *     right after the brakes: the gate read last week's halt.json before the
 *     brakes ran, so without it the week the site-wide brake first fires (or
 *     a revert is first requested) would still run the model and could still
 *     arm auto-merge. It prints `halted=`, `reverts=` and `reason=` lines for
 *     $GITHUB_OUTPUT. Any revert request stops content work, as the
 *     seo-regression issue it becomes does from the next run on. It fails
 *     closed: an unreadable halt file, or a missing or unreadable brakes file
 *     for today, reads as halted.
 *
 *   node seo/scripts/brakes.ts [--dry-run]
 *   node seo/scripts/brakes.ts is-halted [--halt <halt.json>] [--ack <SEO_HALT_ACK>]
 *   node seo/scripts/brakes.ts stop-check [--halt <halt.json>] [--ack <SEO_HALT_ACK>]
 */

import { existsSync } from "node:fs";
import path from "node:path";
import type { Args } from "./lib/cli.ts";
import { check, flagString, hasFlag, log, runMain } from "./lib/cli.ts";
import type { SeoConfig } from "./lib/config.ts";
import { loadConfig } from "./lib/config.ts";
import { readJsonIfExists, writeJson } from "./lib/io.ts";
import { addDays, datedDataPath, daysBetween, latestDataFile, statePaths, today } from "./lib/paths.ts";
import type { Brakes, Crawl, GscPull, Halt, IndexStatus, IndexStatusUrl, InspectionSnapshot } from "./lib/types.ts";
import { compareToHoldout, crawlSnapshot, indexEntry, materialize, nowIso, outcomeUnits, pathOf, readLedger } from "./ledger.ts";
import type { CrawlSnapshot, GlobalEvent, LedgerChangeRecord } from "./ledger.ts";

/** One PR the brakes want reverted, with every page and check that asked for it. */
export type RevertRequest = { pr: number; ledgerIds: string[]; paths: string[]; checks: string[] };

/** Brakes plus what could not be evaluated and why (a brake that silently did not run is the worst outcome). */
export type BrakesReport = Brakes & {
  notes: string[];
  /** pageRegressions + gscPageLosses grouped by PR (gscPageLosses carry no PR in the shared type). */
  revertRequests: RevertRequest[];
  inputs?: { ledgerLines: number; liveChanges: number; crawl: string | null; gsc: string | null; indexStatus: boolean; baseline: string | null };
};

/** The one file through which the loop may noindex a page (read by app/sitemap.ts and proxy.ts). */
export const NOINDEX_FILE = "content/seo/noindex.json";

function round(value: number, digits = 4): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

export function isPruneChange(change: Pick<LedgerChangeRecord, "change_type" | "file">): boolean {
  return change.change_type.startsWith("prune") && change.file === NOINDEX_FILE;
}

/** Halted unless the founder's ack matches the halt's id. A halt without an id can only be cleared by editing the file. */
export function isHalted(halt: Partial<Halt> | null | undefined, ackVar: string | null | undefined): boolean {
  if (!halt || halt.halted !== true) return false;
  const ack = (ackVar ?? "").trim();
  return !(ack && halt.clearWithAck && ack === halt.clearWithAck);
}

// ------------------------------------------------------- attribution

function short(id: string): string {
  return id.slice(0, 12);
}

function prLabel(change: Pick<LedgerChangeRecord, "pr">): string {
  return typeof change.pr === "number" ? ` (PR #${change.pr})` : "";
}

/** The day a change's before-state was captured: the earlier of its proposal date and its live day. */
function capturedOn(change: LedgerChangeRecord): string {
  const live = (change.live_at ?? "").slice(0, 10);
  const proposed = /^\d{4}-\d{2}-\d{2}/.test(change.date ?? "") ? change.date.slice(0, 10) : live;
  return proposed && proposed < live ? proposed : live;
}

/** An owner change (global_event) covering the page, or '*', dated on or after the change's before-state. */
export function ownerChangeSince(change: LedgerChangeRecord, globals: readonly GlobalEvent[]): GlobalEvent | null {
  const path = pathOf(change.url);
  const since = capturedOn(change);
  for (const event of globals) {
    const covers = (event.urls ?? []).some((u) => u === "*" || pathOf(u) === path);
    if (covers && typeof event.date === "string" && event.date.slice(0, 10) >= since) return event;
  }
  return null;
}

/**
 * The live changes a page's current state can be blamed on (see the header):
 * per page, the newest live change only — ties broken toward a prune change,
 * so a deploy that noindexes the page keeps its exemption — and none whose
 * page an owner change has touched since. The changes passed over are named
 * in one note per page, except siblings of the same deploy (same live_at and
 * PR), which are the same decision.
 */
export function selectAttributable(changes: readonly LedgerChangeRecord[], globals: readonly GlobalEvent[]): { judged: LedgerChangeRecord[]; notes: string[] } {
  const byPath = new Map<string, LedgerChangeRecord[]>();
  for (const change of changes) {
    if (change.status !== "live" || !change.live_at || !Number.isFinite(Date.parse(change.live_at))) continue;
    const pagePath = pathOf(change.url);
    byPath.set(pagePath, [...(byPath.get(pagePath) ?? []), change]);
  }
  const judged: LedgerChangeRecord[] = [];
  const notes: string[] = [];
  for (const [pagePath, list] of [...byPath].sort(([a], [b]) => a.localeCompare(b))) {
    const liveMs = (c: LedgerChangeRecord): number => Date.parse(c.live_at as string);
    const ranked = [...list].sort((a, b) => liveMs(b) - liveMs(a) || Number(isPruneChange(b)) - Number(isPruneChange(a)) || a.id.localeCompare(b.id));
    const newest = ranked[0];
    const newestDay = (newest.live_at as string).slice(0, 10);
    const passedOver = ranked.slice(1).filter((older) => !(older.live_at === newest.live_at && older.pr === newest.pr));
    if (passedOver.length) {
      const named = passedOver.slice(0, 5).map((older) => `${short(older.id)}${prLabel(older)}`);
      const more = passedOver.length > 5 ? ` (+${passedOver.length - 5} more)` : "";
      const subject = passedOver.length === 1 ? `change ${named[0]} is` : `changes ${named.join(", ")}${more} are`;
      notes.push(`${pagePath}: ${subject} not judged: the newer change ${short(newest.id)}${prLabel(newest)} went live on this page on ${newestDay}`);
    }
    const owner = ownerChangeSince(newest, globals);
    if (owner) {
      notes.push(`${pagePath}: change ${short(newest.id)}${prLabel(newest)} is not judged: owner change ${short(owner.id)} of ${owner.date.slice(0, 10)} (${String(owner.description ?? "").slice(0, 80)}) touched the page since it was proposed`);
      continue;
    }
    judged.push(newest);
  }
  return { judged, notes };
}

// ------------------------------------------------------ (a) regressions

/** The newer of the crawl-file and ledger snapshots taken at or before live_at, else the baseline. */
export function chooseReference(
  liveAt: string,
  fromCrawlFile: CrawlSnapshot | null,
  fromLedger: CrawlSnapshot | null,
  fromBaseline: CrawlSnapshot | null,
): CrawlSnapshot | null {
  const liveMs = Date.parse(liveAt);
  const time = (s: CrawlSnapshot): number => (s.crawledAt ? Date.parse(s.crawledAt) : Number.NEGATIVE_INFINITY);
  const eligible = [fromCrawlFile, fromLedger].filter((s): s is CrawlSnapshot => s !== null && !(time(s) > liveMs));
  if (eligible.length) return eligible.sort((a, b) => time(b) - time(a))[0];
  return fromBaseline;
}

/**
 * A page's record in the baseline file (baseline.ts). Read loosely: the
 * baseline keeps index and content fields, not status/robots/schema, so most
 * before-values come back null and the checks that need them do not fire.
 */
export function baselineSnapshot(baseline: unknown, pagePath: string): CrawlSnapshot | null {
  if (!baseline || typeof baseline !== "object") return null;
  const record = baseline as Record<string, unknown>;
  const rows = Array.isArray(record.urls) ? record.urls : Array.isArray(record.pages) ? record.pages : Array.isArray(baseline) ? baseline : null;
  if (!rows) return null;
  const row = rows.find((r): r is Record<string, unknown> => Boolean(r) && typeof r === "object" && typeof (r as Record<string, unknown>).path === "string" && pathOf((r as Record<string, string>).path) === pagePath);
  if (!row) return null;
  return {
    crawledAt: typeof record.generatedAt === "string" ? record.generatedAt : null,
    status: typeof row.status === "number" ? row.status : null,
    noindex: typeof row.noindex === "boolean" ? row.noindex : null,
    canonicalIsSelf: typeof row.canonicalIsSelf === "boolean" ? row.canonicalIsSelf : null,
    jsonLdTypes: Array.isArray(row.jsonLdTypes) ? row.jsonLdTypes.filter((t): t is string => typeof t === "string") : null,
    brokenTargets: null,
    linkTargets: null,
  };
}

/**
 * A status that says nothing about the page: no HTTP answer (0, crawl.ts's
 * record of a network error or timeout after its retry), a 429, or unknown.
 */
export function isInconclusiveStatus(status: number | null | undefined): boolean {
  return status === null || status === undefined || status === 0 || status === 429;
}

export type RegressionOptions = {
  /** This page in the crawl before the current one, when that crawl also ran after live_at (confirms a 5xx). */
  previous?: CrawlSnapshot | null;
  /** Receives why a non-200 did not become a revert. */
  notes?: string[];
};

/**
 * Deterministic regressions of one live change. `now` null = the page is not
 * in the latest crawl; that only counts when the crawl was a full one (every
 * sitemap URL fetched), i.e. the page left the sitemap. A non-200 stops the
 * other checks (an error page's robots/canonical/schema say nothing).
 */
export function evaluatePageRegression(
  change: LedgerChangeRecord,
  now: CrawlSnapshot | null,
  ref: CrawlSnapshot | null,
  nowIsFullCrawl: boolean,
  options: RegressionOptions = {},
): Brakes["pageRegressions"] {
  const pagePath = pathOf(change.url);
  const out: Brakes["pageRegressions"] = [];
  const notes = options.notes ?? [];
  const flag = (checkName: string, detail: string): void => {
    out.push({ ledgerId: change.id, path: pagePath, pr: change.pr, check: checkName, detail, action: "revert" });
  };
  const prune = isPruneChange(change);
  const wasFine = ref?.crawledAt ? ` (fine in the crawl of ${ref.crawledAt.slice(0, 10)})` : "";
  if (!now) {
    if (nowIsFullCrawl && ref && !prune) flag("sitemap", `no longer in the sitemap: the latest full crawl did not find it${wasFine}`);
    return out;
  }
  if (now.status !== 200) {
    // The one check that fires without a before-record (see the header); a page already failing before the change is not its regression.
    const failingBefore = ref !== null && !isInconclusiveStatus(ref.status) && ref.status !== 200;
    if (failingBefore) return out;
    const status = now.status;
    const fine = ref?.status === 200 ? wasFine : "";
    if (isInconclusiveStatus(status)) {
      notes.push(`${pagePath}: no conclusive HTTP answer (status ${status ?? "unknown"}); recheck next crawl`);
    } else if ((status as number) >= 500) {
      const previous = options.previous ?? null;
      if (previous && typeof previous.status === "number" && previous.status >= 500) {
        flag("status", `returns HTTP ${status}, and returned HTTP ${previous.status} in the crawl of ${(previous.crawledAt ?? "").slice(0, 10) || "the previous run"} too${fine}`);
      } else {
        notes.push(`${pagePath}: HTTP ${status} in this crawl only; recheck next crawl (a 5xx reverts once two consecutive crawls after live_at return one)`);
      }
    } else {
      flag("status", `returns HTTP ${status}${fine}`);
    }
    return out;
  }
  if (now.noindex === true && ref?.noindex === false && !prune) flag("noindex", `became noindex${wasFine}`);
  if (now.canonicalIsSelf === false && ref?.canonicalIsSelf === true) flag("canonical", `canonical no longer points at the page itself${wasFine}`);
  if (ref?.jsonLdTypes && now.jsonLdTypes) {
    const nowTypes = new Set(now.jsonLdTypes);
    const lost = ref.jsonLdTypes.filter((t) => !nowTypes.has(t));
    if (lost.length) flag("jsonld", `lost JSON-LD type(s): ${lost.join(", ")}`);
  }
  if (ref?.brokenTargets && now.brokenTargets) {
    // Only links the change added: an old link whose target broke later is the target's regression, not this page's.
    const brokenBefore = new Set(ref.brokenTargets);
    const linkedBefore = ref.linkTargets ? new Set(ref.linkTargets) : null;
    const gained = now.brokenTargets.filter((t) => !brokenBefore.has(t) && !linkedBefore?.has(t));
    if (gained.length) {
      const more = gained.length > 5 ? ` (+${gained.length - 5} more)` : "";
      flag("broken-links", `new broken internal link(s): ${gained.slice(0, 5).join(", ")}${more}`);
    }
  }
  return out;
}

// ------------------------------------------------------- index drops

function snapshotsOf(entry: IndexStatusUrl): InspectionSnapshot[] {
  const all: InspectionSnapshot[] = [...(entry.history ?? [])];
  if (entry.inspectedAt) {
    all.push({
      inspectedAt: entry.inspectedAt,
      source: entry.source,
      verdict: entry.verdict,
      coverageState: entry.coverageState,
      indexingState: entry.indexingState,
      robotsTxtState: entry.robotsTxtState,
      pageFetchState: entry.pageFetchState,
      lastCrawlTime: entry.lastCrawlTime,
      googleCanonical: entry.googleCanonical,
      userCanonical: entry.userCanonical,
      indexed: entry.indexed,
    });
  }
  const byTime = new Map<string, InspectionSnapshot>();
  for (const snap of all) if (snap?.inspectedAt && Number.isFinite(Date.parse(snap.inspectedAt))) byTime.set(snap.inspectedAt, snap);
  return [...byTime.values()].sort((a, b) => Date.parse(a.inspectedAt) - Date.parse(b.inspectedAt));
}

/** Only attributable changes (selectAttributable): the page's newest live change, untouched by an owner change since. */
export function evaluateIndexDrops(changes: readonly LedgerChangeRecord[], indexStatus: IndexStatus | null, globals: readonly GlobalEvent[] = []): Brakes["indexDrops"] {
  const out: Brakes["indexDrops"] = [];
  for (const change of selectAttributable(changes, globals).judged) {
    if (!change.live_at || isPruneChange(change)) continue;
    const pagePath = pathOf(change.url);
    const entry = indexEntry(indexStatus, pagePath);
    if (!entry) continue;
    const liveMs = Date.parse(change.live_at);
    const snaps = snapshotsOf(entry);
    const before = snaps.filter((s) => Date.parse(s.inspectedAt) <= liveMs).pop();
    const latest = snaps[snaps.length - 1];
    if (before?.indexed === true && latest && Date.parse(latest.inspectedAt) > liveMs && latest.indexed === false) {
      out.push({
        ledgerId: change.id,
        path: pagePath,
        detail: `indexed on ${before.inspectedAt.slice(0, 10)}, not indexed on ${latest.inspectedAt.slice(0, 10)} (${latest.coverageState ?? "coverage unknown"}); went live ${change.live_at.slice(0, 10)}`,
        action: "tier2-issue",
      });
    }
  }
  return out;
}

// --------------------------------------------------- (b) GSC page losses

/**
 * Only attributable changes are judged (selectAttributable); every change is
 * still passed to compareToHoldout so a control treated inside the window is
 * dropped.
 */
export function evaluateGscPageLosses(
  changes: readonly LedgerChangeRecord[],
  gsc: GscPull | null,
  cfg: SeoConfig,
  date: string,
  globals: readonly GlobalEvent[] = [],
): { losses: Brakes["gscPageLosses"]; notes: string[] } {
  const losses: Brakes["gscPageLosses"] = [];
  const notes: string[] = [];
  if (!gsc) return { losses, notes: ["no GSC pull: the page click-loss brake did not run"] };
  const rule = cfg.brakes.pageClickLoss;
  for (const change of selectAttributable(changes, globals).judged) {
    if (!change.live_at || isPruneChange(change)) continue;
    if (daysBetween(change.live_at, date) < rule.minDaysLive) continue;
    const pagePath = pathOf(change.url);
    const cmp = compareToHoldout(change, gsc, changes, { requireCompleteWindows: false });
    if ("error" in cmp) {
      notes.push(`${pagePath}: click-loss brake skipped (${cmp.error})`);
      continue;
    }
    const impressions = cmp.url.before.impressions + cmp.url.after.impressions;
    if (impressions < rule.minImpressions) continue;
    if (cmp.holdoutRatio === null) {
      notes.push(`${pagePath}: click-loss brake skipped (no usable holdout page)`);
      continue;
    }
    const lossShare = 1 - cmp.clicksRatio / cmp.holdoutRatio;
    if (lossShare > rule.lossShareVsHoldout) {
      losses.push({ ledgerId: change.id, path: pagePath, lossShare: round(lossShare), impressions, action: "revert" });
    }
  }
  return { losses, notes };
}

// ------------------------------------------------------ (c) site-wide

export function evaluateSiteWide(gsc: GscPull | null, cfg: SeoConfig): { siteWide: Brakes["siteWide"]; latestWeekStart: string | null } {
  const rule = cfg.brakes.siteWideWeekOverWeek;
  const weeks = [...(gsc?.weeklyTotals ?? [])].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  if (weeks.length < 2) {
    const note = gsc ? "fewer than two complete weeks of site totals; the site-wide brake did not run" : "no GSC pull; the site-wide brake did not run";
    return { siteWide: { triggered: false, applied: false, priorWeekClicks: 0, latestWeekClicks: 0, dropShare: null, note }, latestWeekStart: null };
  }
  const latest = weeks[weeks.length - 1];
  const prior = weeks[weeks.length - 2];
  const dropShare = prior.clicks > 0 ? round((prior.clicks - latest.clicks) / prior.clicks) : null;
  const triggered = dropShare !== null && dropShare > rule.dropShare;
  const applied = triggered && prior.clicks >= rule.minPriorWeekClicks;
  const move = `site clicks ${prior.clicks} → ${latest.clicks} (week of ${prior.weekStart} → week of ${latest.weekStart})`;
  let note: string;
  if (applied) note = `${move}: down ${pct(dropShare ?? 0)}, more than the ${pct(rule.dropShare)} brake; the loop stops making changes`;
  else if (triggered) note = `${move}: down ${pct(dropShare ?? 0)}, but below the volume floor (${rule.minPriorWeekClicks} prior-week clicks); report-only`;
  else note = `${move}: within the ${pct(rule.dropShare)} week-over-week brake`;
  return { siteWide: { triggered, applied, priorWeekClicks: prior.clicks, latestWeekClicks: latest.clicks, dropShare, note }, latestWeekStart: latest.weekStart };
}

/**
 * The halt.json to write when the site-wide brake applies, or null to leave
 * the file alone. The id is per triggering week, so re-running the same week
 * is a no-op and an old ack never clears a new halt. A halt that is still
 * open is carried into the new reason rather than silently replaced.
 */
export function nextHalt(
  existing: Partial<Halt> | null,
  siteWide: Brakes["siteWide"],
  latestWeekStart: string | null,
  now: string,
  ack: string | null,
): Halt | null {
  if (!siteWide.applied || !latestWeekStart) return null;
  const id = `wow-${latestWeekStart}`;
  if (existing?.halted === true && existing.id === id) return null;
  const open = isHalted(existing, ack) ? existing : null;
  const carried = open?.reason ? ` Still open from ${open.id ?? "an earlier halt"}: ${open.reason}` : "";
  return { halted: true, since: open?.since ?? now, reason: `${siteWide.note}.${carried}`.slice(0, 1000), id, clearWithAck: id };
}

// ------------------------------------------------- (d) change-type demotion

/** Counted per decision (outcomeUnits: run × page × change type), exactly as lessons.md counts them. */
export function evaluateDemotedChangeTypes(changes: readonly LedgerChangeRecord[], cfg: SeoConfig): Brakes["demotedChangeTypes"] {
  const rule = cfg.brakes.changeTypeLossRate;
  const tally = new Map<string, { win: number; loss: number }>();
  for (const unit of outcomeUnits(changes)) {
    if (unit.outcome !== "win" && unit.outcome !== "loss") continue;
    const t = tally.get(unit.change_type) ?? { win: 0, loss: 0 };
    t[unit.outcome] += 1;
    tally.set(unit.change_type, t);
  }
  const out: Brakes["demotedChangeTypes"] = [];
  for (const [changeType, t] of [...tally].sort(([a], [b]) => a.localeCompare(b))) {
    const scored = t.win + t.loss;
    const lossRate = t.loss / scored;
    if (scored >= rule.minScoredNonNeutral && lossRate > rule.maxLossRate) out.push({ changeType, lossRate: round(lossRate), scored });
  }
  return out;
}

// ------------------------------------------------------ revert requests

/**
 * One entry per PR to revert, from (a) and (b). A revert action whose change
 * has no PR attached cannot be acted on automatically; it becomes a note.
 */
export function revertRequests(
  found: Pick<Brakes, "pageRegressions" | "gscPageLosses">,
  changes: readonly LedgerChangeRecord[],
): { requests: RevertRequest[]; notes: string[] } {
  const prOf = new Map(changes.map((c) => [c.id, c.pr]));
  const byPr = new Map<number, { ids: Set<string>; paths: Set<string>; checks: Set<string> }>();
  const notes: string[] = [];
  const add = (ledgerId: string, pagePath: string, pr: number | null, checkName: string): void => {
    if (pr === null) {
      notes.push(`${pagePath}: ${checkName} asks for a revert, but change ${short(ledgerId)} has no PR attached; revert it by hand`);
      return;
    }
    const entry = byPr.get(pr) ?? { ids: new Set<string>(), paths: new Set<string>(), checks: new Set<string>() };
    entry.ids.add(ledgerId);
    entry.paths.add(pagePath);
    entry.checks.add(checkName);
    byPr.set(pr, entry);
  };
  for (const r of found.pageRegressions) add(r.ledgerId, r.path, r.pr, r.check);
  for (const r of found.gscPageLosses) add(r.ledgerId, r.path, prOf.get(r.ledgerId) ?? null, "click-loss");
  const requests = [...byPr]
    .sort(([a], [b]) => a - b)
    .map(([pr, e]) => ({ pr, ledgerIds: [...e.ids].sort(), paths: [...e.paths].sort(), checks: [...e.checks].sort() }));
  return { requests, notes };
}

// ------------------------------------------------------------- evaluate

export type BrakesInputs = {
  changes: readonly LedgerChangeRecord[];
  /** Owner changes from the ledger: a page touched by one since a change was proposed is not blamed on the change. */
  globals: readonly GlobalEvent[];
  crawlNow: Crawl | null;
  /** The latest crawl generated at or before an instant (live_at), if one is on disk. */
  crawlBefore: (liveAt: string) => Crawl | null;
  baseline: unknown;
  indexStatus: IndexStatus | null;
  gsc: GscPull | null;
  cfg: SeoConfig;
  date: string;
  generatedAt: string;
};

export function evaluateBrakes(input: BrakesInputs): { report: BrakesReport; latestWeekStart: string | null } {
  const notes: string[] = [];
  const live = input.changes.filter((c) => c.status === "live" && c.live_at);
  const attribution = selectAttributable(input.changes, input.globals);
  notes.push(...attribution.notes);
  const pageRegressions: Brakes["pageRegressions"] = [];
  const crawl = input.crawlNow;
  if (!crawl) {
    if (live.length) notes.push("no crawl: page regressions were not checked");
  } else {
    const full = crawl.sitemapCount > 0 && (crawl.pages?.length ?? 0) >= crawl.sitemapCount;
    const crawledMs = Date.parse(crawl.generatedAt);
    // The crawl before this one, for confirming a 5xx; it counts for a change only if it also ran after live_at.
    const previousCrawl = Number.isFinite(crawledMs) ? input.crawlBefore(new Date(crawledMs - 1).toISOString()) : null;
    const previousMs = previousCrawl ? Date.parse(previousCrawl.generatedAt) : Number.NaN;
    for (const change of attribution.judged) {
      const liveAt = change.live_at as string;
      const pagePath = pathOf(change.url);
      if (!(crawledMs > Date.parse(liveAt))) {
        notes.push(`${pagePath}: the latest crawl predates live_at; regressions not checked yet`);
        continue;
      }
      const fileCrawl = input.crawlBefore(liveAt);
      const ref = chooseReference(liveAt, fileCrawl ? crawlSnapshot(fileCrawl, pagePath) : null, change.before_crawl ?? null, baselineSnapshot(input.baseline, pagePath));
      const previous = previousMs > Date.parse(liveAt) ? crawlSnapshot(previousCrawl, pagePath) : null;
      pageRegressions.push(...evaluatePageRegression(change, crawlSnapshot(crawl, pagePath), ref, full, { previous, notes }));
    }
  }
  pageRegressions.sort((a, b) => a.path.localeCompare(b.path) || a.check.localeCompare(b.check));
  const gsc = evaluateGscPageLosses(input.changes, input.gsc, input.cfg, input.date, input.globals);
  notes.push(...gsc.notes);
  const gscPageLosses = gsc.losses.sort((a, b) => a.path.localeCompare(b.path));
  const reverts = revertRequests({ pageRegressions, gscPageLosses }, input.changes);
  notes.push(...reverts.notes);
  const { siteWide, latestWeekStart } = evaluateSiteWide(input.gsc, input.cfg);
  if (!input.indexStatus && live.length) notes.push("no index-status.json: index drops were not checked");
  return {
    report: {
      generatedAt: input.generatedAt,
      pageRegressions,
      indexDrops: evaluateIndexDrops(input.changes, input.indexStatus, input.globals),
      gscPageLosses,
      siteWide,
      demotedChangeTypes: evaluateDemotedChangeTypes(input.changes, input.cfg),
      notes,
      revertRequests: reverts.requests,
    },
    latestWeekStart,
  };
}

// ------------------------------------------------------------------ CLI

function dateOfDataFile(file: string): string | null {
  return /(\d{4}-\d{2}-\d{2})\.json$/.exec(file)?.[1] ?? null;
}

/** Walk crawl-<date>.json files back from live_at's date to the first one generated at or before it. */
function crawlBeforeLoader(): (liveAt: string) => Crawl | null {
  const cache = new Map<string, Crawl | null>();
  const load = (file: string): Crawl | null => {
    if (!cache.has(file)) cache.set(file, readJsonIfExists<Crawl>(file));
    return cache.get(file) ?? null;
  };
  return (liveAt) => {
    const liveMs = Date.parse(liveAt);
    let file = latestDataFile("crawl", liveAt.slice(0, 10));
    while (file) {
      const crawl = load(file);
      if (crawl?.generatedAt && Date.parse(crawl.generatedAt) <= liveMs) return crawl;
      const date = dateOfDataFile(file);
      if (!date) return null;
      file = latestDataFile("crawl", addDays(date, -1));
    }
    return null;
  };
}

function cmdIsHalted(args: Args): number {
  const file = flagString(args, "halt") ?? statePaths.halt();
  const ack = flagString(args, "ack") ?? process.env.SEO_HALT_ACK ?? "";
  let halt: Partial<Halt> | null;
  try {
    halt = readJsonIfExists<Partial<Halt>>(file);
  } catch {
    log("is-halted: the halt file is unreadable; failing closed (halted)");
    console.log("true");
    return 0;
  }
  const halted = isHalted(halt, ack);
  if (halted) log(`is-halted: halted since ${halt?.since ?? "unknown"} (${halt?.reason ?? "no reason recorded"}); clear with SEO_HALT_ACK=${halt?.clearWithAck ?? "(none: edit halt.json)"}`);
  console.log(halted ? "true" : "false");
  return 0;
}

export type StopState = { halted: boolean; reverts: number; reason: string };

/**
 * This run's stop decision from this run's brake output. `halt`/`brakes` are
 * "unreadable" when the file exists but does not parse, and `brakes` is null
 * when no brakes file was written for today. Both fail closed.
 */
export function stopState(halt: Partial<Halt> | null | "unreadable", ack: string | null, brakes: Partial<BrakesReport> | null | "unreadable"): StopState {
  if (halt === "unreadable") return { halted: true, reverts: 0, reason: "the halt file is unreadable (failing closed)" };
  if (brakes === "unreadable") return { halted: true, reverts: 0, reason: "this run's brakes file is unreadable (failing closed)" };
  if (brakes === null) return { halted: true, reverts: 0, reason: "no brakes file for this run: the brakes did not run (failing closed)" };
  const requests = Array.isArray(brakes.revertRequests) ? brakes.revertRequests : null;
  if (requests === null) return { halted: true, reverts: 0, reason: "this run's brakes file has no revertRequests list (failing closed)" };
  if (isHalted(halt, ack)) {
    return { halted: true, reverts: requests.length, reason: `halted by the site-wide brake (${halt?.id ?? "no id"}): clear with SEO_HALT_ACK` };
  }
  if (requests.length) {
    const prs = requests.map((r) => (r && typeof r === "object" && Number.isInteger((r as RevertRequest).pr) ? `PR ${(r as RevertRequest).pr}` : "a PR")).join(", ");
    return { halted: true, reverts: requests.length, reason: `the brakes asked to revert ${prs} this run` };
  }
  return { halted: false, reverts: 0, reason: "ok" };
}

function readOrUnreadable<T>(file: string): T | null | "unreadable" {
  if (!existsSync(file)) return null;
  try {
    return readJsonIfExists<T>(file);
  } catch {
    return "unreadable";
  }
}

function cmdStopCheck(args: Args): number {
  const ack = flagString(args, "ack") ?? process.env.SEO_HALT_ACK ?? "";
  const halt = readOrUnreadable<Partial<Halt>>(flagString(args, "halt") ?? statePaths.halt());
  // This run's brakes file: the newest one, and no older than yesterday (a step can cross midnight UTC).
  const file = latestDataFile("brakes", today());
  const date = file ? dateOfDataFile(file) : null;
  const brakes = file && date && date >= addDays(today(), -1) ? readOrUnreadable<Partial<BrakesReport>>(file) : null;
  const state = stopState(halt, ack, brakes);
  log(`stop-check: ${state.halted ? "STOP" : "go"} (${state.reason})`);
  // One line each, safe for $GITHUB_OUTPUT: the reason is built from fixed text, ids and integers.
  process.stdout.write(`halted=${state.halted}\nreverts=${state.reverts}\nreason=${state.reason.replace(/[\r\n]+/g, " ").slice(0, 300)}\n`);
  return 0;
}

export async function main(args: Args): Promise<number> {
  const command = args.positionals[0];
  if (command === "is-halted") return cmdIsHalted(args);
  if (command === "stop-check") return cmdStopCheck(args);
  if (command !== undefined) {
    log("usage: node seo/scripts/brakes.ts [--dry-run]\n       node seo/scripts/brakes.ts is-halted [--halt <halt.json>] [--ack <id>]\n       node seo/scripts/brakes.ts stop-check [--halt <halt.json>] [--ack <id>]");
    return 1;
  }
  const cfg = loadConfig();
  const date = today();
  const dryRun = hasFlag(args, "dry-run");
  const ledger = readLedger();
  const crawlFile = latestDataFile("crawl", date);
  const gscFile = latestDataFile("gsc", date);
  const baselineFile = latestDataFile("baseline", date);
  const indexStatus = readJsonIfExists<IndexStatus>(statePaths.indexStatus());
  const { changes, globals } = materialize(ledger.lines);
  const { report, latestWeekStart } = evaluateBrakes({
    changes,
    globals,
    crawlNow: readJsonIfExists<Crawl>(crawlFile),
    crawlBefore: crawlBeforeLoader(),
    baseline: readJsonIfExists<unknown>(baselineFile),
    indexStatus,
    gsc: readJsonIfExists<GscPull>(gscFile),
    cfg,
    date,
    generatedAt: nowIso(),
  });
  if (!ledger.verification.ok) report.notes.unshift(`the ledger chain does not verify (${ledger.verification.errors[0]}); decisions use it as read`);
  report.inputs = {
    ledgerLines: ledger.lines.length,
    liveChanges: changes.filter((c) => c.status === "live").length,
    crawl: crawlFile ? path.basename(crawlFile) : null,
    gsc: gscFile ? path.basename(gscFile) : null,
    indexStatus: indexStatus !== null,
    baseline: baselineFile ? path.basename(baselineFile) : null,
  };
  const halt = nextHalt(readJsonIfExists<Partial<Halt>>(statePaths.halt()), report.siteWide, latestWeekStart, report.generatedAt, process.env.SEO_HALT_ACK ?? null);
  if (!dryRun) {
    writeJson(datedDataPath("brakes", date), report);
    if (halt) writeJson(statePaths.halt(), halt);
  }
  log(
    `brakes: ${report.pageRegressions.length} regression(s), ${report.indexDrops.length} index drop(s), ${report.gscPageLosses.length} click loss(es), ` +
      `${report.revertRequests.length} PR(s) to revert, ` +
      `site-wide ${report.siteWide.applied ? "APPLIED" : report.siteWide.triggered ? "triggered (report-only)" : "ok"}, ${report.demotedChangeTypes.length} demoted type(s)` +
      `${halt ? `; halt ${halt.id} ${dryRun ? "would be written" : "written"}` : ""}${dryRun ? " (dry run: nothing written)" : ""}`,
  );
  console.log(JSON.stringify(report, null, 2));
  return 0;
}

// ------------------------------------------------------------- self-test

function selfTest(): void {
  const cfg = loadConfig();
  check(isHalted({ halted: true, clearWithAck: "wow-2026-06-01" }, ""), "an un-acked halt halts");
  check(!isHalted({ halted: true, clearWithAck: "wow-2026-06-01" }, "wow-2026-06-01"), "the matching ack clears it");
  check(isHalted({ halted: true, clearWithAck: "wow-2026-06-08" }, "wow-2026-06-01"), "an old ack never clears a new halt");
  check(!isHalted({ halted: false }, null) && !isHalted(null, null), "no halt, not halted");
  check(!stopState(null, null, { revertRequests: [] }).halted, "no halt and no revert: go");
  check(stopState(null, null, { revertRequests: [{ pr: 7, ledgerIds: [], paths: [], checks: [] }] }).reverts === 1, "a revert request stops this run");
  check(stopState(null, null, null).halted && stopState("unreadable", null, { revertRequests: [] }).halted, "missing brakes or unreadable halt fail closed");

  const weekly = (clicks: number[]): GscPull => ({ weeklyTotals: clicks.map((c, i) => ({ weekStart: addDays("2026-06-01", i * 7), clicks: c, impressions: 0, ctr: 0, position: 0 })) }) as unknown as GscPull;
  const big = evaluateSiteWide(weekly([100, 70]), cfg);
  check(big.siteWide.triggered && big.siteWide.applied && big.latestWeekStart === "2026-06-08", "a 30% drop from 100 clicks applies");
  const small = evaluateSiteWide(weekly([5, 3]), cfg).siteWide;
  check(small.triggered && !small.applied && small.note.includes("report-only"), "below the volume floor it is report-only");
  const halt = nextHalt(null, big.siteWide, big.latestWeekStart, "2026-06-16T00:00:00.000Z", null);
  check(halt?.id === "wow-2026-06-08" && halt.clearWithAck === halt.id, "halt id is the triggering week");
  check(nextHalt(halt, big.siteWide, big.latestWeekStart, "2026-06-16T00:00:00.000Z", null) === null, "same week re-run leaves halt.json alone");

  const change = { id: "c1", url: "/blog/x", pr: 3, change_type: "title", file: "app/blog/x/page.tsx", status: "live", live_at: "2026-06-01T00:00:00.000Z" } as LedgerChangeRecord;
  const snap = (over: Partial<CrawlSnapshot>): CrawlSnapshot => ({ crawledAt: "2026-05-30T00:00:00.000Z", status: 200, noindex: false, canonicalIsSelf: true, jsonLdTypes: ["Article", "BreadcrumbList"], brokenTargets: [], linkTargets: ["/blog/y"], ...over });
  const checks = (now: CrawlSnapshot | null, ref: CrawlSnapshot | null): string[] => evaluatePageRegression(change, now, ref, true).map((r) => r.check);
  check(checks(snap({ status: 404 }), snap({})).join() === "status", "a 404 after a 200 is a regression");
  check(checks(snap({ noindex: true, jsonLdTypes: ["Article"] }), snap({})).join() === "noindex,jsonld", "noindex and lost schema are regressions");
  check(checks(snap({ brokenTargets: ["/blog/y", "/blog/new"] }), snap({})).join() === "broken-links", "only a newly added broken link counts");
  check(checks(null, snap({})).join() === "sitemap", "gone from a full crawl is a regression");
  check(checks(snap({ noindex: true }), null).length === 0, "no reference, no noindex revert");
  check(isPruneChange({ change_type: "prune-noindex", file: NOINDEX_FILE }) && !isPruneChange({ change_type: "prune", file: "app/blog/x/page.tsx" }), "prune exemption needs noindex.json");
  const notes: string[] = [];
  check(evaluatePageRegression(change, snap({ status: 0 }), snap({}), true, { notes }).length === 0 && notes.length === 1, "no HTTP answer is a note, not a revert");
  check(evaluatePageRegression(change, snap({ status: 503 }), snap({}), true, { notes }).length === 0, "one 5xx is a note");
  check(evaluatePageRegression(change, snap({ status: 503 }), snap({}), true, { previous: snap({ status: 500 }) }).length === 1, "a 5xx in two consecutive crawls reverts");

  const prune = { ...change, id: "c2", change_type: "prune-noindex", file: NOINDEX_FILE, live_at: "2026-08-01T00:00:00.000Z" } as LedgerChangeRecord;
  const picked = selectAttributable([change, prune], []);
  check(picked.judged.length === 1 && picked.judged[0].id === "c2" && picked.notes.length === 1, "only the newest live change on a page is judged");
  const owner = { kind: "global_event", id: "g", date: "2026-06-10", description: "template", urls: ["*"], pr: null, exclude_until: "2026-08-05" } as GlobalEvent;
  check(selectAttributable([change], [owner]).judged.length === 0, "an owner change since the change was proposed blocks the blame");

  const scored = (type: string, outcomes: Array<"win" | "loss" | "neutral">): LedgerChangeRecord[] =>
    outcomes.map((outcome, i) => ({ id: `${type}${i}`, run_id: "1", url: `/blog/${type}-${i}`, change_type: type, outcome }) as LedgerChangeRecord);
  const demoted = evaluateDemotedChangeTypes([...scored("a", [...Array(5).fill("win"), ...Array(5).fill("loss"), "neutral"]), ...scored("b", Array(9).fill("loss"))], cfg);
  check(demoted.length === 1 && demoted[0].changeType === "a" && demoted[0].scored === 10, "demotion needs ≥10 win/loss outcomes and >40% losses");
  const siblings = scored("c", Array(12).fill("loss")).map((c, i) => ({ ...c, url: `/blog/c-${i % 4}` }));
  check(evaluateDemotedChangeTypes(siblings, cfg).length === 0, "a page's sibling entries from one run are one outcome");
}

/** Every flag this script reads (lib/cli.ts rejects any other). */
export const CLI_FLAGS: readonly string[] = ["ack", "dry-run", "halt"];

runMain(import.meta.url, main, selfTest, { flags: CLI_FLAGS });
