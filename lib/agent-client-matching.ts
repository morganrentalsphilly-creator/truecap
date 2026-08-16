/**
 * Future Agent Pro client matching.
 *
 * Pure and deliberately advisory: it ranks a deal against the Buy Boxes that
 * are explicitly tied to clients, but it never assigns a deal, sends a
 * message, or reads PII. Callers get opaque client ids and transparent check
 * counts so a future UI can explain every suggestion before an agent acts.
 *
 * The feature is dark by default through `agent_client_matching`. Keeping the
 * flag check inside the evaluator prevents an accidental caller from exposing
 * suggestions before the rollout has been approved.
 */

import {
  buyBoxHasCriteria,
  evaluateBuyBox,
  type BuyBoxDealMetrics,
  type NamedBuyBox,
} from "@/lib/buy-box";
import {
  featureFlags,
  isFeatureEnabled,
  type FeatureFlagState,
} from "@/lib/feature-flags";

export type AgentClientMatchStatus =
  | "match"
  | "partial"
  | "miss"
  | "insufficient-data";

export type AgentClientMatch = {
  /** Opaque roster id only. Names, email addresses, and phone numbers never
   * enter this evaluator or its eventual analytics. */
  clientId: string;
  buyBoxId: string;
  status: AgentClientMatchStatus;
  matchedCheckCount: number;
  failedCheckCount: number;
  skippedCheckCount: number;
  failedLabels: string[];
  personalLine: string | null;
};

function statusForCounts(
  matchedCheckCount: number,
  failedCheckCount: number
): AgentClientMatchStatus {
  const applicable = matchedCheckCount + failedCheckCount;
  if (applicable === 0) return "insufficient-data";
  if (failedCheckCount === 0) return "match";
  if (matchedCheckCount > 0) return "partial";
  return "miss";
}

const STATUS_RANK: Record<AgentClientMatchStatus, number> = {
  match: 0,
  partial: 1,
  miss: 2,
  "insufficient-data": 3,
};

/**
 * Best-first ordering with no hidden model score:
 * exact matches → partial matches → misses → insufficient data, then fewer
 * failed checks, more matched checks, fewer skipped checks, stable ids.
 */
function compareMatches(a: AgentClientMatch, b: AgentClientMatch): number {
  return (
    STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
    a.failedCheckCount - b.failedCheckCount ||
    b.matchedCheckCount - a.matchedCheckCount ||
    a.skippedCheckCount - b.skippedCheckCount ||
    a.clientId.localeCompare(b.clientId) ||
    a.buyBoxId.localeCompare(b.buyBoxId)
  );
}

/**
 * Evaluate one deal against every active, client-specific Buy Box and return
 * at most one (the best) transparent result per client.
 *
 * Agent-owned boxes (`clientId == null`) are intentionally ignored: they can
 * screen deals for the agent, but cannot distinguish which buyer is a match.
 */
export function evaluateAgentClientMatches(
  metrics: BuyBoxDealMetrics,
  boxes: NamedBuyBox[],
  flags: FeatureFlagState = featureFlags
): AgentClientMatch[] {
  if (!isFeatureEnabled("agent_client_matching", flags)) return [];

  const bestByClient = new Map<string, AgentClientMatch>();

  for (const box of boxes) {
    if (!box.clientId || !box.isActive || !buyBoxHasCriteria(box)) continue;

    const result = evaluateBuyBox(box, metrics);
    const skippedCheckCount = result.checks.filter((check) => check.pass === null).length;
    const match: AgentClientMatch = {
      clientId: box.clientId,
      buyBoxId: box.id,
      status: statusForCounts(result.passedCount, result.failedCount),
      matchedCheckCount: result.passedCount,
      failedCheckCount: result.failedCount,
      skippedCheckCount,
      failedLabels: result.failedLabels,
      personalLine: result.personalLine,
    };

    const current = bestByClient.get(box.clientId);
    if (!current || compareMatches(match, current) < 0) {
      bestByClient.set(box.clientId, match);
    }
  }

  return [...bestByClient.values()].sort(compareMatches);
}
