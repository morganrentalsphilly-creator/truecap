/**
 * Exact compatibility allowlists for events still emitted outside the
 * canonical passive-growth funnel. Keep these registered until their callers
 * are migrated; an event absent from both registries fails closed.
 */

type Owner = "growth" | "product" | "billing" | "professional";
type Privacy = "anonymous-aggregate" | "account-aggregate";

const define = (
  owner: Owner,
  privacy: Privacy,
  allowedProperties: readonly string[] = [],
) => ({ owner, privacy, allowedProperties });

const growth = (properties: readonly string[] = []) =>
  define("growth", "anonymous-aggregate", properties);
const growthAccount = (properties: readonly string[] = []) =>
  define("growth", "account-aggregate", properties);
const product = (properties: readonly string[] = []) =>
  define("product", "anonymous-aggregate", properties);
const productAccount = (properties: readonly string[] = []) =>
  define("product", "account-aggregate", properties);
const billing = (properties: readonly string[] = []) =>
  define("billing", "anonymous-aggregate", properties);
const billingAccount = (properties: readonly string[] = []) =>
  define("billing", "account-aggregate", properties);
const professional = (properties: readonly string[] = []) =>
  define("professional", "anonymous-aggregate", properties);
const professionalAccount = (properties: readonly string[] = []) =>
  define("professional", "account-aggregate", properties);

export const ACTIVE_ANALYTICS_EVENT_DEFINITIONS = {
  hero_address_started: growth(),
  hero_sample_clicked: growth(),
  hero_sample_opened: growth(),
  address_selected: growth(["has_state"]),
  analyzer_autofill_completed: product(["property_type", "fields_filled"]),
  assumptions_opened: product(["source"]),
  assumptions_updated: product(["source"]),
  analysis_saved_after_signup: growthAccount(["property_type"]),
  signup_started: growth(["method", "placement"]),
  signup_prompt_viewed: growth(["placement"]),
  buy_box_saved: productAccount([
    "source",
    "is_new",
    "is_default",
    "has_strategy",
  ]),
  buy_box_result_viewed: productAccount(["passes"]),
  agent_client_created: professionalAccount(["source"]),
  agent_pro_page_viewed: professional(["path"]),
  client_report_shared: professionalAccount(["report_type"]),
  assumption_verified: productAccount([
    "field_key",
    "source_class",
    "method_version",
  ]),
  confidence_increased: productAccount([
    "from_band",
    "to_band",
    "method_version",
  ]),
  input_confidence_viewed: product([
    "score_band",
    "stage",
    "sensitivity_risk",
    "method_version",
  ]),
  offer_ready_reached: productAccount(["method_version", "confidence_band"]),
  what_needs_to_be_true_viewed: product(["lever_count", "target_basis"]),
  verdict_viewed: product(["decision_tone", "is_cash_purchase"]),
  deal_fit_viewed: product(["score_band", "methodology_version"]),
  deep_analysis_opened: product(["row"]),
  targets_opened: product(["placement"]),
  tune_targets_opened: product(),
  stress_test_opened: product(["placement"]),
  downside_viewed: product(["placement"]),
  comparison_started: productAccount(["source"]),
  deal_compared: productAccount(["source"]),
  shortlist_screened: productAccount(["rows"]),
  financing_profile_created: productAccount(["loan_type"]),
  financing_profile_applied: productAccount(["loan_type", "age_band"]),
  pipeline_stage_changed: productAccount([
    "from_stage",
    "to_stage",
    "moved_to_offer_ready",
  ]),
  saved_deal_watch_enabled: productAccount(["trigger_count"]),
  scenario_added: productAccount(["has_strategy", "strategy_kind"]),
  scenarios_compared: productAccount(["count"]),
  strategy_selected: product(["strategy", "source", "assumptionMode"]),
  optional_section_opened: product(["source"]),
  onboarding_step_completed: productAccount([
    "step_id",
    "step_number",
    "track",
    "completion_source",
  ]),
  deal_qa_asked: productAccount(["question_length"]),
  deal_summary_generated: productAccount(),
  prepare_my_offer_clicked: productAccount(["offer_ready_stage"]),
  upgrade_cta_click: billing(["feature", "placement"]),
  upsell_prompt_shown: billing(["feature", "placement"]),
  upsell_prompt_clicked: billing(["feature", "placement"]),
  max_offer_teaser_viewed: billing(["placement", "decision_tone"]),
  max_offer_unlock_clicked: billing(["placement"]),
  max_offer_unlocked: billingAccount(["placement"]),
  max_offer_view_attempted: billing(["placement"]),
  max_offer_viewed: product(["has_offer", "tier"]),
  pricing_view: billing(["path"]),
  pricing_viewed: billing(["path"]),
  checkout_returned: billingAccount(["plan_tier"]),
  checkout_abandoned: billingAccount(),
  deal_decision_pack_started: billingAccount(["source", "methodology_version"]),
  deal_decision_pack_purchased: billingAccount(["price_variant"]),
  one_time_pdf_purchased: billingAccount(),
  single_deal_purchased: billingAccount(["price_variant"]),
  single_deal_checkout_completed: billingAccount(["price_variant"]),
  pack_credit_offer_shown: billingAccount(),
  report_generated: product(["report_type"]),
  sample_pro_preview_viewed: product(["property_type"]),
  share_link_copied: growth(["has_address"]),
  embed_loaded: growth(["calculator_slug"]),
  embed_code_copied: growth(["calculator_slug"]),
  calculator_started: growth(["calculator"]),
  calculator_completed: growth(["calculator"]),
  email_capture_shown: growth(["source", "address_present"]),
  email_capture_submitted: growth([
    "source",
    "address_present",
    "scheduled_count",
  ]),
  email_capture_dismissed: growth(["source"]),
  newsletter_subscribed: growth(["source"]),
  guarantee_viewed: growth(["guarantee", "placement"]),
  testimonial_prompt_shown: growthAccount(["source"]),
  testimonial_prompt_submitted: growthAccount(["source", "consented"]),
  testimonial_prompt_dismissed: growthAccount(["via"]),
  lead_form_shown: professional(["owner_present"]),
  lead_captured: professional(["has_message"]),
} as const;
