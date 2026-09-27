/**
 * manifest-issues.ts — turns the model's run-manifest `issues[]` (tier-2
 * proposals: a data-study pitch, a calculator-intent cluster, a demoted change
 * type, a domain the owner must allow) into files the report job files as
 * GitHub issues labelled `seo-proposal`.
 *
 * The manifest is written by the model, so every field is untrusted text
 * headed for a PUBLIC issue tracker. Each title and body is length-capped,
 * passed through report.ts's sanitizeForGithub (no HTML, images, @mentions,
 * #123 references or closing keywords) and through the publishability
 * tripwire (no credentials, no local paths). At most MAX_ISSUES per run, so a
 * runaway run cannot flood the founder's notifications.
 *
 *   node seo/scripts/manifest-issues.ts --manifest run-manifest.json --out-dir <dir>
 *     → <dir>/NN.title and <dir>/NN.md per issue; prints the count
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { flagString, runMain, check, log } from "./lib/cli.ts";
import type { Args } from "./lib/cli.ts";
import { assertPublishable, ensureDir, writeText } from "./lib/io.ts";
import { sanitizeForGithub } from "./report.ts";

export const MAX_ISSUES = 5;
const MAX_TITLE = 120;
const MAX_BODY = 60_000;

export type ProposedIssue = { title: string; body: string };

export function prepareIssues(manifest: unknown): { issues: ProposedIssue[]; dropped: string[] } {
  const record = manifest && typeof manifest === "object" ? (manifest as Record<string, unknown>) : {};
  const raw = Array.isArray(record.issues) ? record.issues : [];
  const issues: ProposedIssue[] = [];
  const dropped: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const entry = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const title = sanitizeForGithub(String(entry.title ?? "")).replace(/\s+/g, " ").trim().slice(0, MAX_TITLE);
    const body = sanitizeForGithub(String(entry.body ?? "")).trim().slice(0, MAX_BODY);
    if (!title || !body) {
      dropped.push("an issue without a title or body");
      continue;
    }
    try {
      assertPublishable(`${title}\n${body}`, "proposed issue");
    } catch (error) {
      dropped.push(`"${title.slice(0, 60)}": ${(error as Error).message}`);
      continue;
    }
    if (seen.has(title.toLowerCase())) continue;
    seen.add(title.toLowerCase());
    if (issues.length >= MAX_ISSUES) {
      dropped.push(`"${title.slice(0, 60)}": over the ${MAX_ISSUES}-issue cap for one run`);
      continue;
    }
    issues.push({
      title,
      body: `${body}\n\n---\n_Proposed by the SEO loop (tier 2: nothing ships without the founder). Close this issue to dismiss it._`,
    });
  }
  return { issues, dropped };
}

async function main(args: Args): Promise<number> {
  const manifestPath = flagString(args, "manifest");
  const outDir = flagString(args, "out-dir");
  if (!outDir) throw new Error("--out-dir is required");
  ensureDir(outDir);
  if (!manifestPath || !existsSync(manifestPath)) {
    log("no run manifest — no proposals to file");
    process.stdout.write("0\n");
    return 0;
  }
  let manifest: unknown = null;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    log("run manifest is not valid JSON — no proposals filed");
    process.stdout.write("0\n");
    return 0;
  }
  const { issues, dropped } = prepareIssues(manifest);
  issues.forEach((issue, i) => {
    const n = String(i + 1).padStart(2, "0");
    writeText(path.join(outDir, `${n}.title`), issue.title);
    writeText(path.join(outDir, `${n}.md`), issue.body);
  });
  for (const d of dropped) log(`proposal dropped: ${d}`);
  process.stdout.write(`${issues.length}\n`);
  return 0;
}

function selfTest(): void {
  const { issues, dropped } = prepareIssues({
    issues: [
      { title: "seo-data-study: 2026-10 FMR study", body: "Pitch line fixes #12 <img src=x> @someone", tier: 2 },
      { title: "seo-data-study: 2026-10 FMR study", body: "duplicate", tier: 2 },
      { title: "", body: "no title" },
      { title: "leak", body: "-----BEGIN PRIVATE KEY----- x" },
    ],
  });
  check(issues.length === 1, "one issue survives dedupe and the empty-title drop");
  check(!/<img|@someone|fixes #12/i.test(issues[0].body), "body is sanitized");
  check(dropped.some((d) => d.includes("leak")), "a credential-bearing proposal is dropped");
  const many = prepareIssues({ issues: Array.from({ length: 9 }, (_, i) => ({ title: `t${i}`, body: "b" })) });
  check(many.issues.length === MAX_ISSUES && many.dropped.length === 9 - MAX_ISSUES, "per-run cap");
  check(prepareIssues(null).issues.length === 0 && prepareIssues({ issues: "x" }).issues.length === 0, "malformed manifests");
}

/** Every flag this script reads (lib/cli.ts rejects any other). */
export const CLI_FLAGS: readonly string[] = ["manifest", "out-dir"];

runMain(import.meta.url, main, selfTest, { flags: CLI_FLAGS });
