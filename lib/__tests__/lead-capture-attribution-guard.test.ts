import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  signLeadCaptureAuthorization,
  signShareAttribution,
  verifyLeadCaptureAuthorization,
  verifyShareAttribution,
} from "@/lib/share-attribution";

/**
 * Aug 2026 security fix. The share-attribution HMAC was enforced on the RENDER
 * path (/d/[encoded] refuses to co-brand for an unsigned meta.ownerId) but not
 * on the WRITE path: captureDealLeadAction took `ownerId` straight from the
 * request body with only a uuid-shape check and inserted with the service-role
 * client — the only writer deal_leads has, since its RLS grants SELECT only.
 * So an anonymous caller could post any Pro user's uuid and land forged rows in
 * that user's private lead inbox (and, once LEAD_NOTIFICATIONS_MODE=live, mail
 * them attacker-authored text), and could use the distinguishable
 * OWNER_NOT_ELIGIBLE reply as a "is this account paying?" oracle.
 *
 * Guarded here in two layers: the primitive really is owner-bound, and the
 * action really does call it before writing.
 */

function read(rel: string): string {
  return readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
}

describe("share attribution is bound to the owner it names", () => {
  const OLD = process.env.SHARE_LINK_SECRET;
  beforeAll(() => {
    process.env.SHARE_LINK_SECRET = "test-secret-for-attribution-guard";
  });
  afterAll(() => {
    if (OLD === undefined) delete process.env.SHARE_LINK_SECRET;
    else process.env.SHARE_LINK_SECRET = OLD;
  });

  const ownerA = "11111111-1111-4111-8111-111111111111";
  const ownerB = "22222222-2222-4222-8222-222222222222";
  const dealId = "33333333-3333-4333-8333-333333333333";
  const valuesHash = "abc123abc123abc123abc123";

  it("verifies the tuple it signed", () => {
    const sig = signShareAttribution({ ownerId: ownerA, dealId, valuesHash });
    expect(sig).toBeTruthy();
    expect(
      verifyShareAttribution({ ownerId: ownerA, dealId, valuesHash, sig }),
    ).toBe(true);
  });

  it("rejects a missing signature — the pre-fix lead-write path", () => {
    expect(
      verifyShareAttribution({
        ownerId: ownerA,
        dealId,
        valuesHash,
        sig: null,
      }),
    ).toBe(false);
    expect(
      verifyShareAttribution({ ownerId: ownerA, dealId, valuesHash }),
    ).toBe(false);
  });

  it("rejects another owner's signature swapped onto this ownerId", () => {
    const sigForA = signShareAttribution({
      ownerId: ownerA,
      dealId,
      valuesHash,
    });
    expect(
      verifyShareAttribution({
        ownerId: ownerB,
        dealId,
        valuesHash,
        sig: sigForA,
      }),
    ).toBe(false);
  });

  it("rejects a signature lifted onto different deal values", () => {
    const sigForA = signShareAttribution({
      ownerId: ownerA,
      dealId,
      valuesHash,
    });
    expect(
      verifyShareAttribution({
        ownerId: ownerA,
        dealId,
        valuesHash: "ffffffffffffffffffffffff",
        sig: sigForA,
      }),
    ).toBe(false);
  });
});

describe("the lead WRITE path verifies attribution before inserting", () => {
  const action = read("../../app/actions/capture-deal-lead.ts");

  it("calls the surface-bound verifier before the deal_leads insert", () => {
    const verifyAt = action.indexOf("verifyLeadCaptureAuthorization(");
    const insertAt = action.indexOf('from("deal_leads").insert');
    expect(verifyAt).toBeGreaterThan(-1);
    expect(insertAt).toBeGreaterThan(-1);
    expect(verifyAt).toBeLessThan(insertAt);
  });

  it("accepts the signature fields from the caller", () => {
    expect(action).toMatch(/sig:\s*z\.string\(\)/);
    expect(action).toMatch(/valuesHash:\s*z\.string\(\)/);
  });

  it("forwards the signed attribution from the share page's form", () => {
    const form = read("../../components/investcalc/lead-capture-form.tsx");
    expect(form).toMatch(/captureDealLeadAction\(\{[\s\S]*?sig[\s\S]*?\}\)/);
    // The form now renders inside the shared shell used by BOTH share routes
    // (/d legacy + /s opaque); the shell must keep forwarding the signature,
    // and /d must keep passing verified attribution into it.
    const shell = read("../../components/investcalc/shared-deal-shell.tsx");
    expect(shell).toMatch(/<LeadCaptureForm[\s\S]*?sig=\{/);
    const page = read("../../app/d/[encoded]/page.tsx");
    expect(page).toMatch(/leadCapture=\{/);
    expect(page).toContain("signLeadCaptureAuthorization");
  });

  it("freshly resolves opaque shares before any private lead write", () => {
    const resolution = action.indexOf(
      "await resolvePublicShare(opaqueShareToken)",
    );
    const insert = action.indexOf('from("deal_leads").insert');
    expect(resolution).toBeGreaterThan(-1);
    expect(resolution).toBeLessThan(insert);
    expect(action).toContain('shareSurface === "opaque_share"');
    expect(action).toContain("isWellFormedShareToken(opaqueShareToken)");

    const opaquePage = read("../../app/s/[token]/page.tsx");
    expect(opaquePage).toContain('shareSurface: "opaque_share"');
    expect(opaquePage).toContain("opaqueShareToken: token");
  });
});

describe("lead-write signatures are surface-bound", () => {
  const oldSecret = process.env.SHARE_LINK_SECRET;
  beforeAll(() => {
    process.env.SHARE_LINK_SECRET = "test-secret-for-surface-bound-lead-write";
  });
  afterAll(() => {
    if (oldSecret === undefined) delete process.env.SHARE_LINK_SECRET;
    else process.env.SHARE_LINK_SECRET = oldSecret;
  });

  it("cannot relabel an opaque authorization as a legacy share", () => {
    const input = {
      ownerId: "11111111-1111-4111-8111-111111111111",
      dealId: "33333333-3333-4333-8333-333333333333",
      valuesHash: "abc123abc123abc123abc123",
      dealAddress: "123 Main St",
    };
    const sig = signLeadCaptureAuthorization({
      ...input,
      shareSurface: "opaque_share",
    });
    expect(
      verifyLeadCaptureAuthorization({
        ...input,
        shareSurface: "opaque_share",
        sig,
      }),
    ).toBe(true);
    expect(
      verifyLeadCaptureAuthorization({
        ...input,
        shareSurface: "legacy_share",
        sig,
      }),
    ).toBe(false);
  });
});
