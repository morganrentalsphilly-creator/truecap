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
import {
  INVESTCALC_SCHEMA_VERSION,
  type InvestmentFormValues,
} from "@/lib/investcalc-schema";
import {
  generateShareToken,
  hashShareToken,
  isWellFormedShareToken,
} from "@/lib/share-token";
import * as Sentry from "@sentry/nextjs";
import type { MaoTarget } from "@/lib/max-allowable-offer";
import { normalizeMaoTarget } from "@/lib/mao-target-editor";
import {
  isAdoptedOfferCeilingTargetSource,
  type OfferCeilingTargetSource,
} from "@/lib/offer-ceiling-contract";
import { normalizeExternalOfferCeilingTargetSource } from "@/lib/external-offer-ceiling-provenance";
import { isPublicShareExpired } from "@/lib/public-share-lifecycle";
import { calculateAnalysis } from "@/lib/calc-analysis";
import {
  buildDealScoreInputFromAnalysis,
  computeDealScore,
} from "@/lib/deal-score";
import { resolveOfferCeilingForAccess } from "@/lib/offer-ceiling-server";
import type { OfferCeilingExactResult } from "@/lib/offer-ceiling-access-contract";
import { isReleasedUnderwritingModel } from "@/lib/underwriting-model-release";
import {
  resolveCompatibleAnalyzerStrategyKey,
  type AnalyzerStrategyKey,
} from "@/lib/analyzer-strategy-persistence";
import {
  buildSpecialistAnalysisSnapshot,
  SPECIALIST_ANALYSIS_SNAPSHOT_FIELD,
  type SpecialistAnalysisSnapshot,
} from "@/lib/specialist-analysis-snapshot";
import { isSpecialistStrategyEnabled } from "@/lib/feature-flags";
import {
  captureSelectedTargetsDecisionBasis,
  normalizeOfferCeilingDecisionBasis,
  OFFER_CEILING_DECISION_BASIS_FIELD,
  type OfferCeilingDecisionBasis,
} from "@/lib/offer-ceiling-decision-basis";

export type PublicShareAudience =
  | "investment-partner"
  | "client"
  | "lender-review";
export type PublicShareAddressVisibility = "hidden" | "full";

export type PublicShareSnapshot = {
  values: InvestmentFormValues;
  /** Exact calculator lens captured with the share. */
  analyzerStrategyKey?: AnalyzerStrategyKey;
  /** Strict, versioned specialist result frozen when the share was minted.
   * New rows duplicate the same validated object inside resultSnapshot so
   * strategy identity and historical report exports stay self-contained. */
  specialistAnalysis?: SpecialistAnalysisSnapshot;
  /** Exact result captured when the link was minted. Older input-only shares
   * omit it and remain readable through the visibly labeled legacy path. */
  resultSnapshot?: Record<string, unknown>;
  /** Exact price-ceiling criteria visible when the share was minted. */
  maoTarget?: MaoTarget;
  /** Frozen provenance for those criteria. */
  maoTargetSource?: OfferCeilingTargetSource;
  /** Immutable criteria identity paired with maoTarget. */
  offerCeilingDecisionBasis?: OfferCeilingDecisionBasis;
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

function isMissingTable(
  error: { code?: string; message?: string } | null,
): boolean {
  return (
    !!error &&
    (error.code === "42P01" ||
      /relation .* does not exist/i.test(error.message ?? ""))
  );
}

/**
 * Mint a share. Returns the public path plus the owner-visible row identity so
 * the creating UI can always offer exact revocation, including for an
 * unattached/unsaved analysis. Returns null when storage is unavailable.
 */
export type MintedPublicShare = {
  path: string;
  id: string;
  dealId: string | null;
};

export async function mintPublicShare(input: {
  values: InvestmentFormValues;
  title?: string;
  ownerId: string;
  dealId?: string | null;
  maoTarget?: MaoTarget;
  maoTargetSource?: OfferCeilingTargetSource;
  audience?: PublicShareAudience;
  addressVisibility?: PublicShareAddressVisibility;
  /** The shared purchase price is an automated estimate, not an asking price. */
  priceEstimated?: boolean;
  analyzerStrategyKey?: AnalyzerStrategyKey;
  offerCeilingDecisionBasis?: unknown;
}): Promise<MintedPublicShare | null> {
  // This helper writes through the service-role client. Keep the invariant
  // local as well as at the server-action boundary so no future caller can
  // accidentally mint a new ownerless row.
  if (!input.ownerId) return null;
  if (!isReleasedUnderwritingModel(input.values)) return null;

  try {
    const admin = createAdminSupabaseClient();
    const token = generateShareToken();
    let candidateSource = input.maoTargetSource ?? "selected-targets";
    const adoptedTarget =
      input.maoTarget && isAdoptedOfferCeilingTargetSource(candidateSource)
        ? input.maoTarget
        : undefined;
    const currentResult = calculateAnalysis(input.values);
    const analyzerStrategyKey = resolveCompatibleAnalyzerStrategyKey(
      input.analyzerStrategyKey,
      input.values,
    );
    let offerCeilingDecisionBasis = adoptedTarget
      ? normalizeOfferCeilingDecisionBasis(
          input.offerCeilingDecisionBasis,
          {
            target: adoptedTarget,
            source: candidateSource,
            strategyKey: analyzerStrategyKey,
          },
        )
      : null;
    if (
      adoptedTarget &&
      candidateSource === "buy-box" &&
      !offerCeilingDecisionBasis
    ) {
      candidateSource = "selected-targets";
    }
    if (adoptedTarget && !offerCeilingDecisionBasis) {
      offerCeilingDecisionBasis = captureSelectedTargetsDecisionBasis({
        target: adoptedTarget,
        strategyKey: analyzerStrategyKey,
      });
    }
    const currentScore = computeDealScore(
      buildDealScoreInputFromAnalysis(input.values, currentResult),
    );
    const capturedResult: Record<string, unknown> = {
      ...currentResult,
      score: currentScore.score,
      scoreMethodologyVersion: currentScore.scoreMethodologyVersion,
      recommendation: currentScore.recommendation,
      riskLevel: currentScore.riskLevel,
      breakdown: currentScore.breakdown,
      explanation: currentScore.explanation,
    };
    const capturedMethodologyVersion = currentResult.methodologyVersion;
    if (!capturedMethodologyVersion) return null;
    // public_shares is the immutable publication boundary. Never copy a
    // result_snapshot from saved_analyses: owners can legitimately edit that
    // workspace row through the data API. Rebuild and freeze every TrueCap
    // output here, immediately before the service-role insert.
    const specialistAnalysis = isSpecialistStrategyEnabled(analyzerStrategyKey)
      ? buildSpecialistAnalysisSnapshot(
          input.values,
          currentResult,
          analyzerStrategyKey,
        )
      : null;
    capturedResult.analyzerStrategyKey = analyzerStrategyKey;
    if (offerCeilingDecisionBasis) {
      capturedResult[OFFER_CEILING_DECISION_BASIS_FIELD] =
        offerCeilingDecisionBasis;
    }
    delete capturedResult[SPECIALIST_ANALYSIS_SNAPSHOT_FIELD];
    if (specialistAnalysis) {
      capturedResult[SPECIALIST_ANALYSIS_SNAPSHOT_FIELD] = specialistAnalysis;
    }
    const snapshotTarget = adoptedTarget;
    const snapshotTargetSource = candidateSource;
    const offerCeilingAccess = adoptedTarget
      ? resolveOfferCeilingForAccess({
          values: input.values,
          target: adoptedTarget,
          source: candidateSource,
          paidAccess: true,
        })
      : null;
    const shouldCaptureOfferCeiling = Boolean(
      snapshotTarget && offerCeilingAccess?.access === "exact",
    );
    const offerCeilingExact =
      offerCeilingAccess?.access === "exact"
        ? offerCeilingAccess.exact
        : undefined;
    const snapshot: PublicShareSnapshot = {
      values: input.values,
      analyzerStrategyKey,
      ...(specialistAnalysis ? { specialistAnalysis } : {}),
      resultSnapshot: capturedResult,
      ...(snapshotTarget ? { maoTarget: snapshotTarget } : {}),
      ...(snapshotTarget
        ? {
            maoTargetSource: snapshotTargetSource,
          }
        : {}),
      ...(offerCeilingDecisionBasis
        ? { offerCeilingDecisionBasis }
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
    const { data: inserted, error } = await admin
      .from("public_shares")
      .insert({
        token_hash: hashShareToken(token),
        owner_id: input.ownerId,
        deal_id: input.dealId ?? null,
        snapshot,
        // Kept for backward-compatible storage while the real underwriting
        // version lives in snapshot.meta.methodologyVersion. Existing database
        // rows used this integer as a form-schema version, not a formula pin.
        calc_version: INVESTCALC_SCHEMA_VERSION,
      })
      .select("id")
      .single();
    if (error) {
      // A pre-migration missing table is the one expected cause and stays
      // quiet; anything else (FK failure, RLS change, column drift) is an
      // operational error. The UI fails closed and never mints a /d payload.
      if (!isMissingTable(error)) {
        Sentry.captureMessage(
          "public_shares insert failed — share creation failed closed",
          {
            level: "error",
            tags: { feature: "public-share", stage: "mint-insert" },
            extra: { database_code: error.code ?? "unknown" },
          },
        );
      }
      return null;
    }
    if (!inserted?.id) return null;
    return {
      path: `/s/${token}`,
      id: String(inserted.id),
      dealId: input.dealId ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Resolve a token for the public viewer. Null for anything but a live,
 * unrevoked, unexpired share recorded under the current public underwriting
 * standard — one generic outcome, no oracle about WHY.
 */
export async function resolvePublicShare(
  token: string,
): Promise<ResolvedPublicShare | null> {
  if (!isWellFormedShareToken(token)) return null;
  try {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from("public_shares")
      .select(
        "id, owner_id, deal_id, snapshot, calc_version, expires_at, revoked_at",
      )
      .eq("token_hash", hashShareToken(token))
      .maybeSingle();
    if (error || !data) return null;
    const row = data as ShareRow;
    if (row.revoked_at) return null;
    if (isPublicShareExpired(row.expires_at)) return null;

    const snapshot = row.snapshot as PublicShareSnapshot | null;
    if (!snapshot || typeof snapshot !== "object" || !snapshot.values)
      return null;
    if (!snapshot.meta || typeof snapshot.meta !== "object") return null;
    if (!isReleasedUnderwritingModel(snapshot.values)) return null;
    const rawResultSnapshot = asRecord(snapshot.resultSnapshot);
    const currentResult = calculateAnalysis(snapshot.values);
    const storedMethodologyVersion =
      typeof snapshot.meta.methodologyVersion === "string"
        ? snapshot.meta.methodologyVersion
        : null;
    // A public link must never show current arithmetic under an older label or
    // disagree with the recorded saved result that produced it. The immutable
    // historical JSON is not trusted as calculation authority (some rows
    // predate the service-role-only publication boundary), so the safe
    // compatibility policy is to fail closed for every missing, superseded, or
    // future contract. The owner replacement path is explicit: reopen the deal,
    // review/re-underwrite it under the current standard, and mint a new link.
    // The action and PDF export enforce the same boundary for saved analyses.
    if (storedMethodologyVersion !== currentResult.methodologyVersion) {
      return null;
    }
    const currentScore = computeDealScore(
      buildDealScoreInputFromAnalysis(snapshot.values, currentResult),
    );
    const analyzerStrategyKey = resolveCompatibleAnalyzerStrategyKey(
      snapshot.analyzerStrategyKey ?? rawResultSnapshot?.analyzerStrategyKey,
      snapshot.values,
    );
    const normalizedMaoTarget = normalizeMaoTarget(snapshot.maoTarget);
    let normalizedMaoTargetSource = normalizeExternalOfferCeilingTargetSource(
      snapshot.maoTargetSource,
      { target: normalizedMaoTarget, values: snapshot.values },
    );
    // An exact financial snapshot with a target field must never silently
    // reopen under canonical defaults when that field is corrupt or from an
    // unsupported future format.
    if (snapshot.maoTarget !== undefined && !normalizedMaoTarget) return null;
    if (snapshot.maoTargetSource !== undefined && !normalizedMaoTargetSource) {
      return null;
    }
    let offerCeilingDecisionBasis = normalizedMaoTarget
      ? normalizeOfferCeilingDecisionBasis(
          snapshot.offerCeilingDecisionBasis ??
            rawResultSnapshot?.[OFFER_CEILING_DECISION_BASIS_FIELD],
          {
            target: normalizedMaoTarget,
            ...(normalizedMaoTargetSource
              ? { source: normalizedMaoTargetSource }
              : {}),
            strategyKey: analyzerStrategyKey,
          },
        )
      : null;
    if (
      normalizedMaoTarget &&
      normalizedMaoTargetSource === "buy-box" &&
      !offerCeilingDecisionBasis
    ) {
      normalizedMaoTargetSource = "selected-targets";
    }
    if (normalizedMaoTarget && !offerCeilingDecisionBasis) {
      offerCeilingDecisionBasis = captureSelectedTargetsDecisionBasis({
        target: normalizedMaoTarget,
        strategyKey: analyzerStrategyKey,
        capturedAt: snapshot.meta.sharedAt,
      });
    }
    // Recompute at the read boundary too. Historical rows may predate the
    // service-role-only insert policy, so even a structurally valid stored
    // result cannot authenticate a TrueCap-branded public number.
    const specialistAnalysis = isSpecialistStrategyEnabled(analyzerStrategyKey)
      ? buildSpecialistAnalysisSnapshot(
          snapshot.values,
          currentResult,
          analyzerStrategyKey,
        )
      : null;
    const safeResultSnapshot: Record<string, unknown> = {
      ...currentResult,
      score: currentScore.score,
      scoreMethodologyVersion: currentScore.scoreMethodologyVersion,
      recommendation: currentScore.recommendation,
      riskLevel: currentScore.riskLevel,
      breakdown: currentScore.breakdown,
      explanation: currentScore.explanation,
      analyzerStrategyKey,
    };
    if (specialistAnalysis) {
      safeResultSnapshot[SPECIALIST_ANALYSIS_SNAPSHOT_FIELD] =
        specialistAnalysis;
    }
    if (offerCeilingDecisionBasis) {
      safeResultSnapshot[OFFER_CEILING_DECISION_BASIS_FIELD] =
        offerCeilingDecisionBasis;
    }
    const adoptedTarget =
      normalizedMaoTarget &&
      isAdoptedOfferCeilingTargetSource(
        normalizedMaoTargetSource ?? "selected-targets",
      )
        ? normalizedMaoTarget
        : undefined;
    const offerCeilingAccess = adoptedTarget
      ? resolveOfferCeilingForAccess({
          values: snapshot.values,
          target: adoptedTarget,
          source: normalizedMaoTargetSource ?? "selected-targets",
          paidAccess: true,
        })
      : null;
    const safeSnapshot: PublicShareSnapshot = {
      values: snapshot.values,
      analyzerStrategyKey,
      ...(specialistAnalysis ? { specialistAnalysis } : {}),
      resultSnapshot: safeResultSnapshot,
      ...(normalizedMaoTarget ? { maoTarget: normalizedMaoTarget } : {}),
      ...(normalizedMaoTarget
        ? {
            maoTargetSource: normalizedMaoTargetSource ?? "selected-targets",
          }
        : {}),
      ...(offerCeilingDecisionBasis
        ? { offerCeilingDecisionBasis }
        : {}),
      ...(offerCeilingAccess?.access === "exact"
        ? { offerCeilingExact: offerCeilingAccess.exact }
        : {}),
      meta: {
        ...snapshot.meta,
        methodologyVersion: currentResult.methodologyVersion,
      },
    };

    // Best-effort view bookkeeping; never blocks or fails the render.
    void admin
      .from("public_shares")
      .update({ last_viewed_at: new Date().toISOString() })
      .eq("id", row.id)
      .then(
        () => undefined,
        () => undefined,
      );

    const legacyInputOnly = !rawResultSnapshot;
    return {
      snapshot: safeSnapshot,
      ownerId: row.owner_id,
      dealId: row.deal_id,
      schemaVersion:
        typeof snapshot.meta?.schemaVersion === "number"
          ? snapshot.meta.schemaVersion
          : row.calc_version,
      methodologyVersion: currentResult.methodologyVersion,
      legacyUnpinned: false,
      legacyInputOnly,
    };
  } catch {
    return null;
  }
}

export { isMissingTable as isMissingPublicSharesTable };
