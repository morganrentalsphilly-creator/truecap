"use server";
import { toServerErrorResult } from "@/lib/db-error";

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
  buyBoxHasCriteria,
  countBuyBoxFit,
  rowToNamedBuyBox,
  type BuyBoxesRow,
  deriveStateFromAddress,
  type BuyBoxCriteria,
  type BuyBoxDealMetrics,
  type BuyBoxFitCount,
  type NamedBuyBox,
} from "@/lib/buy-box";
import { isStrategyKind } from "@/lib/strategy-kinds";
import {
  getEntitlementsForUser,
  hasPaidPlanSubscription,
  hasPlanFeature,
  requireVerifiedEntitlements,
} from "@/lib/entitlements";
import {
  recomputeSavedDealVerdict,
  toRecomputedSavedAnalysisSnapshot,
} from "@/lib/recompute-saved-deal-verdict";
import { resolveSavedAnalysisSnapshot } from "@/lib/saved-analysis-methodology";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_PURCHASE_PRICE } from "@/lib/investcalc-schema";
import {
  isReleasedUnderwritingSnapshot,
  normalizeReleasedInvestmentFormSnapshot,
  releasedInvestmentFormSchema,
} from "@/lib/underwriting-model-release";
import { calculateMaoIrr } from "@/lib/mao-target-evaluation";
import { getBuyBoxAuthorizedDealIds } from "@/lib/buy-box-access-server";
import { activeMeteredEvaluationDealGrantsAccess } from "@/lib/evaluation-access-server";

const KNOWN_STATE_ABBRS = new Set(US_STATE_OPTIONS.map((s) => s.abbr));
const MAX_BUY_BOXES = 12;
/** Sane cap on the save-feedback evaluation query (active deals only). */
const FIT_FEEDBACK_DEALS_LIMIT = 200;

const SELECT_COLS_LEGACY =
  "id, name, strategy_kind, min_cap_rate_pct, min_coc_pct, min_dscr, min_cash_flow_monthly, max_purchase_price, property_types, target_states, is_active, is_default, sort_order";
const SELECT_COLS = `${SELECT_COLS_LEGACY}, min_irr_pct, max_cash_required`;
/** + client_id (Agent Pro, migration 20260811120000). Selected via a
 *  fallback ladder: try WITH the column, retry legacy on 42703 — so a
 *  pre-migration database keeps working untouched. */
const SELECT_COLS_WITH_CLIENT = `${SELECT_COLS}, client_id`;

function isMissingColumn(error: { code?: string; message?: string } | null): boolean {
  return !!error && (error.code === "42703" || /column .* does not exist/i.test(error.message ?? ""));
}

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
    minCocPct: nullableNumber(0, 1000),
    minDscr: nullableNumber(0, 100),
    minCashFlowMonthly: nullableNumber(-1_000_000, 1_000_000),
    minIrrPct: nullableNumber(-99.9, 1000),
    maxCashRequired: nullableNumber(0, 1_000_000_000),
    maxPurchasePrice: nullableNumber(0, MAX_PURCHASE_PRICE),
    propertyTypes: z
      .array(z.enum(["single-family", "multi-family", "owner-occupant"]))
      .max(3)
      .default([]),
    targetStates: z.array(z.string()).max(60).default([]),
    isActive: z.boolean().default(true),
    isDefault: z.boolean().default(false),
    /** Agent Pro: scope this box to a roster client. Silently dropped when
     *  the client_id column doesn't exist yet (pre-migration). */
    clientId: z.string().uuid().nullable().optional(),
  })
  .strict();

export type BuyBoxesActionResult =
  | {
      ok: true;
      boxes: NamedBuyBox[];
      canUse: boolean;
      /** False while the IRR/cash-target migration is unapplied: the editor
       *  disables those two inputs instead of letting a doomed save be
       *  composed and then rejected. */
      supportsOfferTargets?: boolean;
      /**
       * "X of your N active deals pass this box" save feedback — set only by
       * upsertBuyBoxAction, and only when the evaluation succeeded (additive:
       * existing consumers read boxes/canUse and never see it). Absent when
       * the box is inactive/empty, the user has no active deals, or the
       * evaluation failed (feedback must never fail a save).
       */
      fit?: BuyBoxFitCount;
    }
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

function isMissingTable(error: { code?: string; message?: string }): boolean {
  return error.code === "42P01" || /relation .* does not exist/i.test(error.message ?? "");
}

/** Resolve the signed-in Pro user, or a typed failure result. */
async function requireProUser(
  supabase: SupabaseClient
): Promise<
  | { ok: true; userId: string; hasPaidAccess: boolean }
  | { ok: false; result: BuyBoxesActionResult }
> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, result: { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." } };
  }
  const [verified, hasPaidAccess] = await Promise.all([
    requireVerifiedEntitlements(supabase, user.id),
    hasPaidPlanSubscription(supabase, user.id),
  ]);
  if (!verified.ok) return { ok: false, result: verified };
  const entitlements = verified.entitlements;
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
  return { ok: true, userId: user.id, hasPaidAccess };
}

/** Read + map all of a user's boxes, default-first then by sort order. */
async function fetchBoxes(
  supabase: SupabaseClient,
  userId: string
): Promise<
  | { ok: true; boxes: NamedBuyBox[]; supportsOfferTargets: boolean }
  | { ok: false; result: BuyBoxesActionResult }
> {
  const buildQuery = (cols: string) =>
    supabase
      .from("user_buy_boxes")
      .select(cols)
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

  let { data, error } = await buildQuery(SELECT_COLS_WITH_CLIENT);
  if (isMissingColumn(error)) {
    ({ data, error } = await buildQuery(SELECT_COLS));
  }
  let supportsOfferTargets = !isMissingColumn(error);
  if (isMissingColumn(error)) {
    ({ data, error } = await buildQuery(`${SELECT_COLS_LEGACY}, client_id`));
    supportsOfferTargets = false;
  }
  if (isMissingColumn(error)) {
    ({ data, error } = await buildQuery(SELECT_COLS_LEGACY));
    supportsOfferTargets = false;
  }

  if (error) {
    return {
      ok: false,
      result: isMissingTable(error)
        ? { ok: false, code: "MIGRATION_PENDING", message: "Temporarily unavailable while we finish a maintenance update. Please try again in a few minutes." }
        : toServerErrorResult(error, "user-buy-boxes"),
    };
  }
  return {
    ok: true,
    boxes: ((data ?? []) as unknown[]).map((r) =>
      rowToNamedBuyBox(r as BuyBoxesRow),
    ),
    supportsOfferTargets,
  };
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

/** Scalar row shape for the save-feedback deals query below. */
type FitDealRow = {
  id: string;
  address: string | null;
  property_type: string | null;
  purchase_price: number | null;
  net_cash_flow_monthly: number | null;
  coc_return_pct: number | null;
  cap_rate_raw: string | null;
  methodology_version: string | null;
  result_snapshot: Record<string, unknown> | null;
  form_snapshot: unknown;
};

/**
 * Evaluate the user's ACTIVE deals against the just-saved criteria so the
 * editor can say "3 of your 12 active deals pass this box". Same metrics
 * derivation My Deals uses (recompute-on-read from form_snapshot, stored
 * scalars as the legacy fallback) and the same pure evaluation
 * (countBuyBoxFit → evaluateBuyBox). RLS-scoped via the caller's server
 * client + explicit user_id filter. Best-effort: any error — or an
 * inactive/empty box, or zero active deals — returns null and the save
 * result simply omits the line. Feedback must never fail a save.
 */
async function computeSavedBoxFit(
  supabase: SupabaseClient,
  userId: string,
  criteria: BuyBoxCriteria,
  hasPaidAccess: boolean,
  /** Agent Pro: when the box is scoped to a client, only THAT client's deals
   *  are the honest denominator. Measuring one buyer's criteria against every
   *  deal the agent owns made "3 of 40 pass" meaningless. */
  clientId?: string | null
): Promise<BuyBoxFitCount | null> {
  if (!criteria.isActive || !buyBoxHasCriteria(criteria)) return null;
  try {
    let query = supabase
      .from("saved_analyses")
      .select(
        "id, address, property_type, purchase_price, net_cash_flow_monthly, coc_return_pct, cap_rate_raw:result_snapshot->>capRate, methodology_version, result_snapshot, form_snapshot"
      )
      .eq("user_id", userId)
      .is("deleted_at", null)
      .eq("is_completed", false)
      .eq("is_archived", false);
    if (clientId) query = query.eq("client_id", clientId);
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(FIT_FEEDBACK_DEALS_LIMIT);
    if (error || !data || data.length === 0) return null;

    const releasedRows = (data as unknown as FitDealRow[])
      .filter((row) => isReleasedUnderwritingSnapshot(row.form_snapshot))
      .map((row) => ({
        row,
        values: normalizeReleasedInvestmentFormSnapshot(row.form_snapshot),
      }))
      .filter(
        (entry): entry is { row: FitDealRow; values: NonNullable<typeof entry.values> } =>
          entry.values != null,
      );
    const authorizedDealIds = await getBuyBoxAuthorizedDealIds({
      supabase,
      userId,
      hasPaidAccess,
      deals: releasedRows.map(({ row, values }) => ({ id: row.id, values })),
    });
    const metricsList = releasedRows
      .filter(({ row }) => authorizedDealIds.has(row.id))
      .map(({ row, values }): BuyBoxDealMetrics => {
        const recomputed = recomputeSavedDealVerdict(row.form_snapshot);
        const resolution = resolveSavedAnalysisSnapshot({
          methodologyVersion: row.methodology_version,
          resultSnapshot: row.result_snapshot,
          recomputedSnapshot: recomputed
            ? toRecomputedSavedAnalysisSnapshot(recomputed)
            : undefined,
        });
        const fresh = resolution.didRecompute ? recomputed : null;
        const snapshot = resolution.snapshot;
        const capSnap = row.cap_rate_raw != null ? Number(row.cap_rate_raw) : NaN;
        const dscrSnap = Number(snapshot.dscr);
        const monthlyPaymentSnap = Number(snapshot.monthlyPayment);
        const irr = fresh && values
          ? calculateMaoIrr(values, fresh.analysisResult)
          : null;
        return {
          capRatePct: fresh ? fresh.capRatePct : Number.isFinite(capSnap) ? capSnap : null,
          cocPct: fresh ? fresh.cocReturnPct : row.coc_return_pct,
          dscr: fresh ? fresh.dscr : Number.isFinite(dscrSnap) ? dscrSnap : null,
          cashFlowMonthly: fresh ? fresh.netCashFlowMonthly : row.net_cash_flow_monthly,
          purchasePrice: row.purchase_price,
          propertyType:
            row.property_type === "single-family" ||
            row.property_type === "multi-family" ||
            row.property_type === "owner-occupant"
              ? row.property_type
              : null,
          state: deriveStateFromAddress(row.address),
          // Explicit cash flag from the recompute (canonical monthlyPayment<=0);
          // fall back to not-cash so a legacy deal still gets its DSCR criterion
          // applied rather than silently skipped — mirrors toBuyBoxMetrics.
          isCashPurchase: fresh
            ? fresh.isCashPurchase
            : Number.isFinite(monthlyPaymentSnap) && monthlyPaymentSnap <= 0,
          cashRequired: fresh ? fresh.cashToClose : null,
          irrPct: irr?.primaryIrrPct ?? null,
          irrStatus: irr?.status ?? "none",
        };
      });
    if (metricsList.length === 0) return null;
    return countBuyBoxFit(criteria, metricsList);
  } catch {
    return null;
  }
}

export async function listBuyBoxesAction(): Promise<BuyBoxesActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };

  const verified = await requireVerifiedEntitlements(supabase, user.id);
  if (!verified.ok) return verified;
  const entitlements = verified.entitlements;
  const canUse = hasPlanFeature(entitlements, "buy_box");

  const fetched = await fetchBoxes(supabase, user.id);
  if (!fetched.ok) return fetched.result;
  return {
    ok: true,
    boxes: fetched.boxes,
    canUse,
    supportsOfferTargets: fetched.supportsOfferTargets,
  };
}

/**
 * Verdict-specific reader for an arbitrary deal surface (currently public
 * shares). Unlike the settings/list reader, evaluation access is bound to the
 * exact SHA-256 deal ledger key; paid users bypass metering.
 */
export async function listBuyBoxesForDealAction(
  input: unknown,
): Promise<BuyBoxesActionResult> {
  const parsed = releasedInvestmentFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid deal values." };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };

  const [verified, hasPaidAccess] = await Promise.all([
    requireVerifiedEntitlements(supabase, user.id),
    hasPaidPlanSubscription(supabase, user.id),
  ]);
  if (!verified.ok) return verified;
  const entitlements = verified.entitlements;
  const hasBuyBoxFeature = hasPlanFeature(entitlements, "buy_box");
  const canUse =
    hasPaidAccess ||
    (hasBuyBoxFeature &&
      (await activeMeteredEvaluationDealGrantsAccess(
        supabase,
        user.id,
        parsed.data,
      )));

  const fetched = await fetchBoxes(supabase, user.id);
  if (!fetched.ok) return fetched.result;
  return {
    ok: true,
    boxes: fetched.boxes,
    canUse,
    supportsOfferTargets: fetched.supportsOfferTargets,
  };
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

  // A box may only be scoped to a client the CALLER owns. The FK alone can't
  // enforce that (constraint checks bypass RLS), so without this a caller
  // could attach their box to another agent's client UUID — harmless to the
  // other agent's data but a silent cross-tenant reference we never want.
  if (parsed.data.clientId != null) {
    const { data: ownedClient } = await supabase
      .from("agent_clients")
      .select("id")
      .eq("id", parsed.data.clientId)
      .eq("agent_user_id", userId)
      .maybeSingle();
    if (!ownedClient) {
      return { ok: false, code: "VALIDATION_ERROR", message: "That client doesn't exist on your roster." };
    }
  }

  const targetStates = parsed.data.targetStates
    .map((s) => s.toUpperCase())
    .filter((s) => KNOWN_STATE_ABBRS.has(s));
  const strategyKind = isStrategyKind(parsed.data.strategyKind) ? parsed.data.strategyKind : null;

  // Current boxes — for the create cap + the "first box is default" rule.
  const existing = await fetchBoxes(supabase, userId);
  if (!existing.ok) return existing.result;
  if (
    !existing.supportsOfferTargets &&
    (parsed.data.minIrrPct != null || parsed.data.maxCashRequired != null)
  ) {
    return {
      ok: false,
      code: "MIGRATION_PENDING",
      message: "The IRR and cash-required criteria need the latest schema update.",
    };
  }

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
    ...(existing.supportsOfferTargets
      ? {
          min_irr_pct: parsed.data.minIrrPct,
          max_cash_required: parsed.data.maxCashRequired,
        }
      : {}),
    max_purchase_price: parsed.data.maxPurchasePrice,
    property_types: parsed.data.propertyTypes,
    target_states: targetStates,
    is_active: parsed.data.isActive,
    is_default: shouldBeDefault,
    updated_at: new Date().toISOString(),
    // Only when the caller sent it — the client selector renders solely for
    // Agent Pro users, who cannot exist before the migration, so ordinary
    // saves never touch the column.
    ...(parsed.data.clientId !== undefined ? { client_id: parsed.data.clientId } : {}),
  };

  if (isCreate) {
    const sortOrder = existing.boxes.length;
    const { error } = await supabase
      .from("user_buy_boxes")
      .insert({ ...rowValues, sort_order: sortOrder });
    if (error) {
      return isMissingTable(error)
        ? { ok: false, code: "MIGRATION_PENDING", message: "Temporarily unavailable while we finish a maintenance update. Please try again in a few minutes." }
        : toServerErrorResult(error, "user-buy-boxes");
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
        ? { ok: false, code: "MIGRATION_PENDING", message: "Temporarily unavailable while we finish a maintenance update. Please try again in a few minutes." }
        : toServerErrorResult(error, "user-buy-boxes");
    }
    if (!data) return { ok: false, code: "NOT_FOUND", message: "Buy box not found." };
  }

  const refreshed = await fetchBoxes(supabase, userId);
  if (!refreshed.ok) return refreshed.result;
  await ensureOneDefault(supabase, userId, refreshed.boxes);
  const final = await fetchBoxes(supabase, userId);
  if (!final.ok) return final.result;

  // Save feedback (additive): how many of the user's active deals pass the
  // criteria just saved. Evaluated from the SAME normalized values we wrote,
  // so it works for create and update alike without re-reading the row.
  const fit = await computeSavedBoxFit(
    supabase,
    userId,
    {
      minCapRatePct: parsed.data.minCapRatePct,
      minCocPct: parsed.data.minCocPct,
      minDscr: parsed.data.minDscr,
      minCashFlowMonthly: parsed.data.minCashFlowMonthly,
      minIrrPct: parsed.data.minIrrPct,
      maxCashRequired: parsed.data.maxCashRequired,
      maxPurchasePrice: parsed.data.maxPurchasePrice,
      propertyTypes: parsed.data.propertyTypes,
      targetStates,
      isActive: parsed.data.isActive,
    },
    auth.hasPaidAccess,
    parsed.data.clientId ?? null,
  );
  return fit
    ? { ok: true, boxes: final.boxes, canUse: true, fit }
    : { ok: true, boxes: final.boxes, canUse: true };
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
      ? { ok: false, code: "MIGRATION_PENDING", message: "Temporarily unavailable while we finish a maintenance update. Please try again in a few minutes." }
      : toServerErrorResult(error, "user-buy-boxes");
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
      ? { ok: false, code: "MIGRATION_PENDING", message: "Temporarily unavailable while we finish a maintenance update. Please try again in a few minutes." }
      : toServerErrorResult(error, "user-buy-boxes");
  }
  if (!data) return { ok: false, code: "NOT_FOUND", message: "Buy box not found." };

  const final = await fetchBoxes(supabase, userId);
  if (!final.ok) return final.result;
  return { ok: true, boxes: final.boxes, canUse: true };
}
