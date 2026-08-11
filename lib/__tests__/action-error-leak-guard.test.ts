import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Aug 2026 security fix (LANE A). Server actions used to return raw Supabase /
 * Postgres error strings straight to the browser, e.g.
 *   `return { ok: false, code: "SERVER_ERROR", message: someErr.message }`.
 * Those messages carry table + column names and migration state (a schema
 * fingerprint an observer can mine), AND they never reached Sentry — so a
 * broken Pro feature produced no operator signal. The fix routes every such
 * path through `lib/db-error.ts::toServerErrorResult(error, "<feature>")`,
 * which captures to Sentry and returns a generic user-safe message.
 *
 * This guard keeps the leak from creeping back. It scans every `app/actions/**`
 * file and FAILS if a client-facing `{ ok: false, ... }` return builds its
 * `message` field directly from the `.message` of a *caught error* variable
 * (any identifier whose name ends in `err`/`error`, case-insensitive — that is
 * the shape of a Supabase destructured `error`/`xxxErr` or a `catch (error)`).
 *
 * Deliberately NOT flagged:
 *  - Intentional user-facing messages under the known codes
 *    (VALIDATION_ERROR, SIGN_IN_REQUIRED, ENTITLEMENT_*, DUPLICATE_*). Those
 *    are curated copy, not schema leaks.
 *  - `.message` off non-error values (`result.message`, `body.message`,
 *    `first?.message`, `parsed.error.issues[0]?.message`) — those identifiers
 *    don't match the err/error name heuristic, or the member isn't read off a
 *    bare identifier.
 *  - Sentry breadcrumbs (`extra: { message: someErr.message }`). Sending the
 *    raw message TO Sentry is the point — it just must not go to the client.
 *    Those live inside a nested `{ ... }` (the capture options object) that has
 *    no sibling `ok: false`, so the brace-bounded window below never spans
 *    them.
 */

function read(rel: string): string {
  return readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
}

const ACTIONS_DIR = fileURLToPath(new URL("../../app/actions", import.meta.url));

function actionFiles(): string[] {
  return readdirSync(ACTIONS_DIR)
    .filter((name) => name.endsWith(".ts"))
    .sort();
}

// Codes whose `message` is intentional user-facing copy, not a raw-error leak.
// A leak return under one of these codes would still be caught by the
// err-identifier check below, but we allow them so curated messages that
// happen to read `<something>Error.message` off a non-DB value stay legal.
const ALLOWED_CODE = /^(VALIDATION_ERROR|SIGN_IN_REQUIRED|ENTITLEMENT_|DUPLICATE_)/;

// A caught-error identifier: the Supabase destructured `error` / `xxxErr` /
// `xxxError`, or a `catch (error)` binding. Matches names ending in err/error.
const ERR_IDENT = /(?:err|error)$/i;

/**
 * Find every client-facing `{ ok: false ... message: <ident>.message }` return
 * whose `<ident>` is a caught error and whose `code` is not an allowed one.
 *
 * The window is brace-bounded: `[^{}]*?` between `ok: false` and `message:`
 * cannot cross a `{`/`}`, so it stays inside one flat object literal and never
 * reaches into a nested Sentry options/`extra` object.
 */
function findLeaks(source: string): string[] {
  const leaks: string[] = [];
  const re =
    /ok:\s*false[^{}]*?message:\s*([A-Za-z_$][\w$]*)\??\.message/g;
  for (const match of source.matchAll(re)) {
    const ident = match[1];
    if (!ERR_IDENT.test(ident)) continue;
    const windowText = match[0];
    const codeMatch = windowText.match(/code:\s*"([^"]+)"/);
    const code = codeMatch?.[1] ?? "";
    if (ALLOWED_CODE.test(code)) continue;
    leaks.push(`${ident}.message${code ? ` (code "${code}")` : ""}`);
  }
  return leaks;
}

describe("app/actions never leak a caught error's raw .message to the client", () => {
  const files = actionFiles();

  it("scans a non-trivial number of action files", () => {
    // Sanity: if the directory move breaks, the scan would vacuously pass.
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files)("%s returns generic messages on error paths", (name) => {
    const source = read(`../../app/actions/${name}`);
    const leaks = findLeaks(source);
    expect(
      leaks,
      `${name} returns a raw caught-error .message to the client — route it ` +
        `through toServerErrorResult(error, "<feature>") from lib/db-error.ts. ` +
        `Offenders: ${leaks.join(", ")}`,
    ).toEqual([]);
  });

  it("would flag a raw-error leak if one were reintroduced (self-test)", () => {
    const sample =
      'return { ok: false, code: "SERVER_ERROR", message: savedAnalysisError.message };';
    expect(findLeaks(sample)).toEqual(["savedAnalysisError.message (code \"SERVER_ERROR\")"]);
  });

  it("does not flag Sentry breadcrumbs or curated messages (self-test)", () => {
    const sentryExtra =
      'Sentry.captureMessage("x", { extra: { message: brandingError.message, code: brandingError.code } });';
    const curated =
      'return { ok: false, code: "VALIDATION_ERROR", message: first?.message ?? "Invalid input." };';
    const nonError =
      'return { ok: false, code: "SERVER_ERROR", message: result.message ?? "Could not apply." };';
    expect(findLeaks(sentryExtra)).toEqual([]);
    expect(findLeaks(curated)).toEqual([]);
    expect(findLeaks(nonError)).toEqual([]);
  });
});
