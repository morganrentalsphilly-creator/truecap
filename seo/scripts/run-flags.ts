/**
 * run-flags.ts — the facts one seo-weekly run is allowed to act on, computed
 * once in the data job and read by the model, verify-static and the report.
 *
 * Why a file: every later job must agree on the same holdout, the same caps
 * and the same gates. Computing them in three places is how a fence and the
 * thing it fences drift apart.
 *
 * Also prints the tool allow-lists for the model and critic jobs, built from
 * seo/config.json so the WebFetch domain fence and the outbound-link fence in
 * verify-static.ts are the same list, and summarizes a claude-code-action
 * execution file into turns/cost/denied-tool-names (never the transcript: the
 * repository and its Actions artifacts are public).
 *
 *   node seo/scripts/run-flags.ts --run-id 123 --calibration 0
 *   node seo/scripts/run-flags.ts --print-model-tools
 *   node seo/scripts/run-flags.ts --print-critic-tools
 *   node seo/scripts/run-flags.ts --print-critic-schema <verdict.json>
 *   node seo/scripts/run-flags.ts --summarize-execution <execution-output.json>
 *
 * `demotedChangeTypes` carries brakes.ts's (d) decision to verify-static,
 * which raises a file whose change names a demoted type to tier 2 (so it
 * never auto-merges). It is copied from the newest brakes-<date>.json, and
 * fails closed: no brakes file means no brake has run (nothing demoted), but
 * a brakes file without a readable list stops the run.
 *
 * `--print-critic-schema` builds the critic's --json-schema with `file`
 * restricted to the verdict's tier-1 and tier-2 paths, so a verdict keyed by
 * anything else (a "./" prefix, a URL) is refused at the schema instead of
 * silently dropping every tier-1 file in publish-plan.
 */

import { existsSync, readFileSync } from "node:fs";
import { cleanChangeType } from "./lib/change-types.ts";
import { flagNumber, flagString, hasFlag, log, runMain, check } from "./lib/cli.ts";
import type { Args } from "./lib/cli.ts";
import { loadConfig } from "./lib/config.ts";
import { readJsonIfExists, readJsonl, writeJson } from "./lib/io.ts";
import { latestDataFile, statePaths, today } from "./lib/paths.ts";
import type { Brakes, Candidates, Crawl, IndexStatus, LedgerLine, VerifyVerdict } from "./lib/types.ts";

export type RunFlags = {
  runId: string;
  date: string;
  mode: string;
  calibration: number;
  calibrating: boolean;
  crawlStalled: boolean;
  dataStudy: boolean;
  indexed: number;
  sitemapPaths: string[];
  activeHoldout: string[];
  /** brakes.ts demotedChangeTypes as cleaned slugs: verify-static makes their files tier 2. */
  demotedChangeTypes: string[];
  caps: {
    pagesChangedPerRun: number;
    newArticlesPerRun: number;
    noindexPerRun: number;
    maxChangedFilesPerRun: number;
    maxChangedLinesPerRun: number;
  };
};

/** Third Monday of the month or later, and no data study landed this month. */
export function dataStudyDue(date: string, studiesThisMonth: number): boolean {
  const d = new Date(`${date}T00:00:00Z`);
  const dayOfMonth = d.getUTCDate();
  // The third Monday falls on day 15-21. A run on or after it (and no study yet
  // this month) is due: schedules drift and a skipped Monday must not lose a month.
  const firstOfMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const firstMondayDay = 1 + ((8 - firstOfMonth.getUTCDay()) % 7);
  const thirdMondayDay = firstMondayDay + 14;
  return dayOfMonth >= thirdMondayDay && studiesThisMonth === 0;
}

export function activeHoldoutPaths(ledger: LedgerLine[], date: string): string[] {
  const set = new Set<string>();
  for (const line of ledger) {
    if (line.kind === "holdout" && line.until >= date) for (const url of line.urls) set.add(url);
  }
  return [...set].sort();
}

/**
 * The demoted change types from a brakes report. null (no brakes file) means
 * nothing was evaluated, so nothing is demoted; a report without a list, or
 * with an entry lacking a string changeType, throws rather than reading as
 * "none demoted".
 */
export function demotedTypes(brakes: Partial<Brakes> | null): string[] {
  if (brakes === null) return [];
  const list: unknown = brakes.demotedChangeTypes;
  if (!Array.isArray(list)) throw new Error("the brakes file has no demotedChangeTypes list; refusing to read it as none demoted");
  const out = new Set<string>();
  for (const entry of list) {
    const type = entry && typeof entry === "object" ? (entry as { changeType?: unknown }).changeType : undefined;
    if (typeof type !== "string") throw new Error("the brakes file has a demoted entry without a changeType");
    out.add(cleanChangeType(type));
  }
  return [...out].sort();
}

export function computeFlags(input: {
  runId: string;
  date: string;
  mode: string;
  calibration: number;
  candidates: Candidates | null;
  indexStatus: IndexStatus | null;
  crawl: Crawl | null;
  ledger: LedgerLine[];
  /** The newest brakes-<date>.json, or null when none exists. */
  brakes?: Partial<Brakes> | null;
}): RunFlags {
  const config = loadConfig();
  const calibrating = input.calibration < config.calibration.requiredOwnerMergedLoopPrs;
  const crawlStalled = input.candidates?.profile.crawlStalled ?? true;
  const indexed = input.indexStatus?.summary.indexed ?? 0;
  const month = input.date.slice(0, 7);
  const studiesThisMonth = input.ledger.filter(
    (line) => line.kind === "change" && line.change_type === "data-study" && line.date.slice(0, 7) === month,
  ).length;
  return {
    runId: input.runId,
    date: input.date,
    mode: input.mode,
    calibration: input.calibration,
    calibrating,
    crawlStalled,
    dataStudy: dataStudyDue(input.date, studiesThisMonth),
    indexed,
    sitemapPaths: (input.crawl?.pages ?? []).map((page) => page.path).sort(),
    activeHoldout: activeHoldoutPaths(input.ledger, input.date),
    demotedChangeTypes: demotedTypes(input.brakes ?? null),
    caps: {
      pagesChangedPerRun: config.caps.pagesChangedPerRun,
      newArticlesPerRun: crawlStalled ? config.gates.gapArticlesWhileCrawlStalled : config.caps.newArticlesPerRun,
      // Tier 2 while calibrating (issue only), so zero may merge on their own.
      noindexPerRun: calibrating ? 0 : Math.floor(config.caps.noindexShareOfIndexedPerRun * indexed),
      maxChangedFilesPerRun: config.caps.maxChangedFilesPerRun,
      maxChangedLinesPerRun: config.caps.maxChangedLinesPerRun,
    },
  };
}

function webFetchRules(domains: string[]): string[] {
  return domains.map((domain) => `WebFetch(domain:${domain})`);
}

/**
 * The model may read and edit; it may run exactly two read-only helpers
 * (similarity checks a draft; ledger query reads history) and git read
 * commands. No npm/npx/node-on-arbitrary-paths: anything it can run, it
 * cannot also write (see .github/seo/model-settings.json).
 */
export function modelTools(dataStudy: boolean): string {
  const config = loadConfig();
  const tools = [
    "Read",
    "Glob",
    "Grep",
    "Edit",
    "Write",
    "Skill",
    "Agent",
    ...webFetchRules([...config.primarySourceDomains, ...config.vendorDomains, "usetruecap.com"]),
    "Bash(node seo/scripts/similarity.ts:*)",
    "Bash(node seo/scripts/ledger.ts query:*)",
    "Bash(git diff:*)",
    "Bash(git status:*)",
    "Bash(git log:*)",
  ];
  if (dataStudy) tools.push("WebSearch");
  return tools.join(",");
}

/**
 * The critic's structured-output schema. `file` is an enum of the verdict's
 * tier-1 and tier-2 paths (only safe path characters, so the schema can sit
 * in a single-quoted shell argument), and the list must name each of them.
 */
export function criticSchema(verdict: Pick<VerifyVerdict, "files">): string {
  const files = (Array.isArray(verdict.files) ? verdict.files : [])
    .filter((f) => f && (f.tier === 1 || f.tier === 2) && typeof f.path === "string")
    .map((f) => f.path);
  const safe = [...new Set(files)].sort();
  for (const file of safe) if (!/^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(file)) throw new Error(`unsafe path in the verdict: ${JSON.stringify(file).slice(0, 80)}`);
  if (!safe.length) throw new Error("the verdict has no tier-1 or tier-2 file for the critic to judge");
  return JSON.stringify({
    type: "object",
    properties: {
      verdicts: {
        type: "array",
        minItems: safe.length,
        items: {
          type: "object",
          properties: {
            file: { type: "string", enum: safe },
            verdict: { type: "string", enum: ["APPROVE", "REJECT"] },
            reasons: { type: "array", items: { type: "string" } },
          },
          required: ["file", "verdict", "reasons"],
        },
      },
    },
    required: ["verdicts"],
  });
}

export function criticTools(): string {
  const config = loadConfig();
  return ["Read", "Grep", "Glob", ...webFetchRules([...config.primarySourceDomains, ...config.vendorDomains, "usetruecap.com"])].join(",");
}

type ExecutionMessage = { type?: string; subtype?: string; is_error?: boolean; num_turns?: number; total_cost_usd?: number; permission_denials?: Array<{ tool_name?: string }> };

export function summarizeExecution(messages: ExecutionMessage[]): Record<string, unknown> {
  const result = [...messages].reverse().find((m) => m.type === "result") ?? {};
  const denied: Record<string, number> = {};
  for (const d of result.permission_denials ?? []) {
    const name = String(d.tool_name ?? "unknown").slice(0, 40);
    denied[name] = (denied[name] ?? 0) + 1;
  }
  return {
    subtype: result.subtype ?? null,
    isError: result.is_error ?? null,
    turns: result.num_turns ?? null,
    costUsd: typeof result.total_cost_usd === "number" ? Math.round(result.total_cost_usd * 100) / 100 : null,
    deniedTools: denied,
  };
}

async function main(args: Args): Promise<number> {
  if (hasFlag(args, "print-model-tools")) {
    const flags = readJsonIfExists<RunFlags>(`${statePaths.runManifest().replace(/run-manifest\.json$/, "run-flags.json")}`);
    process.stdout.write(modelTools(flags?.dataStudy ?? false));
    return 0;
  }
  if (hasFlag(args, "print-critic-tools")) {
    process.stdout.write(criticTools());
    return 0;
  }
  const schemaFor = flagString(args, "print-critic-schema");
  if (schemaFor) {
    process.stdout.write(criticSchema(JSON.parse(readFileSync(schemaFor, "utf8")) as VerifyVerdict));
    return 0;
  }
  const execFile = flagString(args, "summarize-execution");
  if (execFile) {
    if (!existsSync(execFile)) {
      process.stdout.write("{}\n");
      return 0;
    }
    const raw = JSON.parse(readFileSync(execFile, "utf8")) as ExecutionMessage[] | ExecutionMessage;
    process.stdout.write(`${JSON.stringify(summarizeExecution(Array.isArray(raw) ? raw : [raw]))}\n`);
    return 0;
  }

  const runId = flagString(args, "run-id", "local");
  const flags = computeFlags({
    runId,
    date: today(),
    mode: process.env.SEO_MODE || "review",
    calibration: flagNumber(args, "calibration", 0),
    candidates: readJsonIfExists<Candidates>(latestDataFile("candidates")),
    indexStatus: readJsonIfExists<IndexStatus>(statePaths.indexStatus()),
    crawl: readJsonIfExists<Crawl>(latestDataFile("crawl")),
    ledger: readJsonl<LedgerLine>(statePaths.ledger()),
    brakes: readJsonIfExists<Partial<Brakes>>(latestDataFile("brakes")),
  });
  const out = statePaths.runManifest().replace(/run-manifest\.json$/, "run-flags.json");
  writeJson(out, flags);
  log(`run flags: calibrating=${flags.calibrating} crawlStalled=${flags.crawlStalled} dataStudy=${flags.dataStudy} holdout=${flags.activeHoldout.length} indexed=${flags.indexed} demoted=${flags.demotedChangeTypes.join(",") || "none"}`);
  return 0;
}

function selfTest(): void {
  // 2026-09 has Mondays on 7, 14, 21, 28 → third Monday is the 21st.
  check(!dataStudyDue("2026-09-14", 0), "second Monday is not due");
  check(dataStudyDue("2026-09-21", 0), "third Monday is due");
  check(dataStudyDue("2026-09-28", 0), "a later Monday is still due when none ran");
  check(!dataStudyDue("2026-09-28", 1), "not due twice in a month");
  // 2026-11-01 is a Sunday → Mondays 2, 9, 16 → third Monday is the 16th.
  check(!dataStudyDue("2026-11-09", 0) && dataStudyDue("2026-11-16", 0), "month starting on a Sunday");
  const summary = summarizeExecution([{ type: "assistant" }, { type: "result", subtype: "success", num_turns: 12, total_cost_usd: 1.2345, permission_denials: [{ tool_name: "Bash" }, { tool_name: "Bash" }] }]);
  check(summary.turns === 12 && summary.costUsd === 1.23 && (summary.deniedTools as Record<string, number>).Bash === 2, "execution summary");
  const tools = modelTools(false);
  check(!tools.includes("WebSearch") && tools.includes("WebFetch(domain:irs.gov)") && !/Bash\(npm|Bash\(npx|gh /.test(tools), "model tools are fenced");
  check(demotedTypes(null).length === 0 && demotedTypes({ demotedChangeTypes: [{ changeType: "Title Meta", lossRate: 0.5, scored: 10 }] }).join() === "title-meta", "demoted types are cleaned slugs");
  let threw = false;
  try {
    demotedTypes({});
  } catch {
    threw = true;
  }
  check(threw, "a brakes file without the list fails closed");
  const schema = JSON.parse(criticSchema({ files: [{ path: "app/blog/a/page.tsx", status: "M", tier: 1, url: "/blog/a", addedLines: 1, removedLines: 1 }, { path: "app/blog/b/page.tsx", status: "M", tier: 0, url: "/blog/b", addedLines: 1, removedLines: 1 }] }));
  check(schema.properties.verdicts.items.properties.file.enum.join() === "app/blog/a/page.tsx", "the critic schema pins file to the tier-1/2 paths");
}

/** Every flag this script reads (lib/cli.ts rejects any other). */
export const CLI_FLAGS: readonly string[] = ["calibration", "print-critic-schema", "print-critic-tools", "print-model-tools", "run-id", "summarize-execution"];

runMain(import.meta.url, main, selfTest, { flags: CLI_FLAGS });
