import { describe, expect, it } from "vitest";
import { internalNextPathOrNull, safeInternalNextPath } from "@/lib/auth-schema";

/**
 * Jul 2026: signUpAction / resendConfirmationAction thread the caller's
 * validated ?next into the confirmation email's redirect (emailRedirectTo)
 * so a mid-flow signup (started Pro checkout, pending save) resumes after
 * the confirm hop. This helper is the server-side gate — internal paths
 * only, no protocol-relative open redirects, invalid falls back to "/".
 *
 * Aug 2026: the second attempt at this fix (origin comparison on the INPUT)
 * regressed it — `new URL(raw, BASE)` resolves dot-segments before you can
 * read `.origin`, so `/..//evil.com` was same-origin at check time and was
 * RETURNED as `//evil.com`, which router.push re-resolves to
 * https://evil.com/. The table below is the regression net: every attack
 * string must be rejected, every legitimate deep link must survive unchanged.
 */

/** Values that must NEVER be returned as a redirect target. */
const ATTACKS: Array<[label: string, payload: unknown]> = [
  // ── protocol-relative ────────────────────────────────────────────────────
  ["protocol-relative", "//evil.com"],
  ["protocol-relative with path", "//evil.com/pricing"],
  ["triple slash", "///evil.com"],
  ["quadruple slash", "////evil.com"],
  ["protocol-relative with creds", "//user:pass@evil.com"],

  // ── backslash authority (URL parser treats \ as /) ───────────────────────
  ["backslash authority", "/\\evil.com"],
  ["backslash authority with path", "/\\evil.com/pricing"],
  ["backslash + slash", "/\\/evil.com"],
  ["slash + backslash", "//\\evil.com"],
  ["leading backslash", "\\evil.com"],
  ["double backslash", "\\\\evil.com"],
  ["backslash mid-path", "/dashboard\\@evil.com"],

  // ── dot-segment normalization (the round-1 regression) ───────────────────
  ["dot-dot then authority", "/..//evil.com"],
  ["dot then authority", "/.//evil.com"],
  ["nested dot-dot then authority", "/a/../..//evil.com"],
  ["deep dot-dot then authority", "/a/b/../../..//evil.com"],
  ["dot-dot then backslash authority", "/..//\\evil.com"],
  ["dot-segment ladder", "/./././..//evil.com"],

  // ── absolute URLs / schemes ──────────────────────────────────────────────
  ["http absolute", "http://evil.com"],
  ["https absolute", "https://evil.com"],
  ["https absolute with path", "http://evil.com/x"],
  ["javascript scheme", "javascript:alert(1)"],
  ["javascript scheme mixed case", "JaVaScRiPt:alert(1)"],
  ["data scheme", "data:text/html;base64,x"],
  ["vbscript scheme", "vbscript:msgbox(1)"],
  ["scheme-relative with newline", "java\nscript:alert(1)"],

  // ── percent-encoded variants (decoded defensively) ───────────────────────
  ["encoded double slash", "/%2F%2Fevil.com"],
  ["encoded double slash uppercase", "/%2f%2fevil.com"],
  ["encoded backslash", "/%5Cevil.com"],
  ["encoded backslash lowercase", "/%5cevil.com"],
  ["encoded tab authority", "/%09/evil.com"],
  ["encoded newline authority", "/%0A/evil.com"],
  ["double-encoded double slash", "/%252F%252Fevil.com"],
  ["encoded dot-segment authority", "/..%2F/evil.com"],
  ["encoded scheme", "%2F%2Fevil.com"],

  // ── control characters / whitespace the parser strips ────────────────────
  ["literal tab", "/\t/evil.com"],
  ["literal newline", "/\n/evil.com"],
  ["literal carriage return", "/\r/evil.com"],
  ["literal NUL", "/\u0000/evil.com"],
  ["leading space", " //evil.com"],
  ["leading tab", "\t//evil.com"],
  ["vertical tab", "/\u000b/evil.com"],

  // ── unicode trickery ─────────────────────────────────────────────────────
  ["line separator U+2028", "/\u2028/evil.com"],
  ["paragraph separator U+2029", "/\u2029/evil.com"],
  ["non-breaking space", "/\u00a0/evil.com"],
  ["zero-width space", "/\u200b/evil.com"],
  ["right-to-left override", "/\u202e/evil.com"],
  ["BOM prefix", "\ufeff//evil.com"],
  ["ideographic space", "/\u3000/evil.com"],
  ["word joiner", "/\u2060/evil.com"],

  // ── non-paths and non-strings ────────────────────────────────────────────
  ["relative word", "pricing"],
  ["empty string", ""],
  ["undefined", undefined],
  ["null", null],
  ["number", 42],
  ["object", { next: "/pricing" }],
  ["array", ["/pricing"]],
  ["bare host", "evil.com"],
];

/** Values that must survive validation unchanged (real product flows). */
const LEGITIMATE: string[] = [
  "/",
  "/dashboard",
  "/pricing?checkout=pro_monthly#plans",
  "/auth/update-password",
  "/admin/email-preview",
  // Rate-alert deep link (app/dashboard/saved-analyses/[id]/page.tsx).
  "/dashboard/saved-analyses/123?rate=6.5&src=x#frag",
  "/dashboard/saved-analyses/8f1c0a2e-2b7a-4a1d-9d0b-6f5b7c2e1234?rate=6.125&src=rate-alert",
  // Pending-save-intent flow (lib/save-intent.ts) + compare/templates links.
  "/?intent=save",
  "/compare?ids=1,2",
  "/templates",
  // Percent-encoding inside a query value must NOT be mistaken for an attack.
  "/dashboard?q=100%25",
  "/dashboard?q=a%2Fb",
  "/dashboard?address=123%20Main%20St",
];

describe("internalNextPathOrNull / safeInternalNextPath", () => {
  describe("rejects every open-redirect payload", () => {
    it.each(ATTACKS)("rejects %s", (_label, payload) => {
      expect(internalNextPathOrNull(payload)).toBeNull();
      expect(safeInternalNextPath(payload)).toBe("/");
    });
  });

  describe("preserves legitimate internal paths", () => {
    it.each(LEGITIMATE)("passes %s through unchanged", (path) => {
      expect(internalNextPathOrNull(path)).toBe(path);
      expect(safeInternalNextPath(path)).toBe(path);
    });
  });

  /**
   * These assertions are the *proof* the payloads above are dangerous rather
   * than merely odd: without the guard each one resolves to an off-site
   * origin once the browser (or Next's router) re-resolves it against the
   * real site URL.
   */
  it("sanity: the guarded payloads really do resolve off-origin", () => {
    const site = "https://usetruecap.com";
    expect(new URL("//evil.com", site).origin).toBe("https://evil.com");
    expect(new URL("/\\evil.com", site).origin).toBe("https://evil.com");
    // The round-1 regression: same-origin at check time, off-origin after the
    // returned pathname is re-resolved by router.push.
    expect(new URL("/..//evil.com", site).origin).toBe(site);
    expect(new URL("/..//evil.com", site).pathname).toBe("//evil.com");
    expect(new URL(new URL("/..//evil.com", site).pathname, site).origin).toBe("https://evil.com");
    expect(new URL(new URL("/.//evil.com", site).pathname, site).origin).toBe("https://evil.com");
    expect(new URL(new URL("/a/../..//evil.com", site).pathname, site).origin).toBe(
      "https://evil.com"
    );
  });

  it("never returns a value that can resolve off-origin", () => {
    const site = "https://usetruecap.com";
    for (const [, payload] of ATTACKS) {
      const result = safeInternalNextPath(payload);
      expect(new URL(result, site).origin).toBe(site);
      // …and the returned value is itself a single-slash-prefixed path, so a
      // second re-resolution (router.push → location.assign) is also safe.
      expect(new URL(new URL(result, site).pathname, site).origin).toBe(site);
    }
    for (const path of LEGITIMATE) {
      const result = safeInternalNextPath(path);
      expect(new URL(result, site).origin).toBe(site);
      expect(new URL(new URL(result, site).pathname, site).origin).toBe(site);
    }
  });

  it("internalNextPathOrNull returns null (not '/') for unsafe values", () => {
    expect(internalNextPathOrNull("/pricing")).toBe("/pricing");
    expect(internalNextPathOrNull("/")).toBe("/");
    expect(internalNextPathOrNull("/\\evil.com")).toBeNull();
    expect(internalNextPathOrNull("//evil.com")).toBeNull();
    expect(internalNextPathOrNull("/..//evil.com")).toBeNull();
    expect(internalNextPathOrNull("https://evil.com")).toBeNull();
    expect(internalNextPathOrNull(null)).toBeNull();
    expect(internalNextPathOrNull("pricing")).toBeNull();
  });

  it("resolves harmless dot-segments instead of rejecting them", () => {
    // Dot-segments that stay site-relative are normalized, not refused — the
    // guard is about the authority, not about punishing tidy-able paths.
    expect(internalNextPathOrNull("/dashboard/../pricing")).toBe("/pricing");
    expect(internalNextPathOrNull("/./dashboard")).toBe("/dashboard");
    expect(internalNextPathOrNull("/../dashboard")).toBe("/dashboard");
  });

  it("rejects absurdly long values", () => {
    expect(internalNextPathOrNull(`/${"a".repeat(4000)}`)).toBeNull();
  });
});
