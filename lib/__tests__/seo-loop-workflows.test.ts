import { afterAll, describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

/**
 * The SEO loop's workflows (.github/workflows/seo-*.yml) wire the toolkit
 * together, and the Actions runner cannot be run locally. So these tests read
 * the YAML and check the wiring against the rules GitHub applies:
 *   - upload-artifact roots a multi-path artifact at the paths' least common
 *     ancestor, and every file a later job reads must be where it lands;
 *   - a job with no status function in its `if` carries an implicit
 *     success() that is false once ANY ancestor was skipped;
 *   - `echo "x=$(cmd)"` exits 0 even when cmd fails;
 *   - every flag a workflow passes must be one the script reads.
 * Where a step's shell can run without GitHub (the report job's ledger check,
 * seo-deployed's check step, the shepherd's revert), it is run for real in a
 * temp dir with stub commands.
 */

const ROOT = path.resolve(__dirname, "../..");
// js-yaml ships no type declarations; its one call used here is typed by hand.
const yaml = createRequire(path.join(ROOT, "package.json"))("js-yaml") as { load(text: string): unknown };
const WORKFLOWS = path.join(ROOT, ".github", "workflows");
const SCRIPTS = path.join(ROOT, "seo", "scripts");

type Step = { name?: string; id?: string; uses?: string; run?: string; if?: string; env?: Record<string, string>; with?: Record<string, unknown> };
type Job = { needs?: string | string[]; if?: string; outputs?: Record<string, string>; steps: Step[]; permissions?: unknown };
type Workflow = { jobs: Record<string, Job> };

const load = (name: string): Workflow => yaml.load(readFileSync(path.join(WORKFLOWS, `${name}.yml`), "utf8")) as Workflow;
const LOOP_WORKFLOWS = ["seo-weekly", "seo-deployed", "seo-shepherd", "seo-pause"];
const weekly = load("seo-weekly");
const needsOf = (job: Job): string[] => (job.needs === undefined ? [] : Array.isArray(job.needs) ? job.needs : [job.needs]);
const STATUS_FN = /\b(?:always|cancelled|failure|success)\(\)/;
const stepText = (step: Step): string => [step.run ?? "", ...Object.values(step.env ?? {}), ...Object.values(step.with ?? {}).map(String)].join("\n");

const tmpDirs: string[] = [];
afterAll(() => {
  for (const dir of tmpDirs) rmSync(dir, { recursive: true, force: true });
});
const tmp = (): string => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "seo-workflows-test-"));
  tmpDirs.push(dir);
  return dir;
};

// ------------------------------------------------------------ artifacts

/** A stand-in runner layout: runner.temp and the checkout are siblings under one work directory. */
const WORK = "/runner-home/work";
const TEMP = `${WORK}/_temp`;
const WORKSPACE = `${WORK}/repo/repo`;

function normalize(text: string): string {
  return text
    .replace(/\$\{\{\s*runner\.temp\s*\}\}/g, TEMP)
    .replace(/\$\{RUNNER_TEMP\}/g, TEMP)
    .replace(/\$RUNNER_TEMP/g, TEMP);
}

function absolute(p: string): string {
  const n = normalize(p.trim());
  return n.startsWith("/") ? n : path.posix.join(WORKSPACE, n) + (n.endsWith("/") ? "/" : "");
}

/** upload-artifact's layout: the root (a lone path's directory, or the paths' least common ancestor) and each entry under it. */
export function artifactLayout(paths: string[]): { root: string; files: string[]; dirs: string[] } {
  const abs = paths.map(absolute);
  const isDir = (p: string): boolean => p.endsWith("/");
  const strip = (p: string): string => p.replace(/\/+$/, "");
  let root: string;
  if (abs.length === 1) root = isDir(abs[0]) ? strip(abs[0]) : path.posix.dirname(abs[0]);
  else {
    const parts = abs.map((p) => strip(p).split("/"));
    const common: string[] = [];
    for (let i = 0; i < parts[0].length; i += 1) {
      if (parts.every((p) => p[i] === parts[0][i])) common.push(parts[0][i]);
      else break;
    }
    root = common.join("/") || "/";
  }
  const rel = (p: string): string => path.posix.relative(root, strip(p));
  return { root, files: abs.filter((p) => !isDir(p)).map(rel), dirs: abs.filter(isDir).map(rel) };
}

describe("artifact layout: what a job reads is where upload-artifact put it", () => {
  const uploads = new Map<string, { job: string; layout: ReturnType<typeof artifactLayout> }>();
  for (const [jobName, job] of Object.entries(weekly.jobs)) {
    for (const step of job.steps) {
      if (!step.uses?.startsWith("actions/upload-artifact")) continue;
      const paths = String(step.with?.path ?? "").split("\n").map((p) => p.trim()).filter(Boolean);
      uploads.set(String(step.with?.name), { job: jobName, layout: artifactLayout(paths) });
    }
  }

  it("models upload-artifact's least-common-ancestor rule", () => {
    // The broken 'published' upload: two files in runner.temp and one in the checkout.
    const broken = artifactLayout(["${{ runner.temp }}/pr-body.md", "${{ runner.temp }}/publish-plan.json", "seo/ledger.jsonl"]);
    expect(broken.root).toBe(WORK);
    expect(broken.files).toEqual(["_temp/pr-body.md", "_temp/publish-plan.json", "repo/repo/seo/ledger.jsonl"]);
    expect(artifactLayout(["seo/data/", "seo/ledger.jsonl"])).toEqual({ root: `${WORKSPACE}/seo`, files: ["ledger.jsonl"], dirs: ["data"] });
    expect(artifactLayout(["${{ runner.temp }}/verdict.json"])).toEqual({ root: TEMP, files: ["verdict.json"], dirs: [] });
  });

  const reads: Array<{ job: string; artifact: string; file: string }> = [];
  for (const [jobName, job] of Object.entries(weekly.jobs)) {
    for (const step of job.steps) {
      if (!step.uses?.startsWith("actions/download-artifact")) continue;
      const target = absolute(String(step.with?.path ?? ""));
      if (!target.startsWith(TEMP)) continue; // downloads into the checkout (seo/) overlay repo paths
      const artifact = String(step.with?.name);
      const re = new RegExp(`${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/([A-Za-z0-9._/-]+)`, "g");
      for (const other of job.steps) {
        if (other === step) continue;
        for (const m of normalize(stepText(other)).matchAll(re)) reads.push({ job: jobName, artifact, file: m[1].replace(/\/+$/, "") });
      }
    }
  }

  it("finds the downloads the later jobs read from", () => {
    expect(reads.filter((r) => r.artifact === "published").map((r) => r.file)).toEqual(expect.arrayContaining(["pr-body.md", "ledger.jsonl", "publish-plan.json"]));
  });

  it.each(reads.map((r) => [`${r.job} reads ${r.artifact}/${r.file}`, r] as const))("%s", (_label, read) => {
    const upload = uploads.get(read.artifact);
    expect(upload, `no upload named ${read.artifact}`).toBeDefined();
    const { files, dirs, root } = upload!.layout;
    const found = files.includes(read.file) || dirs.some((d) => d === "" || read.file === d || read.file.startsWith(`${d}/`));
    expect(found, `${read.artifact} holds ${JSON.stringify(files)} + dirs ${JSON.stringify(dirs)} under ${root}; ${read.job} reads ${read.file}`).toBe(true);
    // A folder uploaded whole: the producing job must write the file into it.
    if (!files.includes(read.file) && dirs.includes("") && upload!.job !== "model") {
      const producer = weekly.jobs[upload!.job].steps.map((s) => normalize(stepText(s))).join("\n");
      expect(producer, `${upload!.job} never writes ${root}/${read.file}`).toContain(`${root}/${read.file}`);
    }
  });

  it("uploads 'published' from one folder", () => {
    const step = weekly.jobs.publish.steps.find((s) => s.uses?.startsWith("actions/upload-artifact"));
    expect(String(step?.with?.path).trim().split("\n")).toHaveLength(1);
  });
});

// ---------------------------------------------------------- job graph

describe("job conditions", () => {
  it.each(LOOP_WORKFLOWS)("%s: a job after an always()/!cancelled() job has a status function of its own", (name) => {
    const wf = load(name);
    for (const [jobName, job] of Object.entries(wf.jobs)) {
      const lenientNeed = needsOf(job).find((n) => STATUS_FN.test(String(wf.jobs[n]?.if ?? "")));
      if (!lenientNeed || job.if === undefined) continue;
      expect(String(job.if), `${jobName} needs ${lenientNeed}, which can run after a skipped job; without a status function ${jobName} is skipped with it`).toMatch(STATUS_FN);
    }
  });

  it("open-pr runs after a tier-0 publish (critic skipped) and merge only after open-pr succeeded", () => {
    expect(weekly.jobs["open-pr"].if).toMatch(/!cancelled\(\)/);
    expect(weekly.jobs["open-pr"].if).toContain("needs.publish.result == 'success'");
    expect(weekly.jobs.merge.if).toContain("needs.open-pr.result == 'success'");
  });

  it("stops the model and auto-merge on THIS run's brakes, not only last run's halt", () => {
    const data = weekly.jobs.data;
    expect(data.outputs?.halted).toBe("${{ steps.stop.outputs.halted }}");
    const steps = data.steps.map((s) => s.run ?? "");
    const brakes = steps.findIndex((r) => /node seo\/scripts\/brakes\.ts\s*$/m.test(r));
    const stop = data.steps.findIndex((s) => s.id === "stop");
    expect(brakes).toBeGreaterThanOrEqual(0);
    expect(stop).toBeGreaterThan(brakes);
    expect(data.steps[stop].run).toContain("brakes.ts stop-check");
    expect(weekly.jobs.model.if).toContain("needs.data.outputs.halted == 'false'");
    expect(needsOf(weekly.jobs.merge)).toContain("data");
    const arm = weekly.jobs.merge.steps.find((s) => s.name?.startsWith("Arm auto-merge"));
    expect(arm?.env?.HALTED).toContain("needs.data.outputs.halted");
  });

  it("a failed data job neither pushes empty run state nor silences the digest", () => {
    const report = weekly.jobs.report.steps;
    const push = report.find((s) => s.run?.includes("state-push.sh"));
    expect(push?.if).toContain("needs.data.result == 'success'");
    for (const script of ["revert-issues.sh", "digest-issue.sh"]) {
      expect(report.find((s) => s.run?.includes(script))?.if, script).toMatch(/!cancelled\(\)|always\(\)/);
    }
  });
});

// ------------------------------------------------------------- shell

function allRunText(): Array<{ where: string; text: string }> {
  const out: Array<{ where: string; text: string }> = [];
  for (const name of LOOP_WORKFLOWS) {
    for (const [jobName, job] of Object.entries(load(name).jobs)) {
      for (const step of job.steps) if (step.run) out.push({ where: `${name}/${jobName}/${step.name ?? step.id ?? "step"}`, text: step.run });
    }
  }
  for (const file of readdirSync(SCRIPTS).filter((f) => f.endsWith(".sh"))) out.push({ where: `seo/scripts/${file}`, text: readFileSync(path.join(SCRIPTS, file), "utf8") });
  return out;
}

describe("shell in the loop's workflows", () => {
  it("never writes a step output as `echo \"x=$(cmd)\"`, which exits 0 when cmd fails", () => {
    const bad = allRunText().flatMap(({ where, text }) =>
      text.split("\n").filter((line) => /GITHUB_OUTPUT/.test(line) && /\becho\s+"[A-Za-z_]+=\$\(/.test(line)).map((line) => `${where}: ${line.trim()}`),
    );
    expect(bad).toEqual([]);
  });

  it("sets up Node before any job runs a seo/scripts TypeScript entry point", () => {
    const missing: string[] = [];
    for (const name of LOOP_WORKFLOWS) {
      for (const [jobName, job] of Object.entries(load(name).jobs)) {
        let setup = false;
        for (const step of job.steps) {
          if (step.uses?.startsWith("actions/setup-node")) setup = true;
          const run = step.run ?? "";
          const viaShell = [...run.matchAll(/bash seo\/scripts\/([a-z-]+\.sh)/g)].some((m) => readFileSync(path.join(SCRIPTS, m[1]), "utf8").includes("node seo/scripts/"));
          if ((/node seo\/scripts\/[a-z-]+\.ts/.test(run) || viaShell) && !setup) missing.push(`${name}/${jobName}: ${step.name ?? step.id}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});

// ------------------------------------------------------------- flags

type Invocation = { where: string; script: string; flags: string[] };

/** The loop's model-facing instructions that tell it to run a script (present only where they are checked out). */
function instructionFiles(): Array<{ where: string; text: string }> {
  const out: Array<{ where: string; text: string }> = [];
  const skills = path.join(ROOT, ".claude", "skills");
  if (existsSync(skills)) {
    for (const name of readdirSync(skills).filter((n) => n.startsWith("seo-"))) {
      const file = path.join(skills, name, "SKILL.md");
      if (existsSync(file)) out.push({ where: `.claude/skills/${name}/SKILL.md`, text: readFileSync(file, "utf8") });
    }
  }
  const critic = path.join(ROOT, ".claude", "agents", "seo-critic.md");
  if (existsSync(critic)) out.push({ where: ".claude/agents/seo-critic.md", text: readFileSync(critic, "utf8") });
  return out;
}

/** Every `node seo/scripts/<x>.ts … --flag` in the loop's workflows, shell scripts, README and skills. */
function invocations(): Invocation[] {
  const sources = [...allRunText(), { where: "seo/README.md", text: readFileSync(path.join(ROOT, "seo", "README.md"), "utf8") }, ...instructionFiles()];
  const out: Invocation[] = [];
  for (const { where, text } of sources) {
    const joined = text.replace(/\\\n\s*/g, " ");
    for (const m of joined.matchAll(/node seo\/scripts\/([a-z-]+)\.ts([^\n|;&)#`]*)/g)) {
      out.push({ where, script: m[1], flags: [...m[2].matchAll(/(?:^|\s)--([a-z0-9-]+)/g)].map((f) => f[1]) });
    }
  }
  return out;
}

describe("every flag the workflows pass is one the script reads", () => {
  const calls = invocations();

  it("finds the workflow calls, including the multi-line ones", () => {
    expect(calls.some((c) => c.script === "report" && c.flags.includes("plan") && c.flags.includes("run-id"))).toBe(true);
    expect(calls.some((c) => c.script === "post-deploy" && c.flags.includes("out"))).toBe(true);
  });

  it.each([...new Set(calls.map((c) => c.script))].sort())("%s.ts declares every flag it is called with", async (script) => {
    const mod = (await import(path.join(SCRIPTS, `${script}.ts`))) as { CLI_FLAGS?: readonly string[] };
    expect(mod.CLI_FLAGS, `${script}.ts exports no CLI_FLAGS`).toBeDefined();
    const known = new Set([...(mod.CLI_FLAGS ?? []), "self-test", "help"]);
    const unknown = calls.filter((c) => c.script === script).flatMap((c) => c.flags.filter((f) => !known.has(f)).map((f) => `${c.where}: --${f}`));
    expect(unknown).toEqual([]);
  });

  it("both report.ts calls in seo-weekly name the run (never the model's manifest)", () => {
    const reportCalls = calls.filter((c) => c.where.startsWith("seo-weekly/") && c.script === "report");
    expect(reportCalls.length).toBe(2);
    for (const c of reportCalls) expect(c.flags, c.where).toContain("run-id");
    const prBody = reportCalls.find((c) => c.flags.includes("pr-body"));
    expect(prBody?.flags).toEqual(expect.arrayContaining(["plan"]));
  });
});

// --------------------------------------------------------- critic job

describe("critic job", () => {
  it("pins the verdict's file keys with a schema built from verdict.json", () => {
    const critic = weekly.jobs.critic;
    const tools = critic.steps.find((s) => s.id === "tools");
    expect(tools?.run).toContain("--print-critic-schema .seo-review/verdict.json");
    const step = critic.steps.find((s) => s.id === "critic");
    expect(String(step?.with?.claude_args)).toContain("--json-schema '${{ steps.tools.outputs.schema }}'");
  });
});

// ------------------------------------------------------ model settings

describe("model settings (.github/seo/model-settings.json)", () => {
  const settings = JSON.parse(readFileSync(path.join(ROOT, ".github", "seo", "model-settings.json"), "utf8")) as { permissions: { deny: string[] } };
  const HOME = "/runner-home";
  const CWD = `${HOME}/work/repo/repo`;
  /** Claude Code's Read rule paths: //abs, ~/home-relative, bare = relative to the working directory. */
  const toRegex = (rule: string): RegExp | null => {
    const m = /^Read\((.*)\)$/.exec(rule);
    if (!m) return null;
    const p = m[1];
    const abs = p.startsWith("//") ? p.slice(1) : p.startsWith("~/") ? `${HOME}/${p.slice(2)}` : p.startsWith("/") ? null : `${CWD}/${p}`;
    if (abs === null) return null;
    const re = abs
      .split("**")
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*"))
      .join(".*");
    return new RegExp(`^${re}$`);
  };
  const readDenies = settings.permissions.deny.map(toRegex).filter((r): r is RegExp => r !== null);
  const denied = (file: string): boolean => readDenies.some((r) => r.test(file));

  it("lets the model read the checkout it must edit (it lives under the runner's home)", () => {
    for (const file of ["app/blog/cap-rate-guide/page.tsx", "seo/data/run-flags.json", "seo/config.json", ".claude/skills/seo-weekly/SKILL.md", "docs/voice.md"]) {
      expect(denied(`${CWD}/${file}`), file).toBe(false);
    }
  });

  it("still denies the places a credential lives", () => {
    for (const file of [`${HOME}/.ssh/id_ed25519`, `${HOME}/.config/gh/hosts.yml`, `${HOME}/.claude/settings.json`, `${HOME}/work/_temp/_runner_file_commands/set_output_x`, `${CWD}/.git/config`, "/proc/self/environ"]) {
      expect(denied(file), file).toBe(true);
    }
  });
});

// ------------------------------------------------ steps run for real

/** A bin dir of stub commands, each a small bash script. */
function stubs(dir: string, scripts: Record<string, string>): string {
  const bin = path.join(dir, "bin");
  mkdirSync(bin, { recursive: true });
  for (const [name, body] of Object.entries(scripts)) {
    const file = path.join(bin, name);
    writeFileSync(file, `#!/usr/bin/env bash\n${body}\n`);
    chmodSync(file, 0o755);
  }
  return bin;
}

function runStep(script: string, cwd: string, env: Record<string, string>): { code: number; out: string } {
  const result = spawnSync("bash", ["-c", script], { cwd, env: { ...process.env, ...env }, encoding: "utf8" });
  return { code: result.status ?? -1, out: `${result.stdout}${result.stderr}` };
}

describe("report job: a pushed run without its ledger fails loudly", () => {
  const step = weekly.jobs.report.steps.find((s) => s.name === "Write the weekly report") as Step;

  const setup = (withLedger: boolean) => {
    const dir = tmp();
    const temp = path.join(dir, "temp");
    mkdirSync(path.join(temp, "published"), { recursive: true });
    mkdirSync(path.join(dir, "seo"), { recursive: true });
    if (withLedger) writeFileSync(path.join(temp, "published", "ledger.jsonl"), "{}\n");
    const calls = path.join(dir, "calls.txt");
    const bin = stubs(dir, { node: `echo "$*" >> "${calls}"` });
    const env = { PATH: `${bin}:${process.env.PATH}`, RUNNER_TEMP: temp, PUSHED: "true", PR: "12", GATE_REASON: "ok", DATA_RESULT: "success", SEO_RUN_ID: "77", LOOP_BRANCH: "seo/77" };
    return { dir, calls, env };
  };

  it("writes the report, skips attach-pr and exits 1 when publish pushed but published/ledger.jsonl is missing", () => {
    const { dir, calls, env } = setup(false);
    const { code, out } = runStep(step.run as string, dir, env);
    expect(code, out).toBe(1);
    const called = readFileSync(calls, "utf8");
    expect(called).toContain("seo/scripts/report.ts --run-id 77");
    expect(called).not.toContain("attach-pr");
    expect(out).toContain("published/ledger.jsonl is missing");
  });

  it("copies the published ledger and attaches the PR when it is there", () => {
    const { dir, calls, env } = setup(true);
    expect(runStep(step.run as string, dir, env).code).toBe(0);
    expect(readFileSync(path.join(dir, "seo", "ledger.jsonl"), "utf8")).toBe("{}\n");
    expect(readFileSync(calls, "utf8")).toContain("ledger.ts attach-pr --run-id 77 --pr 12");
  });
});

describe("seo-deployed check step", () => {
  const deployed = load("seo-deployed");

  it("may read deployments (F6: the previous Production deploy is the diff base) and nothing more than it needs", () => {
    expect(deployed.jobs.check.permissions).toEqual({ contents: "read", "pull-requests": "read", issues: "write", deployments: "read" });
  });
  const check = deployed.jobs.check.steps.find((s) => s.id === "check") as Step;
  const file = deployed.jobs.check.steps.find((s) => s.name === "File the regression") as Step;

  const run = (onMain: boolean, postDeploy: string) => {
    const dir = tmp();
    const temp = path.join(dir, "temp");
    mkdirSync(temp, { recursive: true });
    const output = path.join(dir, "github-output");
    writeFileSync(output, "");
    // A stand-in post-deploy.ts in the step's working directory: real node runs it.
    mkdirSync(path.join(dir, "seo", "scripts"), { recursive: true });
    writeFileSync(path.join(dir, "seo", "scripts", "post-deploy.ts"), postDeploy);
    const bin = stubs(dir, { git: `case "$1" in fetch) exit 0;; merge-base) exit ${onMain ? 0 : 1};; esac; exit 2` });
    const result = runStep(check.run as string, dir, { PATH: `${bin}:${process.env.PATH}`, RUNNER_TEMP: temp, GITHUB_OUTPUT: output, SHA: "abc1234", NODE_OPTIONS: "--disable-warning=ExperimentalWarning" });
    return { ...result, output: readFileSync(output, "utf8") };
  };

  /**
   * Like the real script: IndexNow's summary noise on stdout, then the result
   * in --out (or, called without --out as the old step did, on stdout too).
   * It never writes anywhere but the path after --out.
   */
  const emitter = (result: string): string =>
    [
      "const at = process.argv.indexOf('--out');",
      `const result = ${result};`,
      "console.log(JSON.stringify({ dryRun: false, submitted: 1 }, null, 2));",
      "if (at === -1 || !process.argv[at + 1]) console.log(result);",
      "else require('node:fs').writeFileSync(process.argv[at + 1], result);",
    ].join("\n");
  const fake = (regressions: number): string =>
    emitter(
      `JSON.stringify({ loopPr: 7, sha: 'abc1234', checked: 2, indexnow: [], indexnowError: null, regressions: Array.from({ length: ${regressions} }, (_, i) => ({ path: '/blog/p' + i, ok: false, problems: ['HTTP 404'] })) })`,
    );

  it("counts regressions from the result file, whatever else reached stdout", () => {
    const hit = run(true, fake(1));
    expect(hit.code, hit.out).toBe(0);
    expect(hit.output).toContain("regressions=1");
    expect(run(true, fake(0)).output).toContain("regressions=0");
  });

  it("writes regressions=0 for a commit that is not on main", () => {
    const off = run(false, fake(3));
    expect(off.code, off.out).toBe(0);
    expect(off.output).toContain("regressions=0");
  });

  it("fails the step, instead of writing an empty count, when the result is unreadable", () => {
    const broken = run(true, emitter("'{} {}'"));
    expect(broken.code).not.toBe(0);
    expect(broken.output).not.toMatch(/regressions=/);
  });

  it("files a regression only for a real, non-zero count", () => {
    expect(file.if).toContain("steps.check.outputs.regressions != ''");
    expect(file.if).toContain("steps.check.outputs.regressions != '0'");
  });
});

// ------------------------------------------------------------ shepherd

describe("seo-shepherd", () => {
  const shepherd = load("seo-shepherd").jobs.shepherd;

  it("does every git push and ls-remote before the first Claude step (which revokes origin's token)", () => {
    const firstClaude = shepherd.steps.findIndex((s) => s.uses?.startsWith("anthropics/claude-code-action"));
    expect(firstClaude).toBeGreaterThan(0);
    const late = shepherd.steps.slice(firstClaude).filter((s) => /git (push|ls-remote)/.test(s.run ?? "")).map((s) => s.name);
    expect(late).toEqual([]);
  });

  it("opens at most one revert per loop PR, judged by PR history rather than a branch the shepherd deletes", () => {
    const plan = shepherd.steps.find((s) => s.id === "plan")?.run ?? "";
    expect(plan).toContain('gh pr list --state all --head "seo/revert-$PR"');
    expect(plan).toContain("bash seo/scripts/revert-commit.sh");
    expect(plan).toMatch(/revert-failed/);
  });

  it("retries every failing check state, not only FAILURE", () => {
    const rerun = shepherd.steps.find((s) => s.name?.startsWith("Re-run"))?.run ?? "";
    expect(rerun).toContain('select(.bucket == "fail")');
  });
});

describe("revert-commit.sh", () => {
  const git = (cwd: string, ...args: string[]): string =>
    execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.invalid", "-c", "commit.gpgsign=false", ...args], {
      cwd,
      encoding: "utf8",
      env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: os.devNull, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.invalid" },
    });
  const repo = (): string => {
    const dir = tmp();
    git(dir, "init", "-q", "-b", "main");
    writeFileSync(path.join(dir, "page.txt"), "old title\n");
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "base");
    return dir;
  };
  const revert = (dir: string, commit: string) =>
    spawnSync("bash", [path.join(SCRIPTS, "revert-commit.sh"), commit], {
      cwd: dir,
      encoding: "utf8",
      env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: os.devNull, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.invalid" },
    });

  it("reverts a PR merged with a merge commit (two parents)", () => {
    const dir = repo();
    git(dir, "switch", "-q", "-c", "seo/1");
    writeFileSync(path.join(dir, "page.txt"), "new title\n");
    git(dir, "commit", "-q", "-am", "loop change");
    git(dir, "switch", "-q", "main");
    writeFileSync(path.join(dir, "other.txt"), "unrelated\n");
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "owner change");
    git(dir, "merge", "-q", "--no-ff", "-m", "Merge pull request 1", "seo/1");
    const merge = git(dir, "rev-parse", "HEAD").trim();
    expect(git(dir, "rev-list", "--parents", "-n", "1", merge).trim().split(" ")).toHaveLength(3);
    const result = revert(dir, merge);
    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(path.join(dir, "page.txt"), "utf8")).toBe("old title\n");
    expect(readFileSync(path.join(dir, "other.txt"), "utf8")).toBe("unrelated\n");
  });

  it("reverts a squash merge (one parent)", () => {
    const dir = repo();
    writeFileSync(path.join(dir, "page.txt"), "new title\n");
    git(dir, "commit", "-q", "-am", "seo-weekly: run 1 (#1)");
    const result = revert(dir, git(dir, "rev-parse", "HEAD").trim());
    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(path.join(dir, "page.txt"), "utf8")).toBe("old title\n");
  });

  it("exits 1 with a clean tree when the revert conflicts", () => {
    const dir = repo();
    writeFileSync(path.join(dir, "page.txt"), "new title\n");
    git(dir, "commit", "-q", "-am", "loop change");
    const loop = git(dir, "rev-parse", "HEAD").trim();
    writeFileSync(path.join(dir, "page.txt"), "owner rewrote it\n");
    git(dir, "commit", "-q", "-am", "owner change");
    expect(revert(dir, loop).status).toBe(1);
    expect(git(dir, "status", "--porcelain").trim()).toBe("");
    expect(existsSync(path.join(dir, ".git", "REVERT_HEAD"))).toBe(false);
  });
});

// ------------------------------------------- first live run (2026-09-27)

describe("fixes from the first live run", () => {
  const digest = (existing: string) => {
    const dir = tmp();
    mkdirSync(path.join(dir, "seo", "data"), { recursive: true });
    mkdirSync(path.join(dir, "seo", "reports"), { recursive: true });
    writeFileSync(path.join(dir, "seo", "data", "digest-2026-09-27.md"), "digest\n");
    writeFileSync(path.join(dir, "seo", "reports", "2026-W39.md"), "report\n");
    const calls = path.join(dir, "calls.txt");
    // gh: the label search lags a just-created issue (it printed nothing live).
    const bin = stubs(dir, {
      gh: [
        `echo "$*" >> "${calls}"`,
        'case "$1 $2" in',
        `  "issue list") printf '%s' "${existing}";;`,
        '  "issue create") echo "https://github.com/o/r/issues/125";;',
        "esac",
        "exit 0",
      ].join("\n"),
    });
    const run = spawnSync("bash", [path.join(SCRIPTS, "digest-issue.sh")], { cwd: dir, env: { ...process.env, PATH: `${bin}:${process.env.PATH}` }, encoding: "utf8" });
    return { code: run.status, out: `${run.stdout}${run.stderr}`, calls: readFileSync(calls, "utf8") };
  };

  it("comments on the issue it just created, from create's own output", () => {
    const first = digest("");
    expect(first.code, first.out).toBe(0);
    expect(first.calls).toMatch(/issue comment 125 --body-file/);
  });

  it("edits, reopens and comments on the existing digest issue", () => {
    const later = digest("42");
    expect(later.code, later.out).toBe(0);
    expect(later.calls).toMatch(/issue edit 42 /);
    expect(later.calls).toMatch(/issue comment 42 --body-file/);
    expect(later.calls).not.toMatch(/issue create/);
  });

  it("runs the patch's test suite without the workflow's loop variables", () => {
    const gate = weekly.jobs["verify-build"].steps.find((s) => s.name === "Apply the patch and gate it like CI") as Step;
    expect(gate.run).toContain("env -u SEO_RUN_ID -u LOOP_BRANCH npm test");
  });

  it("downloads the published artifact only when publish succeeded", () => {
    const step = weekly.jobs.report.steps.find((s) => s.with?.name === "published");
    expect(step?.if).toBe("needs.publish.result == 'success'");
  });

  it("lets the model and the critic fetch every subdomain of a primary source (www.irs.gov)", () => {
    for (const flag of ["--print-model-tools", "--print-critic-tools"]) {
      const out = spawnSync(process.execPath, [path.join(SCRIPTS, "run-flags.ts"), flag], { cwd: ROOT, encoding: "utf8" });
      expect(out.status, out.stderr).toBe(0);
      for (const domain of ["irs.gov", "hud.gov", "huduser.gov", "census.gov"]) {
        expect(out.stdout, `${flag} ${domain}`).toContain(`WebFetch(domain:${domain})`);
        expect(out.stdout, `${flag} *.${domain}`).toContain(`WebFetch(domain:*.${domain})`);
      }
    }
  });
});

describe("jobs that install no packages only run scripts that need none", () => {
  // Second live run (2026-09-28): publish ran `lastmod.ts bump`, which
  // statically imported the `typescript` package through the seed's parser;
  // publish installs nothing, so it died with ERR_MODULE_NOT_FOUND.
  const scriptsOf = (text: string): string[] => [...text.matchAll(/node seo\/scripts\/([a-z-]+\.ts)/g)].map((m) => m[1]);

  const noInstallScripts = (): string[] => {
    const out = new Set<string>();
    for (const name of LOOP_WORKFLOWS) {
      for (const job of Object.values(load(name).jobs)) {
        const runs = job.steps.map((s) => s.run ?? "");
        if (runs.some((r) => /npm (ci|install)/.test(r))) continue;
        for (const run of runs) {
          for (const s of scriptsOf(run)) out.add(s);
          for (const m of run.matchAll(/bash seo\/scripts\/([a-z-]+\.sh)/g)) {
            for (const s of scriptsOf(readFileSync(path.join(SCRIPTS, m[1]), "utf8"))) out.add(s);
          }
        }
      }
    }
    return [...out].sort();
  };

  it("finds the publish and report scripts", () => {
    const list = noInstallScripts();
    for (const s of ["lastmod.ts", "ledger.ts", "publish-plan.ts", "report.ts", "manifest-issues.ts"]) expect(list, s).toContain(s);
  });

  it("loads every one of them from a copy of seo/ with no node_modules anywhere above it", () => {
    const dir = tmp();
    // A copy of seo/ (scripts, config, package.json) outside the repo, so
    // Node cannot resolve any package from this checkout's node_modules.
    execFileSync("cp", ["-R", path.join(ROOT, "seo"), path.join(dir, "seo")]);
    // Repo scripts the toolkit reuses (scripts/seo/*.mjs) are checked out in
    // every job; only PACKAGES are missing there.
    execFileSync("cp", ["-R", path.join(ROOT, "scripts"), path.join(dir, "scripts")]);
    rmSync(path.join(dir, "seo", "data"), { recursive: true, force: true });
    for (const script of noInstallScripts()) {
      const run = spawnSync(process.execPath, [path.join(dir, "seo", "scripts", script), "--help"], { cwd: dir, encoding: "utf8" });
      expect(`${run.stderr}`, script).not.toMatch(/ERR_MODULE_NOT_FOUND|Cannot find package/);
      expect(run.status, `${script}: ${run.stderr}`).toBe(0);
    }
    // And the publish job's actual call: bump a real map from a real plan.
    mkdirSync(path.join(dir, "content", "seo"), { recursive: true });
    writeFileSync(path.join(dir, "content", "seo", "lastmod.json"), JSON.stringify({ "/blog/a": "2026-09-01" }));
    const plan = path.join(dir, "plan.json");
    writeFileSync(plan, JSON.stringify({ lastmodUrls: ["/blog/a"] }));
    const bump = spawnSync(process.execPath, [path.join(dir, "seo", "scripts", "lastmod.ts"), "bump", "--plan", plan, "--date", "2026-10-05"], { cwd: dir, encoding: "utf8" });
    expect(bump.status, bump.stderr).toBe(0);
    expect(`${bump.stdout}${bump.stderr}`).toContain("lastmod bumped for 1 URL(s) to 2026-10-05");
    expect(JSON.parse(readFileSync(path.join(dir, "content", "seo", "lastmod.json"), "utf8"))["/blog/a"]).toBe("2026-10-05");
  });
});

describe("open-pr writes a literal command (third live run)", () => {
  const job = weekly.jobs["open-pr"];
  const step = job.steps.find((s) => s.id === "cmd") as Step;
  const run = (env: Record<string, string>) => {
    const dir = tmp();
    const out = path.join(dir, "out");
    writeFileSync(out, "");
    const body = path.join(dir, "pr-body.md");
    writeFileSync(body, "body\n");
    const result = runStep(step.run as string, dir, { GITHUB_OUTPUT: out, REPO: "o/r", LOOP_BRANCH: "seo/36362603496", TITLE: "seo-weekly: run 36362603496, 2 pages, tier 1", BODY: body, ...env });
    return { ...result, output: readFileSync(out, "utf8"), body };
  };

  it("hands the model a command with no shell variables in it", () => {
    const ok = run({});
    expect(ok.code, ok.out).toBe(0);
    expect(ok.output).toBe(`command=gh pr create --repo o/r --base main --head seo/36362603496 --title 'seo-weekly: run 36362603496, 2 pages, tier 1' --body-file ${ok.body}\n`);
    expect(ok.output).not.toContain("$");
    const prompt = (job.steps.find((s) => s.name === "Open the pull request") as Step).with?.prompt as string;
    expect(prompt).toContain("${{ steps.cmd.outputs.command }}");
    expect(prompt).not.toMatch(/"\$(GH_REPO|LOOP_BRANCH|PR_TITLE|PR_BODY_FILE)"/);
  });

  it("refuses a title, branch or repo the publish job would never produce", () => {
    expect(run({ TITLE: "seo-weekly: run 1, 2 pages, tier 1'; rm -rf ~ #" }).code).not.toBe(0);
    expect(run({ TITLE: "anything else" }).code).not.toBe(0);
    expect(run({ LOOP_BRANCH: "main" }).code).not.toBe(0);
    expect(run({ LOOP_BRANCH: "seo/1;echo" }).code).not.toBe(0);
    expect(run({ REPO: "o/r --web" }).code).not.toBe(0);
  });

  it("fails the job when no pull request exists after the model step", () => {
    const check = job.steps.find((s) => s.name === "The pull request exists") as Step;
    expect(check.run).toContain('gh pr list --head "$LOOP_BRANCH" --state open');
    expect(check.run).toMatch(/exit 1\s*$/);
    expect(job.permissions).toMatchObject({ "pull-requests": "read" });
  });
});

describe("proposals are not re-filed under a new title (third live run)", () => {
  const file = (existing: string[], proposed: Array<{ title: string; body: string }>) => {
    const dir = tmp();
    const manifest = path.join(dir, "run-manifest.json");
    writeFileSync(manifest, JSON.stringify({ runId: "1", changes: [], skipped: [], issues: proposed }));
    const calls = path.join(dir, "calls.txt");
    const bin = stubs(dir, {
      gh: [
        `echo "$*" >> "${calls}"`,
        'case "$1 $2" in',
        `  "issue list") echo '${JSON.stringify(existing)}';;`,
        '  "issue create") echo "https://github.com/o/r/issues/200";;',
        "esac",
        "exit 0",
      ].join("\n"),
    });
    execFileSync("cp", ["-R", path.join(ROOT, "seo"), path.join(dir, "seo")]);
    const run = spawnSync("bash", [path.join(dir, "seo", "scripts", "proposal-issues.sh"), manifest], { cwd: dir, env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, RUNNER_TEMP: dir }, encoding: "utf8" });
    return { code: run.status, out: `${run.stdout}${run.stderr}`, calls: existsSync(calls) ? readFileSync(calls, "utf8") : "" };
  };

  it("drops a reworded proposal whose topic is already open", () => {
    const r = file(["Calculator demand on content pages"], [{ title: "Calculator demand on content pages (recurring)", body: "b" }]);
    expect(r.code, r.out).toBe(0);
    expect(r.calls).not.toMatch(/issue create/);
  });

  it("still files a new decision", () => {
    const r = file(["Calculator demand on content pages"], [{ title: "Data study pitch for October", body: "b" }]);
    expect(r.code, r.out).toBe(0);
    expect(r.calls).toMatch(/issue create --title Data study pitch for October/);
  });

  it("gives the model the open proposals through the data job", () => {
    const data = weekly.jobs.data;
    expect(data.permissions).toMatchObject({ issues: "read" });
    const list = data.steps.find((s) => s.name === "List open proposals") as Step;
    expect(list.run).toContain("gh issue list --label seo-proposal --state open");
    expect(list.run).toContain("seo/data/open-proposals.json");
    const order = data.steps.map((s) => s.name);
    expect(order.indexOf("List open proposals")).toBeLessThan(order.indexOf("Score, outcomes, brakes, holdout"));
  });
});

describe("the model step's own status does not throw away finished work (fourth live run)", () => {
  const model = weekly.jobs.model;
  const claude = model.steps.find((s) => s.id === "claude") as Step & { "continue-on-error"?: boolean };
  const pkg = model.steps.find((s) => s.id === "package") as Step;

  const packageRun = (opts: { manifest?: unknown; edit: boolean; outcome?: string }) => {
    const dir = tmp();
    const git = (...a: string[]) => execFileSync("git", a, { cwd: dir, env: { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t.invalid" } });
    git("init", "-q");
    writeFileSync(path.join(dir, "page.tsx"), "a\n");
    // Like the repo: run state and the stand-in script are never part of the patch.
    writeFileSync(path.join(dir, ".gitignore"), "seo/\ntemp/\nout\n");
    git("add", "-A");
    git("commit", "-q", "-m", "x");
    if (opts.edit) writeFileSync(path.join(dir, "page.tsx"), "b\n");
    mkdirSync(path.join(dir, "seo", "data"), { recursive: true });
    mkdirSync(path.join(dir, "seo", "scripts"), { recursive: true });
    // Stand-in for run-flags.ts --summarize-execution.
    writeFileSync(path.join(dir, "seo", "scripts", "run-flags.ts"), 'console.log("{}");\n');
    if (opts.manifest !== undefined) writeFileSync(path.join(dir, "seo", "data", "run-manifest.json"), JSON.stringify(opts.manifest));
    const temp = path.join(dir, "temp");
    mkdirSync(temp);
    const out = path.join(dir, "out");
    writeFileSync(out, "");
    const script = (pkg.run as string).replace(/\$\{\{ steps\.claude\.outcome \}\}/g, opts.outcome ?? "failure");
    const r = runStep(script, dir, { RUNNER_TEMP: temp, GITHUB_OUTPUT: out, SEO_RUN_ID: "555" });
    return { ...r, output: readFileSync(out, "utf8") };
  };

  it("lets the job continue past the action's turn-count failure, with $4 as the binding limit", () => {
    expect(claude["continue-on-error"]).toBe(true);
    expect(claude.with?.claude_args).toContain("--max-turns 160");
    expect(claude.with?.claude_args).toContain("--max-budget-usd 4");
  });

  it("proposes the edits when the model wrote this run's manifest", () => {
    const r = packageRun({ manifest: { runId: "555", changes: [], skipped: [], issues: [] }, edit: true });
    expect(r.code, r.out).toBe(0);
    expect(r.output).toContain("proposed=true");
  });

  it("never proposes a run that was cut short (no manifest) or another run's manifest", () => {
    expect(packageRun({ edit: true }).output).toContain("proposed=false");
    expect(packageRun({ manifest: { runId: "554", changes: [] }, edit: true }).output).toContain("proposed=false");
    expect(packageRun({ manifest: { runId: "555", changes: [] }, edit: false }).output).toContain("proposed=false");
  });
});
