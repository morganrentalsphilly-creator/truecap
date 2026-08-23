import { describe, expect, it } from "vitest";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import {
  ONE_TIME_PDF_RECOVERY_WINDOW_MS,
  claimSecretMatches,
  decideOneTimePdfClaimBinding,
  fingerprintOneTimePdfDeal,
  fingerprintOneTimePdfReportBinding,
  hashOneTimePdfClaimSecret,
  isOneTimePdfRecoveryAllowed,
} from "@/lib/one-time-pdf-claims";

const SECRET = "a".repeat(43);
const FINGERPRINT = "b".repeat(64);
const NOW = new Date("2026-08-15T12:00:00.000Z");

function record(
  overrides: Partial<Parameters<typeof decideOneTimePdfClaimBinding>[0]["record"]> = {}
) {
  return {
    claimSecretHash: hashOneTimePdfClaimSecret(SECRET),
    dealFingerprint: FINGERPRINT,
    userId: null,
    expiresAt: "2026-09-15T12:00:00.000Z",
    consumedAt: null,
    ...overrides,
  };
}

describe("one-time PDF claim binding", () => {
  it("uses stable cryptographic deal fingerprints", () => {
    const a = { address: "123 Main", purchasePrice: 100_000 } as InvestmentFormValues;
    const b = { purchasePrice: 100_000, address: "123 Main" } as InvestmentFormValues;
    expect(fingerprintOneTimePdfDeal(a, SECRET)).toMatch(/^[0-9a-f]{64}$/);
    expect(fingerprintOneTimePdfDeal(a, SECRET)).toBe(
      fingerprintOneTimePdfDeal(b, SECRET)
    );
    expect(fingerprintOneTimePdfDeal(a, SECRET)).not.toBe(
      fingerprintOneTimePdfDeal(a, "z".repeat(43))
    );
  });

  it("immutably distinguishes report target criteria and provenance", () => {
    const values = {
      address: "123 Main",
      purchasePrice: 100_000,
    } as InvestmentFormValues;
    const target = { monthlyCashFlow: 200, dscr: 1.25 };
    const selected = fingerprintOneTimePdfReportBinding(
      values,
      target,
      "selected-targets",
      SECRET
    );
    expect(selected).toMatch(/^[0-9a-f]{64}$/);
    expect(
      fingerprintOneTimePdfReportBinding(
        { purchasePrice: 100_000, address: "123 Main" } as InvestmentFormValues,
        { dscr: 1.25, monthlyCashFlow: 200 },
        "selected-targets",
        SECRET
      )
    ).toBe(selected);
    expect(
      fingerprintOneTimePdfReportBinding(
        values,
        { monthlyCashFlow: 250, dscr: 1.25 },
        "selected-targets",
        SECRET
      )
    ).not.toBe(selected);
    expect(
      fingerprintOneTimePdfReportBinding(
        values,
        target,
        "buy-box",
        SECRET
      )
    ).not.toBe(selected);
  });

  it("stores a one-way secret hash and compares it safely", () => {
    const hash = hashOneTimePdfClaimSecret(SECRET);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(SECRET);
    expect(claimSecretMatches(SECRET, hash)).toBe(true);
    expect(claimSecretMatches("z".repeat(43), hash)).toBe(false);
    expect(claimSecretMatches(SECRET, "not-a-hash")).toBe(false);
  });

  it("allows the exact anonymous browser/deal to consume once", () => {
    expect(
      decideOneTimePdfClaimBinding({
        record: record(),
        providedSecret: SECRET,
        dealFingerprint: FINGERPRINT,
        currentUserId: null,
        now: NOW,
      })
    ).toEqual({ ok: true, mode: "consume" });
  });

  it("rejects a copied URL without its separate browser secret or exact deal", () => {
    for (const attempt of [
      { providedSecret: "z".repeat(43), dealFingerprint: FINGERPRINT },
      { providedSecret: SECRET, dealFingerprint: "c".repeat(64) },
    ]) {
      expect(
        decideOneTimePdfClaimBinding({
          record: record(),
          ...attempt,
          currentUserId: null,
          now: NOW,
        })
      ).toEqual({ ok: false, code: "BINDING_MISMATCH" });
    }
  });

  it("requires the initiating account when checkout was authenticated", () => {
    expect(
      decideOneTimePdfClaimBinding({
        record: record({ userId: "user-a" }),
        providedSecret: SECRET,
        dealFingerprint: FINGERPRINT,
        currentUserId: "user-b",
        now: NOW,
      })
    ).toEqual({ ok: false, code: "IDENTITY_MISMATCH" });
  });

  it("fails expired unconsumed claims closed", () => {
    expect(
      decideOneTimePdfClaimBinding({
        record: record({ expiresAt: "2026-08-14T12:00:00.000Z" }),
        providedSecret: SECRET,
        dealFingerprint: FINGERPRINT,
        currentUserId: null,
        now: NOW,
      })
    ).toEqual({ ok: false, code: "EXPIRED" });
  });

  it("allows only a bounded same-binding recovery after atomic consumption", () => {
    const consumedAt = new Date(NOW.getTime() - ONE_TIME_PDF_RECOVERY_WINDOW_MS + 1).toISOString();
    expect(
      decideOneTimePdfClaimBinding({
        record: record({ consumedAt }),
        providedSecret: SECRET,
        dealFingerprint: FINGERPRINT,
        currentUserId: null,
        now: NOW,
      })
    ).toEqual({ ok: true, mode: "bound-recovery" });

    expect(
      decideOneTimePdfClaimBinding({
        record: record({
          consumedAt: new Date(
            NOW.getTime() - ONE_TIME_PDF_RECOVERY_WINDOW_MS - 1
          ).toISOString(),
        }),
        providedSecret: SECRET,
        dealFingerprint: FINGERPRINT,
        currentUserId: null,
        now: NOW,
      })
    ).toEqual({ ok: false, code: "ALREADY_REDEEMED" });
  });

  it("ends recovery at the earlier of claim expiry and consumed + 24 hours", () => {
    const consumedAt = "2026-08-15T12:00:00.000Z";
    const expiresAt = "2026-08-15T13:00:00.000Z";
    expect(
      isOneTimePdfRecoveryAllowed({
        consumedAt,
        expiresAt,
        nowMs: Date.parse("2026-08-15T12:59:59.999Z"),
      })
    ).toBe(true);
    expect(
      isOneTimePdfRecoveryAllowed({
        consumedAt,
        expiresAt,
        nowMs: Date.parse("2026-08-15T13:00:00.001Z"),
      })
    ).toBe(false);
    expect(
      isOneTimePdfRecoveryAllowed({
        consumedAt,
        expiresAt: "2026-09-15T12:00:00.000Z",
        nowMs:
          Date.parse(consumedAt) + ONE_TIME_PDF_RECOVERY_WINDOW_MS + 1,
      })
    ).toBe(false);
  });
});
