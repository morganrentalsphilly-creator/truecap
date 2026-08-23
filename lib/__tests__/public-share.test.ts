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
    expect(btn).toContain("if (!opaque.ok) throw new Error(opaque.code)");
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
    expect(store).toContain("methodologyVersion: TRUECAP_UNDERWRITING_STANDARD_VERSION");
    expect(route).toContain("resolved.methodologyVersion !== TRUECAP_UNDERWRITING_STANDARD_VERSION");
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

    expect(focused).toContain("maoTargetSource={targetSource}");
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
