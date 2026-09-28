import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const RESTORE = join(process.cwd(), "seo/scripts/state-restore.sh");
const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: "t",
  GIT_AUTHOR_EMAIL: "t@example.invalid",
  GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t@example.invalid",
  GIT_CONFIG_NOSYSTEM: "1",
};

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function git(cwd: string, ...args: string[]) {
  const result = spawnSync("git", ["-c", "commit.gpgsign=false", "-c", "init.defaultBranch=main", ...args], { cwd, env: GIT_ENV, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
  return result.stdout;
}

/** A remote whose seo-state branch holds `files`, and a clone-less checkout pointing at it. */
function fixture(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), "seo-state-restore-"));
  dirs.push(root);
  const remote = join(root, "remote.git");
  const writer = join(root, "writer");
  const runner = join(root, "runner");
  for (const dir of [remote, writer, runner]) mkdirSync(dir);
  git(remote, "init", "--bare", "-q");
  git(writer, "init", "-q");
  git(writer, "checkout", "-q", "--orphan", "seo-state");
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(dirname(join(writer, path)), { recursive: true });
    writeFileSync(join(writer, path), body);
  }
  git(writer, "add", "-A");
  git(writer, "commit", "-q", "-m", "state");
  git(writer, "push", "-q", `file://${remote}`, "seo-state");
  git(runner, "init", "-q");
  git(runner, "remote", "add", "origin", `file://${remote}`);
  return runner;
}

function restore(cwd: string) {
  return spawnSync("bash", [RESTORE], { cwd, env: GIT_ENV, encoding: "utf8" });
}

describe("state-restore.sh", () => {
  it("accepts the dated baseline snapshots lessons.md cites, and restores only the run-state files", () => {
    const runner = fixture({
      "seo/lessons.md": "# lessons\n",
      "seo/ledger.jsonl": "",
      "seo/data/index-status.json": "{}\n",
      "seo/data/baseline-2026-09-28.json": "{}\n",
      "seo/reports/2026-W40.md": "report\n",
      "vercel.json": "{}\n",
      "README.md": "# seo-state\n",
    });
    const result = restore(runner);
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(readFileSync(join(runner, "seo/lessons.md"), "utf8")).toBe("# lessons\n");
    expect(existsSync(join(runner, "seo/data/index-status.json"))).toBe(true);
    // Published for readers, never overlaid into a run.
    expect(existsSync(join(runner, "seo/data/baseline-2026-09-28.json"))).toBe(false);
  });

  it.each(["seo/data/baseline-latest.json", "seo/data/other.json", "app/page.tsx"])("refuses a branch carrying %s", (path) => {
    const runner = fixture({ "seo/lessons.md": "# lessons\n", [path]: "x\n" });
    const result = restore(runner);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("REFUSING TO RESTORE");
    expect(result.stdout).toContain(path);
    expect(existsSync(join(runner, "seo/lessons.md"))).toBe(false);
  });
});
