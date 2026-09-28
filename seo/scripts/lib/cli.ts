/**
 * Tiny CLI harness shared by every seo/scripts/*.ts entry point.
 *
 * The toolkit runs under plain `node` (native TypeScript type stripping), so
 * this file may only use erasable syntax: no enums, no namespaces, no
 * parameter properties, and `import type` for type-only imports.
 *
 * Every script calls `runMain(import.meta.url, main, selfTest, { flags })`.
 * That gives five guarantees the tests rely on:
 *   1. Importing a script never runs it (the entry-point check below).
 *   2. `--self-test` runs pure checks only — no network, no disk writes — so
 *      lib/__tests__/seo-loop-self-test.test.ts can spawn every script under
 *      real Node and catch link-time errors vitest's transformer would hide.
 *   3. A thrown error prints its message (never a credential) and exits 1.
 *   4. `--help` / `-h` prints the script's header comment and exits 0 before
 *      `main` runs, so asking for usage never writes a file or calls a network.
 *   5. A flag the script does not declare fails the run (exit 1) before
 *      `main` runs: a typo such as `--dryrun` must not do the real write, and a
 *      workflow flag the script ignores must not pass silently.
 */

import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

export type Args = {
  flags: Map<string, string | true>;
  positionals: string[];
};

export function parseArgs(argv: string[] = process.argv.slice(2)): Args {
  const flags = new Map<string, string | true>();
  const positionals: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const eq = token.indexOf("=");
      if (eq !== -1) {
        flags.set(token.slice(2, eq), token.slice(eq + 1));
        continue;
      }
      const name = token.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags.set(name, next);
        i += 1;
      } else {
        flags.set(name, true);
      }
    } else {
      positionals.push(token);
    }
  }
  return { flags, positionals };
}

export function flagString(args: Args, name: string, fallback: string): string;
export function flagString(args: Args, name: string): string | null;
export function flagString(args: Args, name: string, fallback: string | null = null): string | null {
  const value = args.flags.get(name);
  if (value === undefined || value === true) return fallback;
  return value;
}

export function flagNumber(args: Args, name: string, fallback: number): number {
  const value = args.flags.get(name);
  if (value === undefined || value === true) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`--${name} must be a number, got "${value}"`);
  return parsed;
}

export function hasFlag(args: Args, name: string): boolean {
  return args.flags.has(name);
}

/** A flag that must carry a value; the error names the flag instead of failing later on an empty path. */
export function requireFlag(args: Args, name: string, placeholder = "value"): string {
  const value = flagString(args, name);
  if (value === null || value === "") throw new Error(`--${name} <${placeholder}> is required`);
  return value;
}

/** Flags every script accepts, whatever it declares. */
export const COMMON_FLAGS: readonly string[] = ["self-test", "help"];

/** Flags in `args` that are neither declared nor common, in the order given. */
export function unknownFlags(args: Args, declared: readonly string[]): string[] {
  const known = new Set([...COMMON_FLAGS, ...declared]);
  return [...args.flags.keys()].filter((name) => !known.has(name));
}

export function wantsHelp(args: Args): boolean {
  return args.flags.has("help") || args.positionals.includes("-h");
}

/** The script's leading block comment, without its comment markers: its usage text. */
export function headerComment(source: string): string {
  const match = /^(?:#![^\n]*\n)?\s*\/\*\*?([\s\S]*?)\*\//.exec(source);
  if (!match) return "";
  return match[1]
    .split("\n")
    .map((line) => line.replace(/^\s*\* ?/, ""))
    .join("\n")
    .trim();
}

/** Progress and diagnostics go to stderr so stdout stays machine-readable. */
export function log(...parts: unknown[]): void {
  console.error(...parts);
}

export function isEntryPoint(importMetaUrl: string): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    if (pathToFileURL(entry).href === importMetaUrl) return true;
    // Node resolves the module through symlinks (macOS /var → /private/var)
    // but leaves argv[1] as typed, so compare real paths too; without this a
    // script run through a symlinked path loaded, did nothing and exited 0.
    return realpathSync(entry) === realpathSync(fileURLToPath(importMetaUrl));
  } catch {
    return false;
  }
}

export type MainFn = (args: Args) => Promise<number | void> | number | void;
export type SelfTestFn = () => Promise<void> | void;
export type RunOptions = {
  /** Every flag the script reads, across all of its subcommands (without the leading --). */
  flags: readonly string[];
};

/**
 * Run `main` when this module is the process entry point. Exit code is
 * `main`'s return value (default 0). `--self-test` runs `selfTest` instead,
 * `--help` prints the header comment, and an undeclared flag exits 1.
 */
export function runMain(importMetaUrl: string, main: MainFn, selfTest?: SelfTestFn, options?: RunOptions): void {
  if (!isEntryPoint(importMetaUrl)) return;
  const args = parseArgs();
  const name = importMetaUrl.split("/").pop() ?? "script";
  const run = async (): Promise<number> => {
    if (wantsHelp(args)) {
      let usage = "";
      try {
        usage = headerComment(readFileSync(fileURLToPath(importMetaUrl), "utf8"));
      } catch {
        usage = "";
      }
      console.log(usage || `${name}: no usage text`);
      return 0;
    }
    if (options) {
      const unknown = unknownFlags(args, options.flags);
      if (unknown.length) {
        console.error(`${name}: unknown flag ${unknown.map((f) => `--${f}`).join(", ")} (see --help)`);
        return 1;
      }
    }
    if (hasFlag(args, "self-test")) {
      if (selfTest) await selfTest();
      console.log(`self-test ok ${name}`);
      return 0;
    }
    const code = await main(args);
    return typeof code === "number" ? code : 0;
  };
  run().then(
    (code) => {
      process.exitCode = code;
    },
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`${name}: ${message}`);
      process.exitCode = 1;
    },
  );
}

/** Minimal assertion for self-tests (no test framework under plain node). */
export function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`self-test failed: ${message}`);
}
