/**
 * Opaque public shares — token primitives + the route-level privacy contract.
 *
 * The load-bearing properties: tokens are high-entropy and non-sequential, the
 * at-rest form is a hash (a DB leak alone can't reconstruct links), malformed
 * tokens are rejected before any DB round-trip, and the share/portal routes
 * carry the no-referrer/noindex/no-store headers that keep deal data out of
 * referrer logs, search indexes, and CDN caches.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { generateShareToken, hashShareToken, isWellFormedShareToken } from "@/lib/share-token";
import { isPublicShareExpired } from "@/lib/public-share-lifecycle";

const ROOT = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

describe("share tokens", () => {
  it("are 43-char base64url (256 bits) and unique across mints", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const t = generateShareToken();
      expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(seen.has(t)).toBe(false);
      seen.add(t);
    }
  });

  it("hash to a stable sha256 hex, distinct per token", () => {
    const a = generateShareToken();
    const b = generateShareToken();
    expect(hashShareToken(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashShareToken(a)).toBe(hashShareToken(a));
    expect(hashShareToken(a)).not.toBe(hashShareToken(b));
  });

  it("reject malformed tokens before any lookup", () => {
    for (const bad of ["", "short", "x".repeat(44), "has spaces here" + "x".repeat(28), "ä".repeat(43)]) {
      expect(isWellFormedShareToken(bad)).toBe(false);
    }
    expect(isWellFormedShareToken(generateShareToken())).toBe(true);
  });
});

describe("opaque share lifecycle", () => {
  it("expires at the exact boundary and fails closed on malformed timestamps", () => {
    const now = Date.parse("2026-08-24T12:00:00.000Z");
    expect(isPublicShareExpired(null, now)).toBe(false);
    expect(isPublicShareExpired("2026-08-24T12:00:00.001Z", now)).toBe(false);
    expect(isPublicShareExpired("2026-08-24T12:00:00.000Z", now)).toBe(true);
    expect(isPublicShareExpired("2026-08-24T11:59:59.999Z", now)).toBe(true);
    expect(isPublicShareExpired("not-a-date", now)).toBe(true);
  });

  it("applies a generic read-side rate limit before token resolution", () => {
    const page = read("app/s/[token]/page.tsx");
    const rateGate = page.indexOf("opaqueShareReadRateLimit.isOverLimit");
    const resolver = page.indexOf("resolvePublicShare(token)");
    expect(rateGate).toBeGreaterThan(-1);
    expect(resolver).toBeGreaterThan(rateGate);
    expect(page).not.toContain("token_valid");
  });
});

describe("the share-route privacy contract", () => {
  const config = read("next.config.mjs");

  it("the /s/ route sends no-referrer + noindex + no-store", () => {
    const i = config.indexOf('source: "/s/:path+"');
    expect(i, "/s/ header block missing from next.config.mjs").toBeGreaterThan(-1);
    const block = config.slice(i, i + 700);
    expect(block).toContain('"no-referrer"');
    expect(block).toContain("noindex, nofollow, noarchive, nosnippet");
    expect(block).toContain("private, no-store");
  });

  it("the legacy /d/ route sends the same no-referrer + noindex + no-store policy", () => {
    const i = config.indexOf('source: "/d/:path+"');
    expect(i, "/d/ header block missing from next.config.mjs").toBeGreaterThan(-1);
    const block = config.slice(i, config.indexOf('source: "/s/:path+"', i));
    expect(block).toContain('"no-referrer"');
    expect(block).toContain("noindex, nofollow, noarchive, nosnippet");
    expect(block).toContain("private, no-store");
  });

  it("the /s/ block sits AFTER the catch-all so its keys win the merge", () => {
    // Next.js applies every matching header source in order; the LAST value per
    // key wins. If this block drifts above the catch-all, the catch-all's
    // strict-origin-when-cross-origin silently overrides no-referrer.
    expect(config.indexOf('source: "/s/:path+"')).toBeGreaterThan(
      config.indexOf('"/((?!embed/).*)"')
    );
  });

  it("the /s/ page never indexes and resolves before rendering", () => {
    const page = read("app/s/[token]/page.tsx");
    expect(page).toContain("resolvePublicShare");
    expect(page).toContain("index: false");
    expect(page).toContain("noarchive");
  });

  it("the portal deal view carries no encoded payload in its URL scheme", () => {
    // The portal must link deals as /portal/<token>/d/<dealId> — ids only.
    const portal = read("lib/client-portal.ts");
    expect(portal).toContain("`/portal/${portalToken}/d/${row.id}`");
    expect(portal).not.toContain("encodeShareLink");
  });

  it("new share links fail closed to opaque URLs", () => {
    const btn = read("components/investcalc/share-link-button.tsx");
    const action = read("app/actions/public-shares.ts");
    const store = read("lib/public-share.ts");
    const route = read("app/s/[token]/page.tsx");
    const view = read("components/investcalc/read-only-analysis-view.tsx");
    expect(btn).toContain("createPublicShareAction");
    expect(btn).not.toContain("encodeShareLink");
    expect(btn).not.toContain("getSignedShareAttribution");
    expect(btn).toContain('opaque.code === "SIGN_IN_REQUIRED"');
    expect(btn).toContain("throw new Error(opaque.code)");
    expect(btn).toContain("maoTarget: maoTarget ?? undefined");
    expect(btn).toContain("maoTargetSource: maoTargetSource ?? undefined");
    expect(action).toContain("normalizeMaoTarget(parsed.data.maoTarget)");
    expect(store).toContain("maoTarget?: MaoTarget");
    expect(route).toContain("maoTarget={displayMaoTarget}");
    expect(route).toContain("offerCeilingAccess={offerCeilingAccess}");
    expect(route).toContain("resolved.snapshot.maoTargetSource");
    expect(view).not.toContain("calculateMaxAllowableOffer(values, maoTarget)");
    expect(btn).toContain('addressVisibility: includeAddress ? "full" : "hidden"');
    expect(btn).toContain("Off by default");
    expect(store).toContain("resultSnapshot: capturedResult");
    expect(store).toContain("methodologyVersion: capturedMethodologyVersion");
    expect(store).toContain("offerCeilingExact");
    expect(store).toContain("const hasRecordedInput = input.resultSnapshot !== undefined");
    expect(store).toContain("adoptedTarget && !usesRecordedSnapshot");
    expect(store).toContain("snapshotTarget = recordedCeiling.captured");
    expect(route).toContain("resolveSavedAnalysisResult");
    expect(route).toContain("resolved.snapshot.resultSnapshot");
    expect(route).toContain("resolved.snapshot.offerCeilingExact");
    expect(route).toContain("canRecomputeInputOnlyShare");
  });

  it("authenticates before the service-role mint and requires an owner", () => {
    const action = read("app/actions/public-shares.ts");
    const store = read("lib/public-share.ts");
    const createStart = action.indexOf("export async function createPublicShareAction");
    const authRead = action.indexOf("await supabase.auth.getUser()", createStart);
    const authGate = action.indexOf('code: "SIGN_IN_REQUIRED"', authRead);
    const mint = action.indexOf("mintPublicShare({", createStart);

    expect(createStart).toBeGreaterThan(-1);
    expect(authRead).toBeGreaterThan(createStart);
    expect(authGate).toBeGreaterThan(authRead);
    expect(mint).toBeGreaterThan(authGate);
    expect(action.slice(authRead, mint)).toContain("if (!user)");
    expect(action).toContain("ownerId: user.id");
    expect(action).not.toContain("ownerId: user?.id ?? null");
    expect(store).toContain("ownerId: string;");
    expect(store).toContain("if (!input.ownerId) return null");
    expect(store).toContain("owner_id: input.ownerId");
  });

  it("prompts for auth with a safe return path and preserves draft continuity", () => {
    const btn = read("components/investcalc/share-link-button.tsx");
    const dashboard = read("components/investcalc/analysis-dashboard.tsx");

    expect(btn).toContain('href={`/auth/sign-up?next=${encodedReturnPath}`}');
    expect(btn).toContain('href={`/auth/login?next=${encodedReturnPath}`}');
    expect(btn).toContain('pathname.startsWith("/") && !pathname.startsWith("//")');
    expect(btn).toContain("onClick={prepareAuthNavigation}");
    expect(btn).toContain("Draft continuity is best-effort and must never block authentication");
    expect(btn).toContain("Existing links still open without an account");
    expect(dashboard).toContain("onPrepareAuthSave(adoptedMaoTarget, adoptedMaoTargetSource)");
    expect(dashboard).toContain("Screening defaults are examples, not investor instructions");
  });

  it("keeps historical opaque and legacy viewers plus owner-scoped revoke", () => {
    const action = read("app/actions/public-shares.ts");
    const store = read("lib/public-share.ts");
    const opaqueViewer = read("app/s/[token]/page.tsx");
    const legacyViewer = read("app/d/[encoded]/page.tsx");

    expect(store).toContain("ownerId: string | null;");
    expect(opaqueViewer).toContain("resolvePublicShare(token)");
    expect(legacyViewer).toContain("decodeShareLink");
    expect(action).toContain('.eq("owner_id", user.id)');
  });

  it("rejects an explicitly supplied invalid target before minting a share", () => {
    const action = read("app/actions/public-shares.ts");
    const normalize = action.indexOf("normalizeMaoTarget(parsed.data.maoTarget)");
    const invalidTargetGuard = action.indexOf(
      "if (parsed.data.maoTarget !== undefined && !parsedMaoTarget)"
    );
    const mint = action.indexOf("mintPublicShare({");

    expect(normalize).toBeGreaterThanOrEqual(0);
    expect(invalidTargetGuard).toBeGreaterThan(normalize);
    expect(mint).toBeGreaterThan(invalidTargetGuard);
    expect(action.slice(invalidTargetGuard, mint)).toContain('code: "VALIDATION_ERROR"');
    expect(action.slice(invalidTargetGuard, mint)).toContain(
      'message: "Couldn\'t read these targets."'
    );
  });

  it("preserves target provenance through focused share, workspace share, and fork", () => {
    const focused = read(
      "components/investcalc/focused-decision-summary.tsx"
    );
    const workspace = read(
      "app/dashboard/saved-analyses/[id]/page.tsx"
    );
    const shell = read("components/investcalc/shared-deal-shell.tsx");
    const viewer = read(
      "components/investcalc/read-only-analysis-view.tsx"
    );

    expect(focused).toContain("maoTargetSource={targetAdopted ? targetSource : undefined}");
    expect(focused).toContain("maoTarget={targetAdopted ? target : undefined}");
    expect(workspace).toContain("maxOfferTargetSource");
    expect(workspace).toContain("maoTargetSource={shareMaoTargetSource}");
    expect(shell).toContain("maoTargetSource={maoTargetSource}");
    expect(viewer).toContain("source: maoTargetSource");
    expect(viewer).toContain('trackEvent("shared_scenario_forked", {})');
  });

  it("legacy /d/ keeps decoding (CLAUDE.md §8.8 — links in the wild)", () => {
    const d = read("app/d/[encoded]/page.tsx");
    expect(d).toContain("decodeShareLink");
    expect(d).toContain("SharedDealShell");
  });
});
