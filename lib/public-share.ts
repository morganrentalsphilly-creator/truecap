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

export type PublicShareSnapshot = {
  values: InvestmentFormValues;
  meta: {
    title?: string;
    /** Set server-side at mint from the authenticated session — the public
     *  viewer can trust it without the legacy HMAC dance. */
    ownerId?: string;
    dealId?: string;
    sharedAt: string;
  };
};

export type ResolvedPublicShare = {
  snapshot: PublicShareSnapshot;
  calcVersion: number;
};

type ShareRow = {
  id: string;
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
}): Promise<string | null> {
  try {
    const admin = createAdminSupabaseClient();
    const token = generateShareToken();
    const snapshot: PublicShareSnapshot = {
      values: input.values,
      meta: {
        ...(input.title ? { title: input.title } : {}),
        ...(input.ownerId ? { ownerId: input.ownerId } : {}),
        ...(input.dealId ? { dealId: input.dealId } : {}),
        sharedAt: new Date().toISOString(),
      },
    };
    const { error } = await admin.from("public_shares").insert({
      token_hash: hashShareToken(token),
      owner_id: input.ownerId ?? null,
      deal_id: input.dealId ?? null,
      snapshot,
      calc_version: INVESTCALC_SCHEMA_VERSION,
    });
    if (error) {
      // A pre-migration missing table is the one expected cause and stays
      // quiet; anything else (FK failure, RLS change, column drift) is an
      // operational error. The UI fails closed and never mints a /d payload.
      if (!isMissingTable(error)) {
        Sentry.captureMessage("public_shares insert failed — falling back to legacy /d link", {
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
      .select("id, snapshot, calc_version, expires_at, revoked_at")
      .eq("token_hash", hashShareToken(token))
      .maybeSingle();
    if (error || !data) return null;
    const row = data as ShareRow;
    if (row.revoked_at) return null;
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return null;

    const snapshot = row.snapshot as PublicShareSnapshot | null;
    if (!snapshot || typeof snapshot !== "object" || !snapshot.values) return null;

    // Best-effort view bookkeeping; never blocks or fails the render.
    void admin
      .from("public_shares")
      .update({ last_viewed_at: new Date().toISOString() })
      .eq("id", row.id)
      .then(() => undefined, () => undefined);

    return { snapshot, calcVersion: row.calc_version };
  } catch {
    return null;
  }
}

export { isMissingTable as isMissingPublicSharesTable };
