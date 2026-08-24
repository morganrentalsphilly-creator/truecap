import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ANALYTICS_EVENT_DICTIONARY,
  sanitizeAnalyticsEventProperties,
} from "@/lib/analytics-event-dictionary";

const REQUIRED_PRODUCT_EVENTS = [
  "target_context_set",
  "material_input_reviewed",
  "material_input_verified",
  "evidence_readiness_changed",
  "offer_ceiling_viewed",
  "decision_recorded",
  "memo_generated",
  "share_created",
  "share_viewed",
  "recipient_assumption_challenged",
  "recipient_evidence_requested",
  "recipient_scenario_forked",
  "recipient_response_recorded",
  "second_unique_property",
  "return_within_7d",
  "advocacy_prompt_shown",
  "quote_submitted",
  "referral_converted",
] as const;

const REQUIRED_OPERATIONAL_EVENTS = [
  "calculation_parity_failed",
  "provider_fallback_used",
  "model_version_mismatch",
  "historical_snapshot_mutation",
  "migration_backfill_progress",
  "webhook_reconciliation_failed",
  "entitlement_divergence",
  "paid_memo_fulfillment_failed",
  "share_authorization_failed",
] as const;

describe("advocacy analytics privacy contract", () => {
  it("registers the requested product and operational vocabulary", () => {
    for (const event of [...REQUIRED_PRODUCT_EVENTS, ...REQUIRED_OPERATIONAL_EVENTS]) {
      expect(ANALYTICS_EVENT_DICTIONARY[event], event).toBeDefined();
    }
  });

  it("never allowlists direct identifiers, bearer capabilities, or deal values", () => {
    const forbiddenExact = new Set([
      "address",
      "email",
      "phone",
      "name",
      "price",
      "purchase_price",
      "rent",
      "amount",
      "deal_amount",
      "document_name",
      "document_contents",
      "report_text",
      "report_contents",
      "notes",
      "provider_payload",
    ]);
    for (const event of [...REQUIRED_PRODUCT_EVENTS, ...REQUIRED_OPERATIONAL_EVENTS]) {
      expect(
        ANALYTICS_EVENT_DICTIONARY[event].allowedProperties.filter((key) =>
          forbiddenExact.has(key) ||
          key === "id" ||
          key.endsWith("_id") ||
          key === "token" ||
          key.endsWith("_token") ||
          key === "secret" ||
          key.endsWith("_secret")
        ),
        event
      ).toEqual([]);
    }
  });

  it("drops raw deal data and tokens even when a caller attempts to attach them", () => {
    expect(
      sanitizeAnalyticsEventProperties("target_context_set", {
        model_version: "1.0",
        rule_set_version: "screening-defaults-v1",
        target_source: "screening-defaults",
        surface: "focused_decision_summary",
        address: "Private address",
        purchase_price: 300_000,
        rent: 2_500,
        report_contents: "private",
        share_token: "bearer-capability",
        customer_id: "cus_private",
      })
    ).toEqual({
      model_version: "1.0",
      rule_set_version: "screening-defaults-v1",
      target_source: "screening-defaults",
      surface: "focused_decision_summary",
    });
  });

  it("never sends a financial target fingerprint as the rule-set dimension", () => {
    for (const file of [
      "components/investcalc/focused-decision-summary.tsx",
      "components/investcalc/investcalc-page.tsx",
    ]) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source).not.toMatch(
        /rule_set_version:\s*(?:reportTargetContext|targetContext)\.rulesSnapshotVersion/
      );
    }
  });
});
