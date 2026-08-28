/**
 * Product-access policy for the no-card evaluation.
 *
 * This module is deliberately pure. Database readers, server actions, pricing
 * cards, and tests all feed the same small record shape into one resolver, so
 * access transitions cannot drift across surfaces.
 */

export const PRODUCT_EVALUATION_DAYS = 21;
export const PRODUCT_EVALUATION_DEAL_LIMIT = 3;
export const PRODUCT_EVALUATION_COMPARISON_LIMIT = 1;

export type ProductEvaluationRecord = {
  startedAt: string | Date;
  expiresAt: string | Date;
  dealsUsed: number;
  comparisonsUsed: number;
};

export type SubscriptionAccessRecord = {
  planSlug: string;
  status: string;
  currentPeriodEnd?: string | Date | null;
  cancelAtPeriodEnd?: boolean;
};

export type DecisionPackAccessRecord = {
  resourceKey: string;
  expiresAt?: string | Date | null;
};

export type ProductAccessKind =
  | "anonymous_first_decision"
  | "free"
  | "evaluation"
  | "evaluation_expired"
  | "investor_pro_monthly"
  | "investor_pro_annual"
  | "agent_pro_monthly"
  | "agent_pro_annual"
  | "paid_access_ending"
  | "returning_free"
  | "decision_pack";

export type ProductAccessState = {
  kind: ProductAccessKind;
  isAuthenticated: boolean;
  hasPaidAccess: boolean;
  hasAgentAccess: boolean;
  canAnalyzeDecision: boolean;
  canAnalyzeProDeal: boolean;
  canRunComparison: boolean;
  canExportDecisionPack: boolean;
  dealsRemaining: number;
  comparisonsRemaining: number;
  evaluationExpiresAt: Date | null;
  decisionPackResourceKey: string | null;
};

const LIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due"]);

function asDate(value: string | Date | null | undefined): Date | null {
  if (value == null) return null;
  const parsed = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function clampUsage(value: number, limit: number): number {
  if (!Number.isFinite(value)) return limit;
  return Math.min(limit, Math.max(0, Math.floor(value)));
}

function paidKind(subscription: SubscriptionAccessRecord): ProductAccessKind {
  const isAgent = subscription.planSlug.startsWith("agent_pro");
  const isAnnual = subscription.planSlug.endsWith("_annual");
  if (subscription.cancelAtPeriodEnd) return "paid_access_ending";
  if (isAgent) return isAnnual ? "agent_pro_annual" : "agent_pro_monthly";
  return isAnnual ? "investor_pro_annual" : "investor_pro_monthly";
}

export function resolveProductAccessState(input: {
  isAuthenticated: boolean;
  now?: string | Date;
  subscription?: SubscriptionAccessRecord | null;
  evaluation?: ProductEvaluationRecord | null;
  hasSubscriptionHistory?: boolean;
  decisionPack?: DecisionPackAccessRecord | null;
}): ProductAccessState {
  const now = asDate(input.now) ?? new Date();
  const subscription = input.subscription ?? null;
  if (subscription && LIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
    const hasAgentAccess = subscription.planSlug.startsWith("agent_pro");
    return {
      kind: paidKind(subscription),
      isAuthenticated: true,
      hasPaidAccess: true,
      hasAgentAccess,
      canAnalyzeDecision: true,
      canAnalyzeProDeal: true,
      canRunComparison: true,
      canExportDecisionPack: true,
      dealsRemaining: Number.POSITIVE_INFINITY,
      comparisonsRemaining: Number.POSITIVE_INFINITY,
      evaluationExpiresAt: null,
      decisionPackResourceKey: null,
    };
  }

  if (!input.isAuthenticated) {
    return {
      kind: "anonymous_first_decision",
      isAuthenticated: false,
      hasPaidAccess: false,
      hasAgentAccess: false,
      canAnalyzeDecision: true,
      canAnalyzeProDeal: true,
      canRunComparison: false,
      // The server binds this to the browser's one exact no-signup deal. It is
      // not a reusable or caller-selected PDF entitlement.
      canExportDecisionPack: true,
      dealsRemaining: 1,
      comparisonsRemaining: 0,
      evaluationExpiresAt: null,
      decisionPackResourceKey: null,
    };
  }

  const evaluation = input.evaluation ?? null;
  const evaluationExpiry = asDate(evaluation?.expiresAt);
  if (evaluation && evaluationExpiry) {
    const dealsUsed = clampUsage(evaluation.dealsUsed, PRODUCT_EVALUATION_DEAL_LIMIT);
    const comparisonsUsed = clampUsage(
      evaluation.comparisonsUsed,
      PRODUCT_EVALUATION_COMPARISON_LIMIT
    );
    const dealsRemaining = PRODUCT_EVALUATION_DEAL_LIMIT - dealsUsed;
    const comparisonsRemaining = PRODUCT_EVALUATION_COMPARISON_LIMIT - comparisonsUsed;
    const timeActive = now.getTime() < evaluationExpiry.getTime();
    if (timeActive) {
      return {
        kind: "evaluation",
        isAuthenticated: true,
        hasPaidAccess: false,
        hasAgentAccess: false,
        canAnalyzeDecision: true,
        canAnalyzeProDeal: dealsRemaining > 0,
        canRunComparison: comparisonsRemaining > 0,
        // Export remains available for already-metered deals throughout the
        // 21-day window. The PDF action independently binds authorization to
        // the exact deal resource key, so this does not create extra runs.
        canExportDecisionPack: true,
        dealsRemaining,
        comparisonsRemaining,
        evaluationExpiresAt: evaluationExpiry,
        decisionPackResourceKey: null,
      };
    }
    return {
      kind: "evaluation_expired",
      isAuthenticated: true,
      hasPaidAccess: false,
      hasAgentAccess: false,
      canAnalyzeDecision: true,
      canAnalyzeProDeal: false,
      canRunComparison: false,
      canExportDecisionPack: false,
      dealsRemaining,
      comparisonsRemaining,
      evaluationExpiresAt: evaluationExpiry,
      decisionPackResourceKey: null,
    };
  }

  const packExpiry = asDate(input.decisionPack?.expiresAt);
  const packIsActive = Boolean(
    input.decisionPack && (!packExpiry || now.getTime() < packExpiry.getTime())
  );
  if (packIsActive && input.decisionPack) {
    return {
      kind: "decision_pack",
      isAuthenticated: true,
      hasPaidAccess: false,
      hasAgentAccess: false,
      canAnalyzeDecision: true,
      canAnalyzeProDeal: false,
      canRunComparison: false,
      canExportDecisionPack: true,
      dealsRemaining: 0,
      comparisonsRemaining: 0,
      evaluationExpiresAt: null,
      decisionPackResourceKey: input.decisionPack.resourceKey,
    };
  }

  return {
    kind: input.hasSubscriptionHistory ? "returning_free" : "free",
    isAuthenticated: true,
    hasPaidAccess: false,
    hasAgentAccess: false,
    canAnalyzeDecision: true,
    canAnalyzeProDeal: false,
    canRunComparison: false,
    canExportDecisionPack: false,
    dealsRemaining: 0,
    comparisonsRemaining: 0,
    evaluationExpiresAt: evaluationExpiry,
    decisionPackResourceKey: null,
  };
}
