"use server";

/**
 * Server-side composition of the investment PDF — and the ONLY place the
 * export gate is actually enforced.
 *
 * ─── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * The report used to be built entirely in the browser: the Export button
 * checked `canExportPdf` in React and then called lib/pdf-generator directly.
 * A gate that lives in the client is not a gate. Anyone could flip the prop in
 * devtools, or import the generator module out of the page bundle and call it,
 * and receive the full paid report without an entitlement or a purchase.
 *
 * Composing the document here moves the entitlement check to the server,
 * where the caller cannot reach it. That became possible once
 * lib/pdf-generator stopped depending on a DOM (chart.js on a <canvas> →
 * lib/pdf/vector-charts, and the canvas logo round-trip → lib/pdf/load-image).
 *
 * ─── WHO IS ALLOWED ─────────────────────────────────────────────────────────
 *   1. A signed-in user whose plan carries the `pdf_export` feature, or
 *   2. Anyone recovering a valid, unexpired historical one-time paid claim
 *      whose secret and deal fingerprint both match the ledger.
 *
 * Everyone else gets ENTITLEMENT_REQUIRED and no bytes.
 *
 * ─── PROVENANCE ────────────────────────────────────────────────────────────
 * Raw form values are validated and every deterministic report figure is
 * rebuilt on this server through the canonical calculation engines. The
 * browser report object is retained only for bounded presentation evidence;
 * its financial figures and methodology labels never reach the renderer.
 */

import { z } from "zod";
import { reportDataSchema } from "@/lib/report-payload-schema";
import * as Sentry from "@sentry/nextjs";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { retrieveDecisionPackStripeAccess } from "@/lib/stripe/decision-pack-access";
import { getEntitlementsForUser, hasPlanFeature } from "@/lib/entitlements";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import {
  normalizeReleasedInvestmentFormSnapshot,
  releasedInvestmentFormSchema,
} from "@/lib/underwriting-model-release";
import {
  claimSecretMatches,
  fingerprintOneTimePdfDeal,
  fingerprintOneTimePdfReportBinding,
  isOneTimePdfRecoveryAllowed,
} from "@/lib/one-time-pdf-claims";
import { createIpRateLimit, getRequestIp } from "@/lib/ip-rate-limit";
import type { ReportMode } from "@/lib/pdf-export-constants";
import { buildCanonicalReportData } from "@/lib/report-data-builder";
import {
  isLegacySavedMethodologyVersion,
  resolveSavedAnalysisResult,
} from "@/lib/saved-analysis-methodology";
import { calculateAnalysis } from "@/lib/calc-analysis";
import {
  buildDealScoreInputFromAnalysis,
  computeDealScore,
} from "@/lib/deal-score";
import {
  normalizeOfferCeilingTargetSource,
} from "@/lib/offer-ceiling-contract";
import {
  resolveLegacyCompatibleOneTimePdfReportBinding,
  resolveOneTimePdfReportBinding,
} from "@/lib/one-time-pdf-report-binding";

export type GenerateReportPdfResult =
  | {
      ok: true;
      filename: string;
      pdfBase64: string;
      hasBranding: boolean;
      hasBuyBoxVerdict: boolean;
      buyBoxStateResolved: boolean;
    }
  | {
      ok: false;
      code:
        | "SIGN_IN_REQUIRED"
        | "ENTITLEMENT_REQUIRED"
        | "VALIDATION_ERROR"
        | "RATE_LIMITED"
        | "FROZEN_METHODOLOGY"
        | "STALE_EXPORT"
        | "SERVER_ERROR";
      message: string;
    };

// ── Payload validation ──────────────────────────────────────────────────────

const inputSchema = z
  .object({
    values: releasedInvestmentFormSchema,
    // Legacy callers may still send this display payload, but the server
    // discards it and rebuilds every financial output. New callers omit it so
    // paid Offer Ceiling math never has to run in the browser.
    report: reportDataSchema.optional(),
    maxOfferTarget: z.unknown().optional(),
    maxOfferTargetSource: z
      .enum(["buy-box", "screening-defaults", "selected-targets"])
      .optional(),
    savedExport: z
      .object({
        id: z.string().uuid(),
        renderFingerprint: z.string().regex(/^[a-f0-9]{32}$/),
      })
      .strict()
      .optional(),
    mode: z
      .enum(["personal", "lender", "partner", "agent"])
      .default("personal"),
    /** Historical paid-claim recovery; new one-time checkout is disabled. */
    claim: z
      .object({
        id: z.string().uuid(),
        secret: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
        values: releasedInvestmentFormSchema,
      })
      .optional(),
  })
  .strict();

// ── Abuse brake ─────────────────────────────────────────────────────────────

/**
 * Rendering a report is the most expensive thing an authenticated user can ask
 * this app to do on demand. A human exports a handful per session; this cap is
 * far above that and exists so a script cannot pin a serverless instance.
 */
const pdfRateLimit = createIpRateLimit({
  windowMs: 60 * 60 * 1000,
  maxPerWindow: 60,
});

// ── Gate ────────────────────────────────────────────────────────────────────

type GateOutcome =
  | { allowed: true }
  | { allowed: false; result: GenerateReportPdfResult };

/**
 * Verify a historical one-time paid claim WITHOUT consuming it.
 *
 * Consumption is verifyOneTimePdfPaymentAction's job and already happened
 * before the client ever got here; re-consuming would break the documented
 * 24-hour re-download recovery window. This only answers "does this caller
 * genuinely hold a paid claim for this deal?"
 */
async function claimGrantsExport(
  claim: {
    id: string;
    secret: string;
    values: z.infer<typeof releasedInvestmentFormSchema>;
  },
  valuesToRender: z.infer<typeof releasedInvestmentFormSchema>,
  rawMaxOfferTarget: unknown,
  rawMaxOfferTargetSource: unknown,
): Promise<boolean> {
  try {
    const submittedReportBinding = resolveOneTimePdfReportBinding(
      {
        values: valuesToRender,
        maxOfferTarget: rawMaxOfferTarget,
        maxOfferTargetSource: rawMaxOfferTargetSource,
      },
      { allowLegacyDefault: true }
    );
    if (!submittedReportBinding) return false;

    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from("one_time_pdf_purchase_claims")
      .select(
        "checkout_session_id, claim_secret_hash, deal_fingerprint, report_fingerprint, user_id, consumed_at, expires_at"
      )
      .eq("id", claim.id)
      .maybeSingle();
    if (error || !data) return false;

    // Null fingerprints exist only on claims created by the pre-target client.
    // Their first recovery render is restricted to the historical default.
    const reportBinding = data.report_fingerprint
      ? submittedReportBinding
      : resolveLegacyCompatibleOneTimePdfReportBinding({
          values: valuesToRender,
          maxOfferTarget: rawMaxOfferTarget,
          maxOfferTargetSource: rawMaxOfferTargetSource,
        });
    if (!reportBinding) return false;

    // An authenticated checkout stays bound to that account in addition to
    // the browser secret. Auth lookup failure is a rejection, never an
    // anonymous downgrade of an identity-bound purchase.
    if (data.user_id) {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || user?.id !== data.user_id) return false;
    }

    // The secret is the bearer credential; compare against the stored hash.
    if (!claimSecretMatches(claim.secret, data.claim_secret_hash as string))
      return false;

    // Bind to THIS deal, so one purchase cannot render an unlimited series of
    // different properties.
    const fingerprint = fingerprintOneTimePdfDeal(valuesToRender, claim.secret);
    const claimedFingerprint = fingerprintOneTimePdfDeal(
      claim.values,
      claim.secret,
    );
    if (
      fingerprint !== data.deal_fingerprint ||
      claimedFingerprint !== data.deal_fingerprint
    ) {
      return false;
    }

    // Only a PAID claim is consumed; an unconsumed row is an abandoned
    // checkout, not a purchase.
    if (!data.consumed_at) return false;

    if (
      !data.expires_at ||
      !isOneTimePdfRecoveryAllowed({
        consumedAt: data.consumed_at as string,
        expiresAt: data.expires_at as string,
      })
    ) {
      return false;
    }

    // A Checkout Session remains `paid` after refunds. Historical recovery
    // therefore re-reads current Charge refund totals and Dispute status on
    // every export. Any Stripe/API ambiguity fails closed in this function's
    // catch instead of handing out report bytes.
    const stripeAccess = await retrieveDecisionPackStripeAccess(
      getStripe(),
      data.checkout_session_id as string,
      claim.id
    );
    if (stripeAccess.state !== "allowed") return false;

    const reportFingerprint = fingerprintOneTimePdfReportBinding(
      valuesToRender,
      reportBinding.target,
      reportBinding.source,
      claim.secret
    );
    if (data.report_fingerprint) {
      return data.report_fingerprint === reportFingerprint;
    }

    // A row consumed before report binding shipped is made immutable on its
    // first bounded recovery render. The database permits null -> value once.
    const { data: bound, error: bindError } = await admin
      .from("one_time_pdf_purchase_claims")
      .update({ report_fingerprint: reportFingerprint })
      .eq("id", claim.id)
      .eq("claim_secret_hash", data.claim_secret_hash as string)
      .eq("deal_fingerprint", data.deal_fingerprint as string)
      .eq("consumed_at", data.consumed_at as string)
      .is("report_fingerprint", null)
      .select("report_fingerprint")
      .maybeSingle();
    if (bindError) return false;
    if (bound?.report_fingerprint === reportFingerprint) return true;

    // A simultaneous request may have won the bind race. Accept only if it
    // chose the exact same target/source fingerprint.
    const { data: raced, error: raceError } = await admin
      .from("one_time_pdf_purchase_claims")
      .select("report_fingerprint")
      .eq("id", claim.id)
      .maybeSingle();
    if (raceError) return false;
    return raced?.report_fingerprint === reportFingerprint;
  } catch {
    // FAIL CLOSED. An unreadable ledger must not hand out paid reports.
    return false;
  }
}

async function checkGate(
  input: z.infer<typeof inputSchema>,
): Promise<GateOutcome> {
  if (
    input.claim &&
    // Bind the claim to the exact normalized form values the server will
    // calculate and render. Browser-derived report numbers are never part of
    // the authority decision because they are never rendered.
    (await claimGrantsExport(
      input.claim,
      input.values,
      input.maxOfferTarget,
      input.maxOfferTargetSource
    ))
  ) {
    return { allowed: true };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      allowed: false,
      result: {
        ok: false,
        code: "SIGN_IN_REQUIRED",
        message: "Please sign in to export this report.",
      },
    };
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!hasPlanFeature(entitlements, "pdf_export")) {
    return {
      allowed: false,
      result: {
        ok: false,
        code: "ENTITLEMENT_REQUIRED",
        message: "PDF export is a Pro feature. Upgrade to Pro to export this report.",
      },
    };
  }
  return { allowed: true };
}

// ── Action ──────────────────────────────────────────────────────────────────

function safeFilename(
  companyName: string | null | undefined,
  mode: ReportMode,
): string {
  const prefix =
    companyName?.trim().replace(/[^A-Za-z0-9_-]+/g, "-") || "TrueCap";
  const label =
    mode === "lender"
      ? "Lender"
      : mode === "partner"
        ? "Partner"
        : mode === "agent"
          ? "Agent"
          : "Investment";
  return `${prefix}-${label}-Report-${Date.now()}.pdf`;
}

type PreparedReportInput =
  | {
      ok: true;
      values: InvestmentFormValues;
      maxOfferTarget: unknown;
      maxOfferTargetSource: unknown;
      trustedPresentation?: Parameters<
        typeof buildCanonicalReportData
      >[0]["trustedPresentation"];
      trustedRecordedResult?: Parameters<
        typeof buildCanonicalReportData
      >[0]["trustedRecordedResult"];
    }
  | { ok: false; result: GenerateReportPdfResult };

function normalizedValuesJson(raw: unknown): string | null {
  const normalized = normalizeReleasedInvestmentFormSnapshot(raw);
  if (!normalized) return null;
  const parsed = releasedInvestmentFormSchema.safeParse(normalized);
  return parsed.success ? JSON.stringify(parsed.data) : null;
}

/**
 * A saved-list export carries a server-issued render fingerprint. Re-read the
 * owned row here before rendering: the browser may not choose a historical
 * methodology, swap the deal inputs behind that fingerprint, or inject comps.
 */
async function prepareReportInput(
  input: z.infer<typeof inputSchema>,
): Promise<PreparedReportInput> {
  if (!input.savedExport) {
    return {
      ok: true,
      values: input.values,
      maxOfferTarget: input.maxOfferTarget,
      maxOfferTargetSource: input.maxOfferTargetSource,
    };
  }

  const { getSavedAnalysisPdfExportAction } =
    await import("@/app/actions/saved-analyses");
  const authority = await getSavedAnalysisPdfExportAction(
    input.savedExport.id,
    { bypassCache: input.mode !== "personal" }
  );
  if (!authority.ok) {
    return {
      ok: false,
      result: {
        ok: false,
        code:
          authority.code === "SIGN_IN_REQUIRED"
            ? "SIGN_IN_REQUIRED"
            : authority.code === "ENTITLEMENT_REQUIRED"
              ? "ENTITLEMENT_REQUIRED"
              : "STALE_EXPORT",
        message: authority.message,
      },
    };
  }
  if (
    authority.source !== "regenerate" ||
    authority.renderFingerprint !== input.savedExport.renderFingerprint
  ) {
    return {
      ok: false,
      result: {
        ok: false,
        code: "STALE_EXPORT",
        message:
          "This saved analysis changed before the report was rendered. Start the export again.",
      },
    };
  }
  const trustedValues = normalizeReleasedInvestmentFormSnapshot(authority.formSnapshot);
  if (
    !trustedValues ||
    normalizedValuesJson(input.values) !== normalizedValuesJson(trustedValues)
  ) {
    return {
      ok: false,
      result: {
        ok: false,
        code: "STALE_EXPORT",
        message:
          "This saved analysis changed before the report was rendered. Start the export again.",
      },
    };
  }
  const resultSnapshot =
    authority.resultSnapshot && typeof authority.resultSnapshot === "object"
      ? authority.resultSnapshot
      : {};
  let trustedRecordedResult: Parameters<
    typeof buildCanonicalReportData
  >[0]["trustedRecordedResult"];
  if (!isLegacySavedMethodologyVersion(authority.methodologyVersion)) {
    const currentResult = calculateAnalysis(trustedValues);
    const currentScore = computeDealScore(
      buildDealScoreInputFromAnalysis(trustedValues, currentResult)
    );
    const recorded = resolveSavedAnalysisResult({
      methodologyVersion: authority.methodologyVersion,
      resultSnapshot,
      recomputedResult: currentResult,
      recomputedExtras: {
        score: currentScore.score,
        recommendation: currentScore.recommendation,
        riskLevel: currentScore.riskLevel,
        breakdown: currentScore.breakdown,
        explanation: currentScore.explanation,
      },
    });
    if (!recorded.result || !recorded.usesRecordedSnapshot) {
      return {
        ok: false,
        result: {
          ok: false,
          code: "FROZEN_METHODOLOGY",
          message:
            "This saved result is incomplete for a reproducible PDF. Create a new scenario and explicitly re-underwrite it with the current standard.",
        },
      };
    }
    trustedRecordedResult = {
      methodologyVersion: authority.methodologyVersion,
      resultSnapshot,
    };
  }

  return {
    ok: true,
    values: trustedValues,
    maxOfferTarget: (resultSnapshot as Record<string, unknown>).maxOfferTarget,
    maxOfferTargetSource: normalizeOfferCeilingTargetSource(
      (resultSnapshot as Record<string, unknown>).maxOfferTargetSource
    ),
    trustedPresentation: {
      templateLabel: authority.templateFallback?.templateName ?? null,
      comps: authority.reportComps,
    },
    trustedRecordedResult,
  };
}

export async function generateReportPdfAction(
  input: unknown,
): Promise<GenerateReportPdfResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Could not build this report.",
    };
  }

  if (pdfRateLimit.isOverLimit(await getRequestIp())) {
    return {
      ok: false,
      code: "RATE_LIMITED",
      message: "Too many exports in a short time. Try again shortly.",
    };
  }

  const gate = await checkGate(parsed.data);
  if (!gate.allowed) return gate.result;

  try {
    const prepared = await prepareReportInput(parsed.data);
    if (!prepared.ok) return prepared.result;

    // This is the report provenance boundary. Submitted result fields are
    // intentionally discarded; the renderer only receives canonical server
    // computations reconstructed from the validated form values.
    const canonicalReport = buildCanonicalReportData({
      values: prepared.values,
      maxOfferTarget: prepared.maxOfferTarget,
      maxOfferTargetSource: prepared.maxOfferTargetSource,
      trustedPresentation: prepared.trustedPresentation,
      trustedRecordedResult: prepared.trustedRecordedResult,
    });

    // Branding is resolved HERE, never accepted from the caller, so co-branding
    // cannot be granted by posting a companyName and logoUrl — and the logo
    // host still goes through the allowlist in lib/pdf/load-image.
    //
    // AND IT IS ENTITLEMENT-GATED HERE. It previously was not, anywhere:
    // getBranding()'s comment says it deliberately does not gate reads because
    // "the PDF generator gates application separately at export time", while
    // this file's comment claimed "getBranding is itself entitlement-aware".
    // Each deferred to the other and neither actually checked, so a user who
    // subscribed, saved branding, then cancelled kept getting co-branded PDFs —
    // custom_branding is a paid feature (lib/entitlements-catalog.ts).
    // Export time is where getBranding says the gate belongs, so here it is.
    const { getBranding } = await import("@/app/actions/branding");
    const [brandingResult, brandingEntitled] = await Promise.all([
      getBranding(),
      (async () => {
        const supabase = await createServerSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return false;
        const entitlements = await getEntitlementsForUser(supabase, user.id);
        return hasPlanFeature(entitlements, "custom_branding");
      })(),
    ]);
    const branding =
      brandingEntitled && brandingResult.ok && brandingResult.branding
        ? {
            logoUrl: brandingResult.branding.logo_url,
            primaryColorHex: brandingResult.branding.primary_color_hex,
            companyName: brandingResult.branding.company_name,
            tagline: brandingResult.branding.tagline,
            contactName: brandingResult.branding.contact_name,
            contactEmail: brandingResult.branding.contact_email,
            contactPhone: brandingResult.branding.contact_phone,
            contactWebsite: brandingResult.branding.contact_website,
          }
        : null;

    const { generateInvestmentPDFArtifact } =
      await import("@/lib/pdf-generator");
    const artifact = await generateInvestmentPDFArtifact(
      canonicalReport,
      branding as never,
      parsed.data.mode as ReportMode,
    );
    const bytes = Buffer.from(await artifact.blob.arrayBuffer());
    return {
      ok: true,
      filename: safeFilename(
        branding?.companyName,
        parsed.data.mode as ReportMode,
      ),
      pdfBase64: bytes.toString("base64"),
      hasBranding: Boolean(branding),
      hasBuyBoxVerdict: artifact.hasBuyBoxVerdict,
      buyBoxStateResolved: artifact.buyBoxStateResolved,
    };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: "pdf-export", stage: "server-render" },
    });
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "Could not build this report. Please try again.",
    };
  }
}
