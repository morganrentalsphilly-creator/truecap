"use server";

/**
 * Multiple Buy Boxes server action (DM-2) — CRUD over user_buy_boxes
 * (1:many with the user). Supersedes the single-box user-buy-box.ts; that
 * action stays in place until the UI is migrated.
 *
 * Pro-gated: writes require the 'buy_box' plan feature (reads return `canUse`
 * so the UI can show the upsell while still listing saved boxes after a
 * downgrade). Every path tolerates the migration
 * (20260622120000_user_buy_boxes) not yet being applied — a missing table
 * returns MIGRATION_PENDING instead of throwing, so the product keeps working
 * before the SQL is run in prod (this action ships DORMANT).
 *
 * Invariant: a user with ≥1 box always has exactly one default. We clear other
 * defaults before setting a new one (the partial unique index enforces at most
 * one) and promote the first box when a delete leaves none.
 *
 * "use server" files may export only async functions, so schemas/types are
 * non-exported consts (type aliases are erased, so they're fine to export).
 */

import { z } from "zod";
import {
  US_STATE_OPTIONS,
  type BuyBoxPropertyType,
  type NamedBuyBox,
} from "@/lib/buy-box";
import { isStrategyKind } from "@/lib/strategy-kinds";
import { getEntitlementsForUser, hasPlanFeature } from "@/lib/entitlements";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

const KNOWN_STATE_ABBRS = new Set(US_STATE_OPTIONS.map((s) => s.abbr));
const MAX_BUY_BOXES = 12;

const SELECT_COLS =
  "id, name, strategy_kind, min_cap_rate_pct, min_coc_pct, min_dscr, min_cash_flow_monthly, max_purchase_price, property_types, target_states, is_active, is_default, sort_order";

function nullableNumber(min: number, max: number) {
  return z.preprocess(
    (v) =>
      v === "" || v === undefined || v === null || (typeof v === "number" && Number.isNaN(v))
        ? null
        : v,
    z.number().min(min).max(max).nullable()
  );
}

const boxSchema = z
  .object({
    /** Present = update an existing box; absent = create a new one. */
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1, "Name your buy box").max(80).default("My Buy Box"),
    strategyKind: z.string().nullable().default(null),
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
    isDefault: z.boolean().default(false),
  })
  .strict();

export type BuyBoxesActionResult =
  | { ok: true; boxes: NamedBuyBox[]; canUse: boolean }
  | {
      ok: false;
      code:
        | "SIGN_IN_REQUIRED"
        | "ENTITLEMENT_REQUIRED"
        | "MIGRATION_PENDING"
        | "VALIDATION_ERROR"
        | "LIMIT_REACHED"
        | "NOT_FOUND"
        | "SERVER_ERROR";
      message: string;
    };

type BuyBoxesRow = {
  id: string;
  name: string | null;
  strategy_kind: string | null;
  min_cap_rate_pct: number | string | null;
  min_coc_pct: number | string | null;
  min_dscr: number | string | null;
  min_cash_flow_monthly: number | string | null;
  max_purchase_price: number | string | null;
  property_types: string[] | null;
  target_states: string[] | null;
  is_active: boolean | null;
  is_default: boolean | null;
  sort_order: number | null;
};

function toNum(value: number | string | null): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function rowToNamedBuyBox(row: BuyBoxesRow): NamedBuyBox {
  const propertyTypes = (row.property_types ?? []).filter(
    (t): t is BuyBoxPropertyType =>
      t === "single-family" || t === "multi-family" || t === "owner-occupant"
  );
  const targetStates = (row.target_states ?? [])
    .map((s) => s.toUpperCase())
    .filter((s) => KNOWN_STATE_ABBRS.has(s));
  return {
    id: row.id,
    name: row.name ?? "My Buy Box",
    strategyKind: isStrategyKind(row.strategy_kind) ? row.strategy_kind : null,
    isDefault: row.is_default ?? false,
    sortOrder: row.sort_order ?? 0,
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

/** Resolve the signed-in Pro user, or a typed failure result. */
async function requireProUser(
  supabase: SupabaseClient
): Promise<{ ok: true; userId: string } | { ok: false; result: BuyBoxesActionResult }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, result: { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." } };
  }
  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!hasPlanFeature(entitlements, "buy_box")) {
    return {
      ok: false,
      result: {
        ok: false,
        code: "ENTITLEMENT_REQUIRED",
        message: "Buy boxes are a Pro feature. Upgrade to screen deals against your criteria.",
      },
    };
  }
  return { ok: true, userId: user.id };
}

/** Read + map all of a user's boxes, default-first then by sort order. */
async function fetchBoxes(
  supabase: SupabaseClient,
  userId: string
): Promise<{ ok: true; boxes: NamedBuyBox[] } | { ok: false; result: BuyBoxesActionResult }> {
  const { data, error } = await supabase
    .from("user_buy_boxes")
    .select(SELECT_COLS)
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return {
      ok: false,
      result: isMissingTable(error)
        ? { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." }
        : { ok: false, code: "SERVER_ERROR", message: error.message },
    };
  }
  return { ok: true, boxes: (data ?? []).map((r) => rowToNamedBuyBox(r as BuyBoxesRow)) };
}

/**
 * Guarantee the "exactly one default per user" invariant. If the user has ≥1
 * box and none is flagged default, promote the first (the list is already
 * default-first/sort-ordered). Best-effort: a failure here doesn't fail the
 * caller's primary mutation.
 */
async function ensureOneDefault(supabase: SupabaseClient, userId: string, boxes: NamedBuyBox[]): Promise<void> {
  if (boxes.length === 0 || boxes.some((b) => b.isDefault)) return;
  const first = boxes[0];
  if (!first) return;
  await supabase.from("user_buy_boxes").update({ is_default: true }).eq("id", first.id).eq("user_id", userId);
}

/** Clear every default for a user (used before setting a new one). */
async function clearDefaults(supabase: SupabaseClient, userId: string): Promise<void> {
  await supabase.from("user_buy_boxes").update({ is_default: false }).eq("user_id", userId).eq("is_default", true);
}

export async function listBuyBoxesAction(): Promise<BuyBoxesActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  const canUse = hasPlanFeature(entitlements, "buy_box");

  const fetched = await fetchBoxes(supabase, user.id);
  if (!fetched.ok) return fetched.result;
  return { ok: true, boxes: fetched.boxes, canUse };
}

/** Create (no id) or update (id) a buy box. Pro-gated. Returns the new list. */
export async function upsertBuyBoxAction(input: unknown): Promise<BuyBoxesActionResult> {
  const parsed = boxSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createServerSupabaseClient();
  const auth = await requireProUser(supabase);
  if (!auth.ok) return auth.result;
  const userId = auth.userId;

  const targetStates = parsed.data.targetStates
    .map((s) => s.toUpperCase())
    .filter((s) => KNOWN_STATE_ABBRS.has(s));
  const strategyKind = isStrategyKind(parsed.data.strategyKind) ? parsed.data.strategyKind : null;

  // Current boxes — for the create cap + the "first box is default" rule.
  const existing = await fetchBoxes(supabase, userId);
  if (!existing.ok) return existing.result;

  const isCreate = !parsed.data.id;
  if (isCreate && existing.boxes.length >= MAX_BUY_BOXES) {
    return {
      ok: false,
      code: "LIMIT_REACHED",
      message: `You can keep up to ${MAX_BUY_BOXES} buy boxes.`,
    };
  }

  // A user's first box is always the default; otherwise honor the flag.
  const shouldBeDefault = parsed.data.isDefault || (isCreate && existing.boxes.length === 0);
  if (shouldBeDefault) await clearDefaults(supabase, userId);

  const rowValues = {
    user_id: userId,
    name: parsed.data.name,
    strategy_kind: strategyKind,
    min_cap_rate_pct: parsed.data.minCapRatePct,
    min_coc_pct: parsed.data.minCocPct,
    min_dscr: parsed.data.minDscr,
    min_cash_flow_monthly: parsed.data.minCashFlowMonthly,
    max_purchase_price: parsed.data.maxPurchasePrice,
    property_types: parsed.data.propertyTypes,
    target_states: targetStates,
    is_active: parsed.data.isActive,
    is_default: shouldBeDefault,
    updated_at: new Date().toISOString(),
  };

  if (isCreate) {
    const sortOrder = existing.boxes.length;
    const { error } = await supabase
      .from("user_buy_boxes")
      .insert({ ...rowValues, sort_order: sortOrder });
    if (error) {
      return isMissingTable(error)
        ? { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." }
        : { ok: false, code: "SERVER_ERROR", message: error.message };
    }
  } else {
    // Ownership-scoped update; a foreign / missing id returns NOT_FOUND.
    const { data, error } = await supabase
      .from("user_buy_boxes")
      .update(rowValues)
      .eq("id", parsed.data.id)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();
    if (error) {
      return isMissingTable(error)
        ? { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." }
        : { ok: false, code: "SERVER_ERROR", message: error.message };
    }
    if (!data) return { ok: false, code: "NOT_FOUND", message: "Buy box not found." };
  }

  const refreshed = await fetchBoxes(supabase, userId);
  if (!refreshed.ok) return refreshed.result;
  await ensureOneDefault(supabase, userId, refreshed.boxes);
  const final = await fetchBoxes(supabase, userId);
  if (!final.ok) return final.result;
  return { ok: true, boxes: final.boxes, canUse: true };
}

/** Delete one box (ownership-scoped). Promotes a new default if needed. */
export async function deleteBuyBoxAction(id: unknown): Promise<BuyBoxesActionResult> {
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid buy box id." };
  }

  const supabase = await createServerSupabaseClient();
  const auth = await requireProUser(supabase);
  if (!auth.ok) return auth.result;
  const userId = auth.userId;

  const { error } = await supabase
    .from("user_buy_boxes")
    .delete()
    .eq("id", parsedId.data)
    .eq("user_id", userId);
  if (error) {
    return isMissingTable(error)
      ? { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." }
      : { ok: false, code: "SERVER_ERROR", message: error.message };
  }

  const refreshed = await fetchBoxes(supabase, userId);
  if (!refreshed.ok) return refreshed.result;
  await ensureOneDefault(supabase, userId, refreshed.boxes);
  const final = await fetchBoxes(supabase, userId);
  if (!final.ok) return final.result;
  return { ok: true, boxes: final.boxes, canUse: true };
}

/** Make one box the default (clears the others). Pro-gated. */
export async function setDefaultBuyBoxAction(id: unknown): Promise<BuyBoxesActionResult> {
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid buy box id." };
  }

  const supabase = await createServerSupabaseClient();
  const auth = await requireProUser(supabase);
  if (!auth.ok) return auth.result;
  const userId = auth.userId;

  await clearDefaults(supabase, userId);
  const { data, error } = await supabase
    .from("user_buy_boxes")
    .update({ is_default: true })
    .eq("id", parsedId.data)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (error) {
    return isMissingTable(error)
      ? { ok: false, code: "MIGRATION_PENDING", message: "Schema migration pending." }
      : { ok: false, code: "SERVER_ERROR", message: error.message };
  }
  if (!data) return { ok: false, code: "NOT_FOUND", message: "Buy box not found." };

  const final = await fetchBoxes(supabase, userId);
  if (!final.ok) return final.result;
  return { ok: true, boxes: final.boxes, canUse: true };
}
