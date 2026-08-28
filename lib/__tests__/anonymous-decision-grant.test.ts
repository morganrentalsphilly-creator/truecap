import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  ANONYMOUS_DECISION_GRANT_DAYS,
  anonymousDecisionGrantMatches,
  mintAnonymousDecisionGrant,
  readAnonymousDecisionGrant,
} from "@/lib/anonymous-decision-grant";
import { SAMPLE_DEAL_FIXTURE } from "@/lib/sample-deal";

const NOW = Date.parse("2026-08-27T12:00:00.000Z");
const values = { ...SAMPLE_DEAL_FIXTURE.values };

describe("anonymous decision grant", () => {
  const originalSecret = process.env.SHARE_LINK_SECRET;

  beforeEach(() => {
    process.env.SHARE_LINK_SECRET = "test-only-secret-at-least-32-characters";
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.SHARE_LINK_SECRET;
    else process.env.SHARE_LINK_SECRET = originalSecret;
  });

  it("binds one signed grant to the exact released deal", () => {
    const grant = mintAnonymousDecisionGrant(values, NOW);
    expect(grant).not.toBeNull();
    expect(anonymousDecisionGrantMatches(grant!.token, values, NOW)).toBe(true);
    expect(
      anonymousDecisionGrantMatches(
        grant!.token,
        { ...values, purchasePrice: 251_000 },
        NOW,
      ),
    ).toBe(false);
  });

  it("rejects tampering, expiry, and missing signing configuration", () => {
    const grant = mintAnonymousDecisionGrant(values, NOW)!;
    expect(readAnonymousDecisionGrant(`${grant.token}x`, NOW)).toBeNull();
    expect(
      readAnonymousDecisionGrant(
        grant.token,
        NOW + ANONYMOUS_DECISION_GRANT_DAYS * 24 * 60 * 60 * 1000,
      ),
    ).toBeNull();
    delete process.env.SHARE_LINK_SECRET;
    expect(mintAnonymousDecisionGrant(values, NOW)).toBeNull();
    expect(readAnonymousDecisionGrant(grant.token, NOW)).toBeNull();
    process.env.SHARE_LINK_SECRET = "too-short";
    expect(mintAnonymousDecisionGrant(values, NOW)).toBeNull();
  });
});
