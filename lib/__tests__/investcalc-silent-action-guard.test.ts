import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

/**
 * Aug 2026 fix (LANE B). Client components under `components/investcalc/**`
 * used to `await` a Server Action with NO try/catch:
 *
 *   startSaving(async () => {
 *     const r = await updateSavedDealStageAction(id, next); // <-- can THROW
 *     if (!r.ok) { ...toast... }
 *   });
 *
 * The discriminated-union contract (§3.2) says actions return `{ ok:false }`
 * rather than throwing — but that only covers *handled* server errors. A
 * network blip, a cold-start 500, or a tab one deploy behind `main` (Next
 * throws on an unrecognized Server Action) makes the promise REJECT. With no
 * catch, the UI is left stuck (a spinner that never clears) or lying (an
 * optimistic update the server never stored, or "Auto-saved" when it wasn't) —
 * the auth-form bug (see components/auth/login-form.tsx) generalized.
 *
 * This guard keeps the class from creeping back. It scans every `"use client"`
 * file under `components/investcalc/**` and FAILS if an `await <name>Action(`
 * is reachable without error handling.
 *
 * An awaited action is considered GUARDED when any of these hold:
 *   (a) it sits inside a `try { ... }` block, OR
 *   (b) its own statement chains `.catch(` on the returned promise, OR
 *   (c) the awaited call lives in a named async helper (`const foo = async
 *       (...) => {`, incl. `useCallback(async ...)`) whose invocation is
 *       `.catch(`-chained somewhere in the file — the best-effort-load pattern
 *       used by investcalc-page's `runPropertyEnrichment(...).catch(...)` and
 *       template-selector's `void load().catch(...)`, where a throw is caught
 *       at the single call site instead of at each inner await.
 *
 * Only calls to identifiers ending in `Action` are checked — those are the
 * Server Actions. Local helpers, non-action awaits, and `.then(...)` chains are
 * out of scope.
 */

const INVESTCALC_DIR = fileURLToPath(
  new URL("../../components/investcalc", import.meta.url),
);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith(".tsx") || p.endsWith(".ts")) out.push(p);
  }
  return out;
}

/** Blank out comments (keeping newlines) so a commented-out await never trips
 *  the scan and a `.catch` mentioned in prose never falsely clears one. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, " "));
}

const ACTION_AWAIT = /await\s+([A-Za-z_$][\w$]*)\s*\(/g;
// `const foo = async (` / `let foo = useCallback(async (` / `var foo = (` —
// the opener of a named function whose body may enclose an awaited action.
const NAMED_FN =
  /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:useCallback\(\s*)?(?:async\s*)?\(/g;

/** Returns the list of unguarded `await <name>Action(` call sites in `source`
 *  (empty when the file is compliant). `source` should be a client component. */
export function findUnguardedActionAwaits(source: string): string[] {
  const src = stripComments(source);
  const offenders: string[] = [];

  ACTION_AWAIT.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ACTION_AWAIT.exec(src))) {
    const name = m[1];
    if (!name.endsWith("Action")) continue;
    const idx = m.index;

    // (a) enclosing try — build a brace stack up to idx, marking which opens
    // were preceded by `try`.
    const pre = src.slice(0, idx);
    const tryStack: boolean[] = [];
    for (let i = 0; i < pre.length; i++) {
      const c = pre[i];
      if (c === "{") tryStack.push(/try\s*$/.test(pre.slice(Math.max(0, i - 6), i)));
      else if (c === "}") tryStack.pop();
    }
    if (tryStack.some(Boolean)) continue;

    // (b) `.catch(` chained within this statement (up to the next `;`).
    const stmt = src.slice(idx).split(";")[0];
    if (/\)\s*\.catch\s*\(/.test(stmt) || /\.catch\s*\(/.test(stmt)) continue;

    // (c) nearest enclosing named async helper invoked with `.catch` elsewhere.
    let enclosingName: string | null = null;
    NAMED_FN.lastIndex = 0;
    let fn: RegExpExecArray | null;
    while ((fn = NAMED_FN.exec(pre))) enclosingName = fn[1]; // last one before idx
    if (enclosingName) {
      const guard = new RegExp(`\\b${enclosingName}\\s*\\([^;]*?\\)\\s*\\.catch`);
      if (guard.test(src)) continue;
    }

    offenders.push(`${name} (line ${source.slice(0, idx).split("\n").length})`);
  }
  return offenders;
}

function isClientComponent(source: string): boolean {
  return /^\s*["']use client["']/m.test(source);
}

describe("components/investcalc client components never await an action outside a try", () => {
  const files = walk(INVESTCALC_DIR).filter((f) => isClientComponent(readFileSync(f, "utf8")));
  const rels = files.map((f) => f.slice(f.indexOf("components/investcalc")));

  it("scans a non-trivial number of client components", () => {
    // Sanity: a broken path would make the scan vacuously pass.
    expect(files.length).toBeGreaterThan(20);
  });

  it.each(rels)("%s guards every awaited Server Action", (rel) => {
    const abs = files[rels.indexOf(rel)];
    const offenders = findUnguardedActionAwaits(readFileSync(abs, "utf8"));
    expect(
      offenders,
      `${rel} awaits a Server Action with no error handling. A thrown/rejected ` +
        `action (network blip, cold-start 500, stale-deploy Server Action) would ` +
        `leave the UI stuck or lying. Wrap it in try/catch/finally with a ` +
        `retryable destructive toast — see components/auth/login-form.tsx. ` +
        `Offenders: ${offenders.join(", ")}`,
    ).toEqual([]);
  });

  it("flags an unguarded action await if one is reintroduced (self-test)", () => {
    const sample = `"use client";
      function h() {
        startSaving(async () => {
          const r = await updateSavedDealStageAction(id, next);
          if (!r.ok) toast();
        });
      }`;
    expect(findUnguardedActionAwaits(sample)).toEqual(["updateSavedDealStageAction (line 4)"]);
  });

  it("accepts try, direct .catch, and enclosing-helper .catch (self-test)", () => {
    const inTry = `"use client";
      async function h() {
        try {
          const r = await saveDealAction(v);
          if (!r.ok) toast();
        } catch { toast(); }
      }`;
    const directCatch = `"use client";
      function h() {
        void addDealCommentAction(id, body).catch(() => null);
      }`;
    const helperCatch = `"use client";
      const runEnrichment = useCallback(async (place) => {
        const e = await enrichPropertyAction({ state: place.state });
        fill(e);
      }, []);
      useEffect(() => {
        runEnrichment(place, { silent: false }).catch((err) => warn(err));
      }, [x]);`;
    expect(findUnguardedActionAwaits(inTry)).toEqual([]);
    expect(findUnguardedActionAwaits(directCatch)).toEqual([]);
    expect(findUnguardedActionAwaits(helperCatch)).toEqual([]);
  });

  it("ignores non-action awaits and .then chains (self-test)", () => {
    const nonAction = `"use client";
      async function h() {
        const x = await fetchThing();
        const y = await computeLocalHelper();
      }`;
    expect(findUnguardedActionAwaits(nonAction)).toEqual([]);
  });
});
