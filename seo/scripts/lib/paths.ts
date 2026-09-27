/**
 * Where the SEO loop reads and writes. Resolved at call time (not module
 * load) so tests can redirect everything with environment variables.
 *
 * Layout, as the brief specifies:
 *   seo/ledger.jsonl, seo/lessons.md, seo/reports/, seo/data/index-status.json
 *     → RUN STATE. Lives on the `seo-state` orphan branch, overlaid into place
 *       at the start of every run, gitignored on main.
 *   seo/data/<name>-<date>.json → raw pulls, regenerated each run, gitignored.
 *   seo/data/halt.json → persistent halt written only by deterministic jobs.
 *   seo/data/run-manifest.json → the model's proposal for this run.
 *
 * Environment overrides (tests and the CI state worktree):
 *   SEO_STATE_DIR — directory standing in for `seo/` (ledger, lessons, reports)
 *   SEO_DATA_DIR  — directory standing in for `seo/data/`
 *   SEO_TODAY     — YYYY-MM-DD, pins "today" for reproducible runs
 */

import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Repository root: this file is seo/scripts/lib/paths.ts. */
export const REPO_ROOT: string = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
export const SEO_DIR: string = path.join(REPO_ROOT, "seo");

export function stateDir(): string {
  return process.env.SEO_STATE_DIR ? path.resolve(process.env.SEO_STATE_DIR) : SEO_DIR;
}

export function dataDir(): string {
  return process.env.SEO_DATA_DIR ? path.resolve(process.env.SEO_DATA_DIR) : path.join(stateDir(), "data");
}

export const statePaths = {
  ledger: (): string => path.join(stateDir(), "ledger.jsonl"),
  lessons: (): string => path.join(stateDir(), "lessons.md"),
  reportsDir: (): string => path.join(stateDir(), "reports"),
  indexStatus: (): string => path.join(dataDir(), "index-status.json"),
  halt: (): string => path.join(dataDir(), "halt.json"),
  runManifest: (): string => path.join(dataDir(), "run-manifest.json"),
  pagesDir: (): string => path.join(dataDir(), "pages"),
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Today's date in UTC as YYYY-MM-DD (or SEO_TODAY when set). */
export function today(): string {
  const pinned = process.env.SEO_TODAY;
  if (pinned) {
    if (!DATE_RE.test(pinned)) throw new Error(`SEO_TODAY must be YYYY-MM-DD, got "${pinned}"`);
    return pinned;
  }
  return new Date().toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${to.slice(0, 10)}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** ISO-8601 week (Monday start) for report file names: seo/reports/<year>-W<week>.md */
export function isoWeek(date: string): { year: number; week: number; label: string } {
  const d = new Date(`${date}T00:00:00Z`);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  const year = d.getUTCFullYear();
  return { year, week, label: `${year}-W${String(week).padStart(2, "0")}` };
}

/** seo/data/<prefix>-<date>.json */
export function datedDataPath(prefix: string, date: string = today(), ext = "json"): string {
  return path.join(dataDir(), `${prefix}-${date}.${ext}`);
}

/** Newest seo/data/<prefix>-YYYY-MM-DD.json on or before `onOrBefore`, or null. */
export function latestDataFile(prefix: string, onOrBefore: string = today()): string | null {
  const dir = dataDir();
  if (!existsSync(dir)) return null;
  const re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-(\\d{4}-\\d{2}-\\d{2})\\.json$`);
  const matches = readdirSync(dir)
    .map((name) => ({ name, date: re.exec(name)?.[1] ?? null }))
    .filter((m): m is { name: string; date: string } => m.date !== null && m.date <= onOrBefore)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  return matches.length ? path.join(dir, matches[0].name) : null;
}

/** Repo-relative, forward-slash path for display and for ledger records. */
export function repoRelative(absolute: string): string {
  return path.relative(REPO_ROOT, absolute).split(path.sep).join("/");
}
