/**
 * Saved Deal Watch — pure threshold-crossing evaluator.
 *
 * This module performs no IO and sends no notifications. The caller supplies
 * the latest authorized listing/rate/assumption observation plus the previous
 * checkpoint. We re-underwrite through calculateAnalysis, evaluate the same
 * Buy Box rules as the product, and solve Max Offer through the canonical MAO
 * engine. At most ONE coalesced event is returned per evaluation so a single
 * provider update cannot create a burst of overlapping alerts.
 *
 * First observation = checkpoint only, never an alert. Persist the checkpoint
 * and event dedupe key in a future integration/outbox before enabling sends.
 */

import {
  deriveStateFromAddress,
  evaluateBuyBox,
  type BuyBoxCheck,
  type BuyBoxCriteria,
  type BuyBoxDealMetrics,
} from "@/lib/buy-box";
import { calculateAnalysis } from "@/lib/calc-analysis";
import {
  buildWhatNeedsToBeTrue,
  type DecisionThresholdDirection,
  type DecisionThresholdId,
  type DecisionThresholdStatus,
  type DecisionThresholdUnit,
} from "@/lib/decision-thresholds";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import {
  calculateMaxAllowableOffer,
  type MaoTarget,
} from "@/lib/max-allowable-offer";

export const SAVED_DEAL_WATCH_VERSION = "1.0" as const;
export const DEFAULT_MATERIAL_GAP_CHANGE_DOLLARS = 5_000;
export const DEFAULT_MATERIAL_GAP_CHANGE_PCT = 0.02;

export type SavedDealWatchTrigger =
  | "initial"
  | "listing_price"
  | "mortgage_rate"
  | "financing_profile"
  | "verified_rent"
  | "user_assumptions"
  | "mixed";

/**
 * Partial current observation. Omitted/null values carry forward from the
 * previous checkpoint and finally fall back to the saved underwrite. This is
 * important for a rate-only update: it must not erase the last known price.
 */
export interface SavedDealWatchObservation {
  observedAt: string;
  trigger: SavedDealWatchTrigger;
  askingPrice?: number | null;
  mortgageRatePct?: number | null;
  /** Provider/source identifier for auditability; never placed in copy. */
  sourceId?: string | null;
}

export interface SavedDealWatchPolicy {
  /** Required for Max Offer crossings and price-to-Max-Offer gap monitoring. */
  maxOfferTarget?: MaoTarget | null;
  /** Required for Buy Box and rate-driven pass events. */
  buyBoxCriteria?: BuyBoxCriteria | null;
  /** Absolute floor for a material gap change. Default: $5,000. */
  materialGapChangeDollars?: number;
  /** Price-relative floor for a material gap change. Default: 2%. */
  materialGapChangePct?: number;
}

export interface SavedDealWatchCheckState {
  id: BuyBoxCheck["id"];
  label: string;
  pass: boolean | null;
}

/** Compact persistable form of the exact What Needs To Be True boundaries. */
export interface SavedDealWatchDecisionThreshold {
  id: DecisionThresholdId;
  label: string;
  status: DecisionThresholdStatus;
  direction: DecisionThresholdDirection;
  unit: DecisionThresholdUnit;
  currentValue: number | null;
  thresholdValue: number | null;
  requiredChange: number | null;
  normalizedGapPct: number | null;
  rechecked: boolean;
}

/** Small, persistable decision snapshot — deliberately excludes full PII/form data. */
export interface SavedDealWatchState {
  methodologyVersion: string | null;
  analysisAvailable: boolean;
  askingPrice: number;
  mortgageRatePct: number;
  maxOffer: number | null;
  /** Positive = asking is over Max Offer; negative = asking is below it. */
  priceToMaxOfferGap: number | null;
  withinMaxOffer: boolean | null;
  buyBoxPass: boolean | null;
  buyBoxFailedLabels: string[];
  buyBoxChecks: SavedDealWatchCheckState[];
  /** Exact, rechecked one-variable boundaries for the watch's MAO target. */
  decisionThresholds: SavedDealWatchDecisionThreshold[];
  /** Smallest normalized change, not a promise that the change is feasible. */
  smallestDecisionGapId: DecisionThresholdId | null;
  monthlyCashFlow: number | null;
  capRatePct: number | null;
  cocReturnPct: number | null;
  dscr: number | null;
}

export interface SavedDealWatchCheckpoint {
  version: typeof SAVED_DEAL_WATCH_VERSION;
  dealId: string;
  observedAt: string;
  sourceId: string | null;
  state: SavedDealWatchState;
}

type WatchEventKind =
  | "rate_driven_buy_box_pass"
  | "newly_within_max_offer"
  | "newly_within_buy_box"
  | "material_price_gap_change";

interface SavedDealWatchEventBase {
  version: typeof SAVED_DEAL_WATCH_VERSION;
  kind: WatchEventKind;
  dealId: string;
  label: string;
  trigger: SavedDealWatchTrigger;
  observedAt: string;
  /** Stable for the resulting decision state; future outboxes should UNIQUE this. */
  dedupeKey: string;
  priority: "high" | "normal";
  summary: string;
  before: SavedDealWatchState;
  after: SavedDealWatchState;
}

export interface RateDrivenBuyBoxPassEvent extends SavedDealWatchEventBase {
  kind: "rate_driven_buy_box_pass";
  priority: "high";
  previousRatePct: number;
  currentRatePct: number;
  clearedChecks: string[];
}

export interface NewlyWithinMaxOfferEvent extends SavedDealWatchEventBase {
  kind: "newly_within_max_offer";
  priority: "high";
  previousGap: number;
  currentGap: number;
}

export interface NewlyWithinBuyBoxEvent extends SavedDealWatchEventBase {
  kind: "newly_within_buy_box";
  priority: "high";
  previousFailedLabels: string[];
}

export interface MaterialPriceGapChangeEvent extends SavedDealWatchEventBase {
  kind: "material_price_gap_change";
  priority: "normal";
  previousGap: number;
  currentGap: number;
  gapChangeDollars: number;
  direction: "improved" | "worsened";
}

export type SavedDealWatchEvent =
  | RateDrivenBuyBoxPassEvent
  | NewlyWithinMaxOfferEvent
  | NewlyWithinBuyBoxEvent
  | MaterialPriceGapChangeEvent;

export interface SavedDealWatchEvaluation {
  previous: SavedDealWatchState | null;
  current: SavedDealWatchState;
  /** Null for initial checkpoints, invalid analyses, and non-meaningful moves. */
  event: SavedDealWatchEvent | null;
  nextCheckpoint: SavedDealWatchCheckpoint;
}

/**
 * Provider/orchestrator-neutral input for the migration's service-role-only
 * `record_saved_deal_watch_evaluation` hook. Keeping this mapper beside the
 * evaluator prevents workers from inventing a second event envelope.
 */
export interface SavedDealWatchPersistenceCommand {
  watchId: string;
  evaluatorVersion: typeof SAVED_DEAL_WATCH_VERSION;
  observedAt: string;
  sourceId: string | null;
  state: SavedDealWatchState;
  eventKind: SavedDealWatchEvent["kind"] | null;
  eventVersion: typeof SAVED_DEAL_WATCH_VERSION | null;
  priority: SavedDealWatchEvent["priority"] | null;
  dedupeKey: string | null;
  eventPayload: SavedDealWatchEvent | null;
}

export interface EvaluateSavedDealWatchInput {
  dealId: string;
  title?: string | null;
  address?: string | null;
  values: InvestmentFormValues;
  observation: SavedDealWatchObservation;
  policy: SavedDealWatchPolicy;
  previousCheckpoint?: SavedDealWatchCheckpoint | null;
}

export function buildSavedDealWatchPersistenceCommand(
  watchId: string,
  evaluation: SavedDealWatchEvaluation
): SavedDealWatchPersistenceCommand {
  const event = evaluation.event;
  return {
    watchId,
    evaluatorVersion: evaluation.nextCheckpoint.version,
    observedAt: evaluation.nextCheckpoint.observedAt,
    sourceId: evaluation.nextCheckpoint.sourceId,
    state: evaluation.nextCheckpoint.state,
    eventKind: event?.kind ?? null,
    eventVersion: event?.version ?? null,
    priority: event?.priority ?? null,
    dedupeKey: event?.dedupeKey ?? null,
    eventPayload: event,
  };
}

function usablePrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function usableRate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 30;
}

function usableNonNegative(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : fallback;
}

function resolvePrice(
  observation: SavedDealWatchObservation,
  previous: SavedDealWatchState | null,
  values: InvestmentFormValues
): number {
  if (usablePrice(observation.askingPrice)) return observation.askingPrice;
  if (previous && usablePrice(previous.askingPrice)) return previous.askingPrice;
  return usablePrice(values.purchasePrice) ? values.purchasePrice : 0;
}

function resolveRate(
  observation: SavedDealWatchObservation,
  previous: SavedDealWatchState | null,
  values: InvestmentFormValues
): number {
  if (usableRate(observation.mortgageRatePct)) return observation.mortgageRatePct;
  if (previous && usableRate(previous.mortgageRatePct)) return previous.mortgageRatePct;
  return usableRate(values.interestRate) ? values.interestRate : 0;
}

function buyBoxMetrics(
  values: InvestmentFormValues,
  askingPrice: number,
  result: ReturnType<typeof calculateAnalysis>
): BuyBoxDealMetrics {
  return {
    capRatePct: result.capRate,
    cocPct: result.cocReturn,
    dscr: result.monthlyPayment > 0 ? result.dscr : null,
    cashFlowMonthly: result.netCashFlow,
    purchasePrice: askingPrice,
    propertyType:
      values.propertyType === "single-family" ||
      values.propertyType === "multi-family" ||
      values.propertyType === "owner-occupant"
        ? values.propertyType
        : null,
    state: deriveStateFromAddress(values.address),
    isCashPurchase: result.monthlyPayment <= 0,
  };
}

function unavailableState(askingPrice: number, mortgageRatePct: number): SavedDealWatchState {
  return {
    methodologyVersion: null,
    analysisAvailable: false,
    askingPrice,
    mortgageRatePct,
    maxOffer: null,
    priceToMaxOfferGap: null,
    withinMaxOffer: null,
    buyBoxPass: null,
    buyBoxFailedLabels: [],
    buyBoxChecks: [],
    decisionThresholds: [],
    smallestDecisionGapId: null,
    monthlyCashFlow: null,
    capRatePct: null,
    cocReturnPct: null,
    dscr: null,
  };
}

function buildState(args: {
  values: InvestmentFormValues;
  askingPrice: number;
  mortgageRatePct: number;
  policy: SavedDealWatchPolicy;
}): SavedDealWatchState {
  const { askingPrice, mortgageRatePct, policy } = args;
  if (!usablePrice(askingPrice) || !usableRate(mortgageRatePct)) {
    return unavailableState(askingPrice, mortgageRatePct);
  }

  const values: InvestmentFormValues = {
    ...args.values,
    purchasePrice: askingPrice,
    interestRate: mortgageRatePct,
  };

  try {
    const result = calculateAnalysis(values);
    const mao = policy.maxOfferTarget
      ? calculateMaxAllowableOffer(values, policy.maxOfferTarget)
      : null;
    const whatNeedsToBeTrue = policy.maxOfferTarget
      ? buildWhatNeedsToBeTrue(values, policy.maxOfferTarget)
      : null;
    const maxOffer = mao?.maxPrice ?? null;
    const gap = maxOffer == null ? null : askingPrice - maxOffer;

    const buyBox = policy.buyBoxCriteria
      ? evaluateBuyBox(policy.buyBoxCriteria, buyBoxMetrics(values, askingPrice, result))
      : null;
    const buyBoxActive = Boolean(buyBox?.active);

    return {
      methodologyVersion: result.methodologyVersion ?? null,
      analysisAvailable: true,
      askingPrice,
      mortgageRatePct,
      maxOffer,
      priceToMaxOfferGap: gap,
      withinMaxOffer: maxOffer == null ? null : askingPrice <= maxOffer,
      buyBoxPass: buyBoxActive ? Boolean(buyBox?.passes) : null,
      buyBoxFailedLabels: buyBoxActive ? [...(buyBox?.failedLabels ?? [])] : [],
      buyBoxChecks: buyBoxActive
        ? (buyBox?.checks ?? []).map((check) => ({
            id: check.id,
            label: check.label,
            pass: check.pass,
          }))
        : [],
      decisionThresholds:
        whatNeedsToBeTrue?.thresholds.map((threshold) => ({
          id: threshold.id,
          label: threshold.label,
          status: threshold.status,
          direction: threshold.direction,
          unit: threshold.unit,
          currentValue: threshold.currentValue,
          thresholdValue: threshold.thresholdValue,
          requiredChange: threshold.requiredChange,
          normalizedGapPct: threshold.normalizedGapPct,
          rechecked: threshold.rechecked,
        })) ?? [],
      smallestDecisionGapId: whatNeedsToBeTrue?.smallestNormalizedGap?.id ?? null,
      monthlyCashFlow: result.netCashFlow,
      capRatePct: result.capRate,
      cocReturnPct: result.cocReturn,
      dscr: result.monthlyPayment > 0 ? result.dscr : null,
    };
  } catch {
    return unavailableState(askingPrice, mortgageRatePct);
  }
}

function labelFor(args: Pick<EvaluateSavedDealWatchInput, "title" | "address">): string {
  return args.title?.trim() || args.address?.trim() || "Saved deal";
}

function money(value: number): string {
  const amount = Math.abs(Math.round(value)).toLocaleString("en-US");
  return `${value < 0 ? "-" : ""}$${amount}`;
}

function fingerprintNumber(value: number | null): string {
  return value == null || !Number.isFinite(value) ? "na" : String(Math.round(value * 100));
}

function eventDedupeKey(
  dealId: string,
  kind: WatchEventKind,
  state: SavedDealWatchState
): string {
  // Do not include observedAt: the same unchanged provider payload on every
  // poll must resolve to the same key and remain idempotent.
  return [
    SAVED_DEAL_WATCH_VERSION,
    dealId,
    kind,
    fingerprintNumber(state.askingPrice),
    fingerprintNumber(state.mortgageRatePct),
    fingerprintNumber(state.maxOffer),
    state.buyBoxPass == null ? "na" : state.buyBoxPass ? "pass" : "fail",
  ].join(":");
}

function baseEvent(args: {
  input: EvaluateSavedDealWatchInput;
  kind: WatchEventKind;
  priority: "high" | "normal";
  summary: string;
  before: SavedDealWatchState;
  after: SavedDealWatchState;
}): SavedDealWatchEventBase {
  return {
    version: SAVED_DEAL_WATCH_VERSION,
    kind: args.kind,
    dealId: args.input.dealId,
    label: labelFor(args.input),
    trigger: args.input.observation.trigger,
    observedAt: args.input.observation.observedAt,
    dedupeKey: eventDedupeKey(args.input.dealId, args.kind, args.after),
    priority: args.priority,
    summary: args.summary,
    before: args.before,
    after: args.after,
  };
}

function clearedBuyBoxChecks(
  before: SavedDealWatchState,
  after: SavedDealWatchState
): string[] {
  const prior = new Map(before.buyBoxChecks.map((check) => [check.id, check.pass]));
  return after.buyBoxChecks
    .filter((check) => check.pass === true && prior.get(check.id) === false)
    .map((check) => check.label);
}

/**
 * Determine whether the current lower rate independently caused the Buy Box
 * pass. We hold today's asking price and all current assumptions fixed, then
 * restore only the prior rate. This avoids attributing a simultaneous price
 * cut to financing.
 */
function rateIndependentlyCausedPass(args: {
  input: EvaluateSavedDealWatchInput;
  before: SavedDealWatchState;
  after: SavedDealWatchState;
}): { caused: boolean; counterfactual: SavedDealWatchState | null } {
  const { input, before, after } = args;
  if (
    before.buyBoxPass !== false ||
    after.buyBoxPass !== true ||
    after.mortgageRatePct >= before.mortgageRatePct - 0.005
  ) {
    return { caused: false, counterfactual: null };
  }

  const counterfactual = buildState({
    values: input.values,
    askingPrice: after.askingPrice,
    mortgageRatePct: before.mortgageRatePct,
    policy: input.policy,
  });
  return {
    caused: counterfactual.buyBoxPass === false,
    counterfactual,
  };
}

function buildMeaningfulEvent(
  input: EvaluateSavedDealWatchInput,
  before: SavedDealWatchState,
  after: SavedDealWatchState
): SavedDealWatchEvent | null {
  if (
    input.observation.trigger === "initial" ||
    !before.analysisAvailable ||
    !after.analysisAvailable
  ) {
    return null;
  }

  // Priority 1: a lower rate independently clears the Buy Box. Suppress the
  // generic Buy Box event so one observation creates one notification.
  const ratePass = rateIndependentlyCausedPass({ input, before, after });
  if (ratePass.caused) {
    const comparison = ratePass.counterfactual ?? before;
    const cleared = clearedBuyBoxChecks(comparison, after);
    return {
      ...baseEvent({
        input,
        kind: "rate_driven_buy_box_pass",
        priority: "high",
        summary: `Financing improved enough that ${labelFor(input)} now meets your Buy Box.`,
        before,
        after,
      }),
      kind: "rate_driven_buy_box_pass",
      priority: "high",
      previousRatePct: before.mortgageRatePct,
      currentRatePct: after.mortgageRatePct,
      clearedChecks: cleared,
    };
  }

  // Priority 2: asking price is now at/below the freshly solved Max Offer.
  if (
    before.withinMaxOffer === false &&
    after.withinMaxOffer === true &&
    before.priceToMaxOfferGap != null &&
    after.priceToMaxOfferGap != null
  ) {
    return {
      ...baseEvent({
        input,
        kind: "newly_within_max_offer",
        priority: "high",
        summary: `${labelFor(input)} is now within your Max Offer.`,
        before,
        after,
      }),
      kind: "newly_within_max_offer",
      priority: "high",
      previousGap: before.priceToMaxOfferGap,
      currentGap: after.priceToMaxOfferGap,
    };
  }

  // Priority 3: another meaningful input (usually a price/rent/profile
  // update) takes the whole Buy Box from fail to pass.
  if (before.buyBoxPass === false && after.buyBoxPass === true) {
    return {
      ...baseEvent({
        input,
        kind: "newly_within_buy_box",
        priority: "high",
        summary: `${labelFor(input)} now meets your Buy Box.`,
        before,
        after,
      }),
      kind: "newly_within_buy_box",
      priority: "high",
      previousFailedLabels: [...before.buyBoxFailedLabels],
    };
  }

  // Priority 4: the signed asking-price-to-Max-Offer gap moved materially,
  // even if it did not cross zero. Require BOTH a dollar floor and a relative
  // floor by using their maximum; this keeps high-price markets from becoming
  // noisy while retaining a $5k floor for ordinary deals.
  const beforeGap = before.priceToMaxOfferGap;
  const afterGap = after.priceToMaxOfferGap;
  if (beforeGap != null && afterGap != null) {
    const absoluteChange = Math.abs(afterGap - beforeGap);
    const dollars = usableNonNegative(
      input.policy.materialGapChangeDollars,
      DEFAULT_MATERIAL_GAP_CHANGE_DOLLARS
    );
    const pct = usableNonNegative(
      input.policy.materialGapChangePct,
      DEFAULT_MATERIAL_GAP_CHANGE_PCT
    );
    const materialFloor = Math.max(dollars, Math.abs(before.askingPrice) * pct);
    if (absoluteChange >= materialFloor) {
      const direction = afterGap < beforeGap ? "improved" : "worsened";
      return {
        ...baseEvent({
          input,
          kind: "material_price_gap_change",
          priority: "normal",
          summary: `${labelFor(input)}'s price-to-Max-Offer gap ${direction} by ${money(
            absoluteChange
          )}.`,
          before,
          after,
        }),
        kind: "material_price_gap_change",
        priority: "normal",
        previousGap: beforeGap,
        currentGap: afterGap,
        gapChangeDollars: absoluteChange,
        direction,
      };
    }
  }

  return null;
}

/**
 * Re-underwrite one saved opportunity and emit at most one meaningful event.
 * The function never throws for an invalid calculation; it returns an
 * unavailable state and no event so a bad provider row cannot create an alert.
 */
export function evaluateSavedDealWatch(
  input: EvaluateSavedDealWatchInput
): SavedDealWatchEvaluation {
  const previous =
    input.previousCheckpoint?.version === SAVED_DEAL_WATCH_VERSION &&
    input.previousCheckpoint.dealId === input.dealId
      ? input.previousCheckpoint.state
      : null;

  const askingPrice = resolvePrice(input.observation, previous, input.values);
  const mortgageRatePct = resolveRate(input.observation, previous, input.values);
  const current = buildState({
    values: input.values,
    askingPrice,
    mortgageRatePct,
    policy: input.policy,
  });

  const nextCheckpoint: SavedDealWatchCheckpoint = {
    version: SAVED_DEAL_WATCH_VERSION,
    dealId: input.dealId,
    observedAt: input.observation.observedAt,
    sourceId: input.observation.sourceId?.trim() || null,
    state: current,
  };

  return {
    previous,
    current,
    event: previous ? buildMeaningfulEvent(input, previous, current) : null,
    nextCheckpoint,
  };
}
