"use server";

import { cookies } from "next/headers";
import {
  recomputeSavedDealVerdict,
  toRecomputedSavedAnalysisSnapshot,
} from "@/lib/recompute-saved-deal-verdict";
import {
  isLegacySavedMethodologyVersion,
  resolveSavedAnalysisSnapshot,
} from "@/lib/saved-analysis-methodology";
import { areMethodologyCohortsComparable } from "@/lib/compare-metrics";
import { getEntitlementsForUser, hasPlanFeature } from "@/lib/entitlements";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const COMPARE_COOKIE = "truecap_compare_ids";
const MAX_COMPARE_ITEMS = 4;

type CompareActionResult =
  | { ok: true; remainingIds?: string[] }
  | { ok: false; code: "SIGN_IN_REQUIRED" | "ENTITLEMENT_REQUIRED" | "LIMIT_EXCEEDED" | "INVALID_SELECTION" | "SERVER_ERROR"; message: string };

type CompareMethodologyRow = {
  id: string;
  methodology_version: string | null;
  result_snapshot: unknown;
  form_snapshot: unknown;
};

function compareMethodologyCohort(row: CompareMethodologyRow): string | null {
  const recomputed = recomputeSavedDealVerdict(row.form_snapshot);
  const resolution = resolveSavedAnalysisSnapshot({
    methodologyVersion: row.methodology_version,
    resultSnapshot: row.result_snapshot,
    recomputedSnapshot: recomputed
      ? toRecomputedSavedAnalysisSnapshot(recomputed)
      : undefined,
  });

  if (resolution.usesRecordedSnapshot) {
    if (isLegacySavedMethodologyVersion(resolution.storedMethodologyVersion)) {
      // Unknown unversioned snapshots cannot establish that they were produced
      // by the same formulas. Make each one explicitly unsafe until it is
      // re-underwritten instead of treating "legacy" as a shared cohort.
      return `unavailable:legacy-unversioned:${row.id}`;
    }
    return `recorded:${resolution.storedMethodologyVersion ?? "legacy-unversioned"}`;
  }
  if (resolution.didRecompute || resolution.mode === "current-computation") {
    return `computed:${resolution.currentMethodologyVersion}`;
  }
  return null;
}

async function getCompareSelectionError(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  selectedIds: string[]
): Promise<Extract<CompareActionResult, { ok: false }> | null> {
  const { data, error } = await supabase
    .from("saved_analyses")
    .select("id, methodology_version, result_snapshot, form_snapshot")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .eq("is_completed", false)
    .eq("is_archived", false)
    .in("id", selectedIds);

  if (error) {
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "Could not prepare comparison.",
    };
  }

  const rows = (data ?? []) as unknown as CompareMethodologyRow[];
  if (rows.length !== selectedIds.length) {
    return {
      ok: false,
      code: "INVALID_SELECTION",
      message: "Some selected deals are no longer available.",
    };
  }

  const cohorts = rows.map(compareMethodologyCohort);
  if (!areMethodologyCohortsComparable(cohorts)) {
    const hasUnavailableMethodology = cohorts.some(
      (cohort) => !cohort || cohort.startsWith("unavailable:")
    );
    return {
      ok: false,
      code: "INVALID_SELECTION",
      message: hasUnavailableMethodology
        ? "At least one selected deal does not have a complete comparable calculation record. Re-underwrite it first."
        : "Selected deals use different calculation methods. Re-underwrite them under one method before comparing.",
    };
  }

  return null;
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

async function setCompareCookie(ids: string[]) {
  const cookieStore = await cookies();
  cookieStore.set(COMPARE_COOKIE, JSON.stringify(ids), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });
}

export async function getCompareIdsFromCookie(): Promise<string[]> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COMPARE_COOKIE)?.value;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? uniqueIds(parsed).slice(0, MAX_COMPARE_ITEMS) : [];
  } catch {
    return [];
  }
}

export async function startCompareAction(ids: string[]): Promise<CompareActionResult> {
  const selectedIds = uniqueIds(ids);

  // One ID is a valid seed from "Compare with another deal". The compare
  // route treats it as a preselected picker state and never renders a
  // one-column comparison; the inline picker itself requires 2 before submit.
  if (selectedIds.length < 1) {
    return {
      ok: false,
      code: "INVALID_SELECTION",
      message: "Select at least 1 deal to start a comparison.",
    };
  }

  if (selectedIds.length > MAX_COMPARE_ITEMS) {
    return {
      ok: false,
      code: "LIMIT_EXCEEDED",
      message: "You can compare up to 4 deals at a time.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in to compare deals." };
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!hasPlanFeature(entitlements, "compare_deals")) {
    return { ok: false, code: "ENTITLEMENT_REQUIRED", message: "Compare is not available for your current plan." };
  }

  const selectionError = await getCompareSelectionError(
    supabase,
    user.id,
    selectedIds
  );
  if (selectionError) return selectionError;

  await setCompareCookie(selectedIds);
  return { ok: true };
}

export async function addDealToCompareAction(id: string): Promise<CompareActionResult> {
  const selectedId = id.trim();
  if (!selectedId) {
    return { ok: false, code: "INVALID_SELECTION", message: "Save this deal before adding it to compare." };
  }

  const existingIds = await getCompareIdsFromCookie();
  const selectedIds = uniqueIds([...existingIds, selectedId]);

  if (selectedIds.length > MAX_COMPARE_ITEMS) {
    return {
      ok: false,
      code: "LIMIT_EXCEEDED",
      message: "You can compare up to 4 deals at a time.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in to compare deals." };
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!hasPlanFeature(entitlements, "compare_deals")) {
    return { ok: false, code: "ENTITLEMENT_REQUIRED", message: "Compare is not available for your current plan." };
  }

  const selectionError = await getCompareSelectionError(
    supabase,
    user.id,
    selectedIds
  );
  if (selectionError) return selectionError;

  await setCompareCookie(selectedIds);
  return { ok: true };
}

/**
 * Compare-scenarios shortcut (DM-1 / CMP-1): given any saved deal, pre-select
 * its property's scenarios for the compare flow. The client navigates only
 * after this action settles, matching the manual compare path and ensuring the
 * HttpOnly selection cookie is available to /dashboard/compare.
 */
export async function compareScenariosAction(dealId: string): Promise<CompareActionResult> {
  const id = dealId.trim();
  if (!id) {
    return { ok: false, code: "INVALID_SELECTION", message: "Open a saved deal to compare its scenarios." };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in to compare deals." };
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!hasPlanFeature(entitlements, "compare_deals")) {
    return { ok: false, code: "ENTITLEMENT_REQUIRED", message: "Compare is not available for your current plan." };
  }

  const { data: deal, error: dealError } = await supabase
    .from("saved_analyses")
    .select("property_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (dealError) {
    return { ok: false, code: "SERVER_ERROR", message: "Could not load the deal." };
  }
  const propertyId = (deal as { property_id: string | null } | null)?.property_id ?? null;
  if (!propertyId) {
    return { ok: false, code: "INVALID_SELECTION", message: "This deal has no other scenarios to compare yet." };
  }

  const { data: rows, error: listError } = await supabase
    .from("saved_analyses")
    .select("id")
    .eq("user_id", user.id)
    .eq("property_id", propertyId)
    .is("deleted_at", null)
    .eq("is_completed", false)
    .eq("is_archived", false)
    .order("created_at", { ascending: true })
    .limit(MAX_COMPARE_ITEMS);
  if (listError) {
    return { ok: false, code: "SERVER_ERROR", message: "Could not load scenarios." };
  }

  const ids = uniqueIds((rows ?? []).map((r) => (r as { id: string }).id));
  if (ids.length < 2) {
    return { ok: false, code: "INVALID_SELECTION", message: "Add another scenario before comparing." };
  }

  const selectionError = await getCompareSelectionError(supabase, user.id, ids);
  if (selectionError) return selectionError;

  await setCompareCookie(ids);
  return { ok: true };
}

export async function removeCompareDealAction(id: string): Promise<CompareActionResult> {
  const selectedId = id.trim();
  if (!selectedId) {
    return { ok: false, code: "INVALID_SELECTION", message: "Choose a deal to remove." };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in to edit this comparison." };
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!hasPlanFeature(entitlements, "compare_deals")) {
    return { ok: false, code: "ENTITLEMENT_REQUIRED", message: "Compare is not available for your current plan." };
  }

  const ids = (await getCompareIdsFromCookie()).filter((currentId) => currentId !== selectedId);
  await setCompareCookie(ids);
  // The client refreshes after showing a visible pending/success state. With
  // one remaining deal the server page opens the seeded picker rather than a
  // misleading one-column comparison.
  return { ok: true, remainingIds: ids };
}
