/**
 * TrueCap decision-system analytics contract.
 *
 * Every event introduced by the Product Overhaul declares an owner, a privacy
 * classification, and an exact property allowlist. Financial values, exact
 * addresses, contact data, document contents, and share capabilities are not
 * valid analytics dimensions. This module is runtime-enforced by both the
 * browser and server PostHog wrappers.
 */

export type AnalyticsPrivacyClass =
  | "anonymous-aggregate"
  | "account-aggregate"
  | "operational-no-customer-data";

export type AnalyticsEventDefinition = {
  owner: "growth" | "product" | "billing" | "professional" | "data-quality";
  privacy: AnalyticsPrivacyClass;
  allowedProperties: readonly string[];
};

const define = (
  owner: AnalyticsEventDefinition["owner"],
  privacy: AnalyticsPrivacyClass,
  allowedProperties: readonly string[] = []
): AnalyticsEventDefinition => ({ owner, privacy, allowedProperties });

export const ANALYTICS_EVENT_DICTIONARY = {
  analysis_started: define("growth", "anonymous-aggregate", ["property_type", "input_method", "is_authenticated"]),
  property_input_method_selected: define("growth", "anonymous-aggregate", ["method"]),
  analysis_completed: define("growth", "anonymous-aggregate", ["property_type", "verdict", "is_cash_purchase", "input_tab"]),
  second_unique_property_analyzed: define("growth", "account-aggregate", ["period"]),
  buy_box_created: define("product", "account-aggregate", ["source", "is_default", "has_strategy"]),
  material_assumption_overridden: define("product", "anonymous-aggregate", ["source", "field_group"]),
  material_input_verified: define("product", "account-aggregate", ["field_key", "evidence_level", "method_version"]),
  activation_completed: define("product", "account-aggregate", ["definition_version"]),

  decision_viewed: define("product", "anonymous-aggregate", ["property_type"]),
  offer_ceiling_viewed: define("product", "anonymous-aggregate", ["target_source", "access_level", "decision_readiness", "has_feasible"]),
  binding_constraint_viewed: define("product", "anonymous-aggregate", ["constraint", "target_source"]),
  verification_task_created: define("product", "account-aggregate", ["field_key", "priority"]),
  verification_task_completed: define("product", "account-aggregate", ["field_key", "evidence_level"]),
  decision_recorded: define("product", "account-aggregate", ["decision"]),
  comparison_completed: define("product", "account-aggregate", ["count_bucket"]),
  shortlist_item_promoted: define("product", "account-aggregate", ["source"]),

  paywall_viewed: define("billing", "anonymous-aggregate", ["trigger", "placement"]),
  complete_decision_trial_started: define("billing", "account-aggregate"),
  complete_decision_trial_completed: define("billing", "account-aggregate"),
  complete_decision_checkout_started: define("billing", "anonymous-aggregate", ["source"]),
  complete_decision_purchased: define("billing", "account-aggregate"),
  upgrade_credit_applied: define("billing", "account-aggregate", ["destination_plan"]),
  subscription_checkout_started: define("billing", "account-aggregate", ["plan", "interval"]),
  subscription_started: define("billing", "account-aggregate", ["plan", "interval", "trial_granted"]),
  subscription_activated: define("billing", "account-aggregate", ["plan", "interval", "trial_granted"]),
  plan_changed: define("billing", "account-aggregate", ["from_plan", "to_plan", "effective_timing"]),
  subscription_cancelled: define("billing", "account-aggregate", ["plan", "effective_timing"]),

  decision_memo_generated: define("product", "account-aggregate", ["surface", "audience", "methodology_version"]),
  share_created: define("product", "anonymous-aggregate", ["audience", "address_included"]),
  share_viewed: define("growth", "anonymous-aggregate", ["address_included", "share_format"]),
  share_revoked: define("product", "account-aggregate"),
  shared_scenario_forked: define("product", "account-aggregate"),
  client_decision_assigned: define("professional", "account-aggregate", ["role"]),
  client_decision_approved: define("professional", "account-aggregate", ["decision"]),

  data_lookup_started: define("data-quality", "operational-no-customer-data", ["provider", "lookup_type"]),
  data_lookup_succeeded: define("data-quality", "operational-no-customer-data", ["provider", "lookup_type", "evidence_level"]),
  data_lookup_failed: define("data-quality", "operational-no-customer-data", ["provider", "lookup_type", "failure_class"]),
  evidence_grade_changed: define("data-quality", "account-aggregate", ["field_key", "from_grade", "to_grade"]),
  decision_readiness_changed: define("product", "account-aggregate", ["from_stage", "to_stage", "method_version"]),
  material_change_detected: define("product", "account-aggregate", ["change_type"]),
  calculation_parity_failed: define("data-quality", "operational-no-customer-data", ["surface", "methodology_version", "failure_class"]),
} as const satisfies Record<string, AnalyticsEventDefinition>;

export type DocumentedAnalyticsEvent = keyof typeof ANALYTICS_EVENT_DICTIONARY;

const ALWAYS_BLOCKED_KEYS = new Set([
  "address",
  "email",
  "phone",
  "name",
  "rent",
  "purchase_price",
  "tax_amount",
  "document_name",
  "document_contents",
  "report_contents",
  "share_token",
  "client_name",
]);

function isAlwaysBlockedAnalyticsKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return (
    ALWAYS_BLOCKED_KEYS.has(normalized) ||
    normalized === "id" ||
    normalized.endsWith("_id") ||
    normalized.endsWith("_token") ||
    normalized.endsWith("_secret") ||
    normalized === "token" ||
    normalized === "secret"
  );
}

function safeScalar(value: unknown): value is string | number | boolean | null {
  return value == null || ["string", "number", "boolean"].includes(typeof value);
}

/** Apply the exact allowlist for documented events and a sensitive-key denylist
 * to the legacy namespace. Nested objects/arrays are never accepted. */
export function sanitizeAnalyticsEventProperties(
  event: string,
  properties?: Record<string, unknown> | null
): Record<string, string | number | boolean | null> | undefined {
  if (!properties) return undefined;
  const definition = ANALYTICS_EVENT_DICTIONARY[event as DocumentedAnalyticsEvent];
  const allowed = definition ? new Set<string>(definition.allowedProperties) : null;
  const entries = Object.entries(properties).filter(
    ([key, value]) =>
      !isAlwaysBlockedAnalyticsKey(key) &&
      (!allowed || allowed.has(key)) &&
      safeScalar(value)
  );
  return entries.length > 0
    ? (Object.fromEntries(entries) as Record<string, string | number | boolean | null>)
    : undefined;
}

/** North-star definition used by analytics and product reporting. */
export const DECISION_READY_ANALYSIS_DEFINITION = {
  version: "1.0",
  metric: "decision-ready analyses per active acquisition account per month",
  requires: [
    "unique_property",
    "selected_buy_box",
    "offer_ceiling_reviewed",
    "material_evidence_reviewed",
    "decision_recorded",
  ],
} as const;
