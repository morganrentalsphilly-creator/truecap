/**
 * File I/O for the SEO toolkit: atomic JSON writes, JSONL append, and the
 * secret tripwire every written artifact passes through.
 *
 * The repository is PUBLIC and the run state is pushed to a public branch, so
 * anything this toolkit writes is published. `writeJson` / `writeText` refuse
 * to write bytes that contain a credential, a private-key block, a local home
 * directory path, or a runner path (the identity sweep in
 * lib/__tests__/site-overhaul-product-shots.test.ts fails on the latter two).
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, appendFileSync } from "node:fs";
import path from "node:path";

const SECRET_PATTERNS: RegExp[] = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bsk-ant-[A-Za-z0-9_-]{10,}/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/,
  /\bya29\.[A-Za-z0-9_-]{20,}/,
  /"private_key"\s*:/,
  /\bsk_(live|test)_[A-Za-z0-9]{10,}/,
  /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/,
];

const LOCAL_PATH_PATTERNS: RegExp[] = [/\/Users\/[A-Za-z0-9._-]+\//, /\/home\/[A-Za-z0-9._-]+\//];

/** Extra literal secrets registered at runtime (e.g. an access token). */
const registeredSecrets = new Set<string>();

export function registerSecret(value: string | null | undefined): void {
  if (value && value.length >= 12) registeredSecrets.add(value);
}

/** Throws if `text` would publish a credential or a local path. */
export function assertPublishable(text: string, label: string): void {
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(text)) throw new Error(`refusing to write ${label}: it matches a credential pattern (${pattern.source.slice(0, 24)}…)`);
  }
  for (const secret of registeredSecrets) {
    if (text.includes(secret)) throw new Error(`refusing to write ${label}: it contains a registered credential`);
  }
  for (const pattern of LOCAL_PATH_PATTERNS) {
    if (pattern.test(text)) throw new Error(`refusing to write ${label}: it contains a local filesystem path`);
  }
}

export function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

export function readJsonIfExists<T>(file: string | null | undefined): T | null {
  if (!file || !existsSync(file)) return null;
  return readJson<T>(file);
}

function atomicWrite(file: string, text: string): void {
  ensureDir(path.dirname(file));
  const tmp = `${file}.tmp-${process.pid}`;
  writeFileSync(tmp, text);
  renameSync(tmp, file);
}

export function writeJson(file: string, value: unknown): void {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  assertPublishable(text, path.basename(file));
  atomicWrite(file, text);
}

export function writeText(file: string, text: string): void {
  assertPublishable(text, path.basename(file));
  atomicWrite(file, text.endsWith("\n") ? text : `${text}\n`);
}

export function readJsonl<T>(file: string): T[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line, i) => {
      try {
        return JSON.parse(line) as T;
      } catch {
        throw new Error(`${path.basename(file)} line ${i + 1} is not valid JSON`);
      }
    });
}

export function appendJsonl(file: string, rows: unknown[]): void {
  if (!rows.length) return;
  const text = rows.map((row) => JSON.stringify(row)).join("\n") + "\n";
  assertPublishable(text, path.basename(file));
  ensureDir(path.dirname(file));
  appendFileSync(file, text);
}
