import "server-only";

/**
 * Opaque public shares — the server side of /s/[token].
 *
 * Replaces the legacy /d/[encoded] model where the URL itself carried the whole
 * analysis (address, rent, price, assumptions — deal data in referrer logs and
 * link previews). Here the URL carries a random 256-bit token; the snapshot
 * lives in public_shares, hashed-token at rest, and has a default 180-day
 * expiry. New rows are owned and revocable because minting requires a signed-in
 * owner; historical ownerless rows remain readable until they expire.
 *
 * Resolution runs on the service-role client because the viewer is anonymous
 * and RLS is owner-only by design (there is deliberately NO public read
 * policy). Only the snapshot and its verified attribution ever leave this
 * module — never the row id, token hash, or owner row.
 *
 * Every function is tolerant of the table not existing yet (migration
 * 20260817150658 pending): minting returns null and the caller fails closed
 * rather than putting the snapshot back into a URL. Resolution returns null
 * (→ 404). Existing legacy links stay readable for compatibility.
 */

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { INVESTCALC_SCHEMA_VERSION, type InvestmentFormValues } from "@/lib/investcalc-schema";
import { generateShareToken, hashShareToken, isWellFormedShareToken } from "@/lib/share-token";
import * as Sentry from "@sentry/nextjs";
import type { MaoTarget } from "@/lib/max-allowable-offer";
import { normalizeMaoTarget } from "@/lib/mao-target-editor";
import {
  isAdoptedOfferCeilingTargetSource,
  normalizeOfferCeilingTargetSource,
  type OfferCeilingTargetSource,
} from "@/lib/offer-ceiling-contract";
import { isPublicShareExpired } from "@/lib/public-share-lifecycle";
import { calculateAnalysis } from "@/lib/calc-analysis";
import {
  buildDealScoreInputFromAnalysis,
  computeDealScore,
} from "@/lib/deal-score";
import { resolveSavedAnalysisResult } from "@/lib/saved-analysis-methodology";
import {
  resolveOfferCeilingForAccess,
} from "@/lib/offer-ceiling-server";
import { readRecordedOfferCeiling } from "@/lib/recorded-offer-ceiling";
import type { OfferCeilingExactResult } from "@/lib/offer-ceiling-access-contract";
import { isReleasedUnderwritingModel } from "@/lib/underwriting-model-release";

export type PublicShareAudience = "investment-partner" | "client" | "lender-review";
export type PublicShareAddressVisibility = "hidden" | "full";

export type PublicShareSnapshot = {
  values: InvestmentFormValues;
  /** Exact result captured when the link was minted. Older input-only shares
   * omit it and remain readable through the visibly labeled legacy path. */
  resultSnapshot?: Record<string, unknown>;
  /** Exact price-ceiling criteria visible when the share was minted. */
  maoTarget?: MaoTarget;
  /** Frozen provenance for those criteria. */
  maoTargetSource?: OfferCeilingTargetSource;
  /** Exact solved output captured with the link. Undefined means no adopted
   * target; null means the adopted target had no supported solution. */
  offerCeilingExact?: OfferCeilingExactResult | null;
  meta: {
    title?: string;
    /** Set server-side at mint from the authenticated session — the public
     *  viewer can trust it without the legacy HMAC dance. */
    ownerId?: string;
    dealId?: string;
    sharedAt: string;
    /** New shares are pinned to a real formula contract. Older rows without
     * this field are visibly labeled legacy/unpinned by the viewer. */
    methodologyVersion?: string;
    schemaVersion?: number;
    audience?: PublicShareAudience;
    addressVisibility?: PublicShareAddressVisibility;
    /** True when the shared purchase price was an automated ESTIMATE (e.g.
     *  RentCast AVM fill) the sharer never replaced — the viewer must not
     *  headline it as an asking price. */
    priceEstimated?: boolean;
  };
};

export type ResolvedPublicShare = {
  snapshot: PublicShareSnapshot;
  /** Authoritative attribution from immutable database columns. Never trust
   * snapshot JSON for access, branding, comps, or lead attribution. */
  ownerId: string | null;
  dealId: string | null;
  schemaVersion: number;
  methodologyVersion: string | null;
  legacyUnpinned: boolean;
  /** True for historical input-only rows that must be recomputed to render. */
  legacyInputOnly: boolean;
};

type ShareRow = {
  id: string;
  owner_id: string | null;
  deal_id: string | null;
  snapshot: unknown;
  calc_version: number;
  expires_at: string | null;
  revoked_at: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  return !!error && (error.code === "42P01" || /relation .* does not exist/i.test(error.message ?? ""));
}

/**
 * Mint a share. Returns the public path (`/s/<token>`) or null when the table
 * doesn't exist yet or the insert fails. Callers must fail closed.
 */
export async function mintPublicShare(input: {
  values: InvestmentFormValues;
  title?: string;
  ownerId: string;
  dealId?: string | null;
  maoTarget?: MaoTarget;
  maoTargetSource?: OfferCeilingTargetSource;
  /** Owner-scoped saved result. Omit for a new unsaved analysis; the server
   * captures the current result itself. */
  resultSnapshot?: unknown;
  methodologyVersion?: unknown;
  audience?: PublicShareAudience;
  addressVisibility?: PublicShareAddressVisibility;
  /** The shared purchase price is an automated estimate, not an asking price. */
  priceEstimated?: boolean;
}): Promise<string | null> {
  // This helper writes through the service-role client. Keep the invariant
  // local as well as at the server-action boundary so no future caller can
  // accidentally mint a new ownerless row.
  if (!input.ownerId) return null;
  if (!isReleasedUnderwritingModel(input.values)) return null;

  try {
    const admin = createAdminSupabaseClient();
    const token = generateShareToken();
    const candidateSource = input.maoTargetSource ?? "selected-targets";
    const adoptedTarget =
      input.maoTarget && isAdoptedOfferCeilingTargetSource(candidateSource)
        ? input.maoTarget
        : undefined;
    const currentResult = calculateAnalysis(input.values);
    const currentScore = computeDealScore(
      buildDealScoreInputFromAnalysis(input.values, currentResult)
    );
    const hasRecordedInput = input.resultSnapshot !== undefined;
    const capturedResolution = resolveSavedAnalysisResult({
      methodologyVersion:
        hasRecordedInput
          ? input.methodologyVersion
          : currentResult.methodologyVersion,
      resultSnapshot:
        input.resultSnapshot ?? {
          ...currentResult,
          score: currentScore.score,
          scoreMethodologyVersion: currentScore.scoreMethodologyVersion,
          recommendation: currentScore.recommendation,
          riskLevel: currentScore.riskLevel,
          breakdown: currentScore.breakdown,
          explanation: currentScore.explanation,
        },
      recomputedResult: currentResult,
      recomputedExtras: {
        score: currentScore.score,
        recommendation: currentScore.recommendation,
        riskLevel: currentScore.riskLevel,
        breakdown: currentScore.breakdown,
        explanation: currentScore.explanation,
      },
    });
    if (!capturedResolution.result) return null;
    const capturedResult = capturedResolution.result as unknown as Record<string, unknown>;
    const usesRecordedSnapshot = Boolean(
      hasRecordedInput && capturedResolution.usesRecordedSnapshot
    );
    const capturedMethodologyVersion =
      usesRecordedSnapshot
        ? capturedResolution.storedMethodologyVersion
        : currentResult.methodologyVersion;
    if (!capturedMethodologyVersion) return null;
    const recordedCeiling = usesRecordedSnapshot
      ? readRecordedOfferCeiling(capturedResult)
      : { captured: false as const };
    // For a saved result, the captured target/source are the authority for
    // the captured exact solve. Never let a future caller pair that number
    // with different criteria merely by passing mismatched arguments.
    const snapshotTarget = recordedCeiling.captured
      ? recordedCeiling.target
      : adoptedTarget;
    const snapshotTargetSource = recordedCeiling.captured
      ? recordedCeiling.source
      : candidateSource;
    const offerCeilingAccess =
      adoptedTarget && !usesRecordedSnapshot
        ? resolveOfferCeilingForAccess({
            values: input.values,
            target: adoptedTarget,
            source: candidateSource,
            paidAccess: true,
          })
        : null;
    const shouldCaptureOfferCeiling = Boolean(
      snapshotTarget &&
        (recordedCeiling.captured || offerCeilingAccess?.access === "exact")
    );
    const offerCeilingExact = recordedCeiling.captured
      ? recordedCeiling.exact
      : offerCeilingAccess?.access === "exact"
        ? offerCeilingAccess.exact
        : undefined;
    const snapshot: PublicShareSnapshot = {
      values: input.values,
      resultSnapshot: capturedResult,
      ...(snapshotTarget ? { maoTarget: snapshotTarget } : {}),
      ...(snapshotTarget
        ? {
            maoTargetSource: snapshotTargetSource,
          }
        : {}),
      ...(shouldCaptureOfferCeiling ? { offerCeilingExact } : {}),
      meta: {
        ...(input.title ? { title: input.title } : {}),
        ownerId: input.ownerId,
        ...(input.dealId ? { dealId: input.dealId } : {}),
        sharedAt: new Date().toISOString(),
        methodologyVersion: capturedMethodologyVersion,
        schemaVersion: INVESTCALC_SCHEMA_VERSION,
        audience: input.audience ?? "investment-partner",
        addressVisibility: input.addressVisibility ?? "hidden",
        ...(input.priceEstimated ? { priceEstimated: true } : {}),
      },
    };
    const { error } = await admin.from("public_shares").insert({
      token_hash: hashShareToken(token),
      owner_id: input.ownerId,
      deal_id: input.dealId ?? null,
      snapshot,
      // Kept for backward-compatible storage while the real underwriting
      // version lives in snapshot.meta.methodologyVersion. Existing database
      // rows used this integer as a form-schema version, not a formula pin.
      calc_version: INVESTCALC_SCHEMA_VERSION,
    });
    if (error) {
      // A pre-migration missing table is the one expected cause and stays
      // quiet; anything else (FK failure, RLS change, column drift) is an
      // operational error. The UI fails closed and never mints a /d payload.
      if (!isMissingTable(error)) {
        Sentry.captureMessage("public_shares insert failed — share creation failed closed", {
          level: "error",
          tags: { feature: "public-share", stage: "mint-insert" },
          extra: { database_code: error.code ?? "unknown" },
        });
      }
      return null;
    }
    return `/s/${token}`;
  } catch {
    return null;
  }
}

/**
 * Resolve a token for the public viewer. Null for anything but a live,
 * unrevoked, unexpired share — one generic outcome, no oracle about WHY.
 */
export async function resolvePublicShare(token: string): Promise<ResolvedPublicShare | null> {
  if (!isWellFormedShareToken(token)) return null;
  try {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from("public_shares")
      .select("id, owner_id, deal_id, snapshot, calc_version, expires_at, revoked_at")
      .eq("token_hash", hashShareToken(token))
      .maybeSingle();
    if (error || !data) return null;
    const row = data as ShareRow;
    if (row.revoked_at) return null;
    if (isPublicShareExpired(row.expires_at)) return null;

    const snapshot = row.snapshot as PublicShareSnapshot | null;
    if (!snapshot || typeof snapshot !== "object" || !snapshot.values) return null;
    if (!isReleasedUnderwritingModel(snapshot.values)) return null;
    const normalizedMaoTarget = normalizeMaoTarget(snapshot.maoTarget);
    const normalizedMaoTargetSource = normalizeOfferCeilingTargetSource(
      snapshot.maoTargetSource
    );
    // An exact financial snapshot with a target field must never silently
    // reopen under canonical defaults when that field is corrupt or from an
    // unsupported future format.
    if (snapshot.maoTarget !== undefined && !normalizedMaoTarget) return null;
    if (
      snapshot.maoTargetSource !== undefined &&
      !normalizedMaoTargetSource
    ) {
      return null;
    }
    const safeSnapshot: PublicShareSnapshot = {
      values: snapshot.values,
      ...(asRecord(snapshot.resultSnapshot)
        ? { resultSnapshot: asRecord(snapshot.resultSnapshot)! }
        : {}),
      ...(normalizedMaoTarget ? { maoTarget: normalizedMaoTarget } : {}),
      ...(normalizedMaoTarget
        ? {
            maoTargetSource:
              normalizedMaoTargetSource ?? "selected-targets",
          }
        : {}),
      ...(snapshot.offerCeilingExact !== undefined
        ? { offerCeilingExact: snapshot.offerCeilingExact }
        : {}),
      meta: snapshot.meta,
    };

    // Best-effort view bookkeeping; never blocks or fails the render.
    void admin
      .from("public_shares")
      .update({ last_viewed_at: new Date().toISOString() })
      .eq("id", row.id)
      .then(() => undefined, () => undefined);

    const methodologyVersion =
      typeof snapshot.meta?.methodologyVersion === "string"
        ? snapshot.meta.methodologyVersion
        : null;
    const legacyInputOnly = !asRecord(snapshot.resultSnapshot);
    return {
      snapshot: safeSnapshot,
      ownerId: row.owner_id,
      dealId: row.deal_id,
      schemaVersion:
        typeof snapshot.meta?.schemaVersion === "number"
          ? snapshot.meta.schemaVersion
          : row.calc_version,
      methodologyVersion,
      legacyUnpinned: methodologyVersion == null,
      legacyInputOnly,
    };
  } catch {
    return null;
  }
}

export { isMissingTable as isMissingPublicSharesTable };
