"use server";

/**
 * Buy Box server action — persists a user's personal acquisition
 * criteria (one row in user_buy_box, 1:1 with auth.users) and reads
 * them back for the Settings form and the inline verdict card.
 *
 * Pro-gated: writes require the 'buy_box' plan feature. Reads return
 * `canUse` so the Settings UI can show the upsell to free users while
 * still loading any previously-saved row (e.g. after a downgrade).
 *
 * Defensive: every path tolerates the migration
 * (20260621120000_user_buy_box) not yet being applied — a missing table
 * returns MIGRATION_PENDING instead of throwing, so the calculator and
 * Settings keep working before the SQL is run in prod.
 *
 * NOTE: "use server" files may export only async functions, so the zod
 * schema is a non-exported const (see app/actions/user-defaults.ts for
 * the same constraint).
 */
import { z } from "zod";
import {
  EMPTY_BUY_BOX,
  US_STATE_OPTIONS,
  type BuyBoxCriteria,
  type BuyBoxPropertyType,
} from "@/lib/buy-box";
import { getEntitlementsForUser, hasPlanFeature } from "@/lib/entitlements";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const KNOWN_STATE_ABBRS = new Set(US_STATE_OPTIONS.map((s) => s.abbr));

function nullableNumber(min: number, max: number) {
  return z.preprocess(
    (v) =>
      v === "" || v === undefined || v === null || (typeof v === "number" && Number.isNaN(v))
        ? null
        : v,
    z.number().min(min).max(max).nullable()
  );
}

const criteriaSchema = z
  .object({
    minCapRatePct: nullableNumber(0, 100),
    minCocPct: nullableNumber(-100, 1000),
    minDscr: nullableNumber(0, 100),
    minCashFlowMonthly: nullableNumber(-1_000_000, 1_000_000),
    maxPurchasePrice: nullableNumber(0, 1_000_000_000),
    propertyTypes: z
      .array(z.enum(["single-family", "multi-family", "owner-occupant"]))
      .max(3)
      .default([]),
    targetStates: z.array(z.string()).max(60).default([]),
    isActive: z.boolean().default(true),
  })
  .strict();

export type BuyBoxActionResult =
  | { ok: true; criteria: BuyBoxCriteria; canUse: boolean }
  | {
      ok: false;
      code:
        | "SIGN_IN_REQUIRED"
        | "ENTITLEMENT_REQUIRED"
        | "MIGRATION_PENDING"
        | "VALIDATION_ERROR"
        | "SERVER_ERROR";
      message: string;
    };

type BuyBoxRow = {
  min_cap_rate_pct: number | string | null;
  min_coc_pct: number | string | null;
  min_dscr: number | string | null;
  min_cash_flow_monthly: number | string | null;
  max_purchase_price: number | string | null;
  property_types: string[] | null;
  target_states: string[] | null;
  is_active: boolean | null;
};

function toNum(value: number | string | null): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function rowToCriteria(row: BuyBoxRow): BuyBoxCriteria {
  const propertyTypes = (row.property_types ?? []).filter(
    (t): t is BuyBoxPropertyType =>
      t === "single-family" || t === "multi-family" || t === "owner-occupant"
  );
  const targetStates = (row.target_states ?? [])
    .map((s) => s.toUpperCase())
    .filter((s) => KNOWN_STATE_ABBRS.has(s));
  return {
    minCapRatePct: toNum(row.min_cap_rate_pct),
    minCocPct: toNum(row.min_coc_pct),
    minDscr: toNum(row.min_dscr),
    minCashFlowMonthly: toNum(row.min_cash_flow_monthly),
    maxPurchasePrice: toNum(row.max_purchase_price),
    propertyTypes,
    targetStates,
    isActive: row.is_active ?? true,
  };
}

function isMissingTable(error: { code?: string; message?: string }): boolean {
  return error.code === "42P01" || /relation .* does not exist/i.test(error.message ?? "");
}

/**
 * Read the current user's Buy Box. Returns EMPTY_BUY_BOX when none is
 * saved. `canUse` reflects the Pro entitlement so the UI can gate
 * editing without a second round-trip.
 */
export async function getBuyBoxAction(): Promise<BuyBoxActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  const canUse = hasPlanFeature(entitlements, "buy_box");

  const { data, error } = await supabase
    .from("user_buy_box")
    .select(
      "min_cap_rate_pct, min_coc_pct, min_dscr, min_cash_flow_monthly, max_purchase_price, property_types, target_states, is_active"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error)) {
      return { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." };
    }
    return { ok: false, code: "SERVER_ERROR", message: error.message };
  }

  const criteria = data ? rowToCriteria(data as BuyBoxRow) : EMPTY_BUY_BOX;
  return { ok: true, criteria, canUse };
}

/**
 * Upsert the user's Buy Box. Pro-gated: free users get
 * ENTITLEMENT_REQUIRED. Unknown / mixed-case state codes are normalized
 * and dropped if unrecognized.
 */
export async function saveBuyBoxAction(input: unknown): Promise<BuyBoxActionResult> {
  const parsed = criteriaSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!hasPlanFeature(entitlements, "buy_box")) {
    return {
      ok: false,
      code: "ENTITLEMENT_REQUIRED",
      message: "The Buy Box is a Pro feature. Upgrade to set your acquisition criteria.",
    };
  }

  const targetStates = parsed.data.targetStates
    .map((s) => s.toUpperCase())
    .filter((s) => KNOWN_STATE_ABBRS.has(s));

  const criteria: BuyBoxCriteria = {
    minCapRatePct: parsed.data.minCapRatePct,
    minCocPct: parsed.data.minCocPct,
    minDscr: parsed.data.minDscr,
    minCashFlowMonthly: parsed.data.minCashFlowMonthly,
    maxPurchasePrice: parsed.data.maxPurchasePrice,
    propertyTypes: parsed.data.propertyTypes,
    targetStates,
    isActive: parsed.data.isActive,
  };

  const { error } = await supabase.from("user_buy_box").upsert(
    {
      user_id: user.id,
      min_cap_rate_pct: criteria.minCapRatePct,
      min_coc_pct: criteria.minCocPct,
      min_dscr: criteria.minDscr,
      min_cash_flow_monthly: criteria.minCashFlowMonthly,
      max_purchase_price: criteria.maxPurchasePrice,
      property_types: criteria.propertyTypes,
      target_states: criteria.targetStates,
      is_active: criteria.isActive,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    if (isMissingTable(error)) {
      return { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." };
    }
    return { ok: false, code: "SERVER_ERROR", message: error.message };
  }

  return { ok: true, criteria, canUse: true };
}

/** Delete the user's Buy Box row entirely (Pro-gated). */
export async function clearBuyBoxAction(): Promise<BuyBoxActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!hasPlanFeature(entitlements, "buy_box")) {
    return {
      ok: false,
      code: "ENTITLEMENT_REQUIRED",
      message: "The Buy Box is a Pro feature.",
    };
  }

  const { error } = await supabase.from("user_buy_box").delete().eq("user_id", user.id);
  if (error) {
    if (isMissingTable(error)) {
      return { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." };
    }
    return { ok: false, code: "SERVER_ERROR", message: error.message };
  }

  return { ok: true, criteria: EMPTY_BUY_BOX, canUse: true };
}
