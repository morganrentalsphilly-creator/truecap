import "server-only";

/**
 * Opaque public shares — the server side of /s/[token].
 *
 * Replaces the legacy /d/[encoded] model where the URL itself carried the whole
 * analysis (address, rent, price, assumptions — deal data in referrer logs and
 * link previews). Here the URL carries a random 256-bit token; the snapshot
 * lives in public_shares, hashed-token at rest, owner-revocable, default
 * 180-day expiry.
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
  normalizeOfferCeilingTargetSource,
  type OfferCeilingTargetSource,
} from "@/lib/offer-ceiling-contract";
import { TRUECAP_UNDERWRITING_STANDARD_VERSION } from "@/lib/underwriting-methodology";

export type PublicShareAudience = "investment-partner" | "client" | "lender-review";
export type PublicShareAddressVisibility = "hidden" | "full";

export type PublicShareSnapshot = {
  values: InvestmentFormValues;
  /** Exact price-ceiling criteria visible when the share was minted. */
  maoTarget?: MaoTarget;
  /** Frozen provenance for those criteria. */
  maoTargetSource?: OfferCeilingTargetSource;
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
  ownerId?: string | null;
  dealId?: string | null;
  maoTarget?: MaoTarget;
  maoTargetSource?: OfferCeilingTargetSource;
  audience?: PublicShareAudience;
  addressVisibility?: PublicShareAddressVisibility;
}): Promise<string | null> {
  try {
    const admin = createAdminSupabaseClient();
    const token = generateShareToken();
    const snapshot: PublicShareSnapshot = {
      values: input.values,
      ...(input.maoTarget ? { maoTarget: input.maoTarget } : {}),
      ...(input.maoTarget
        ? {
            maoTargetSource:
              input.maoTargetSource ?? "selected-targets",
          }
        : {}),
      meta: {
        ...(input.title ? { title: input.title } : {}),
        ...(input.ownerId ? { ownerId: input.ownerId } : {}),
        ...(input.dealId ? { dealId: input.dealId } : {}),
        sharedAt: new Date().toISOString(),
        methodologyVersion: TRUECAP_UNDERWRITING_STANDARD_VERSION,
        schemaVersion: INVESTCALC_SCHEMA_VERSION,
        audience: input.audience ?? "investment-partner",
        addressVisibility: input.addressVisibility ?? "hidden",
      },
    };
    const { error } = await admin.from("public_shares").insert({
      token_hash: hashShareToken(token),
      owner_id: input.ownerId ?? null,
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
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return null;

    const snapshot = row.snapshot as PublicShareSnapshot | null;
    if (!snapshot || typeof snapshot !== "object" || !snapshot.values) return null;
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
      ...(normalizedMaoTarget ? { maoTarget: normalizedMaoTarget } : {}),
      ...(normalizedMaoTarget
        ? {
            maoTargetSource:
              normalizedMaoTargetSource ?? "selected-targets",
          }
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
    };
  } catch {
    return null;
  }
}

export { isMissingTable as isMissingPublicSharesTable };
