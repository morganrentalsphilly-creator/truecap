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
 * Composing the document here moves the decision to the server, where the
 * caller cannot reach it. That became possible once lib/pdf-generator stopped
 * depending on a DOM (chart.js on a <canvas> → lib/pdf/vector-charts, and the
 * canvas logo round-trip → lib/pdf/load-image).
 *
 * ─── WHO IS ALLOWED ─────────────────────────────────────────────────────────
 *   1. A signed-in user whose plan carries the `pdf_export` feature, or
 *   2. Anyone holding a valid, unexpired one-time claim (the $5 Deal Decision
 *      Pack) whose secret and deal fingerprint both match the ledger.
 *
 * Everyone else gets ENTITLEMENT_REQUIRED and no bytes.
 *
 * ─── KNOWN RESIDUAL, deliberately accepted ──────────────────────────────────
 * The report PAYLOAD is computed in the browser and posted here, so the caller
 * controls the numbers printed on their own report. That is unchanged from the
 * previous browser-only design and is not a cross-user issue — a user can only
 * ever render their own deal. Recomputing every projection server-side from
 * raw form values would close it, but that is a much larger change and is
 * tracked separately. What this action fixes is ACCESS, not provenance.
 */

import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getEntitlementsForUser, hasPlanFeature } from "@/lib/entitlements";
import { investmentFormSchema } from "@/lib/investcalc-schema";
import {
  claimSecretMatches,
  fingerprintOneTimePdfDeal,
  ONE_TIME_PDF_CLAIM_LIFETIME_MS,
} from "@/lib/one-time-pdf-claims";
import { createIpRateLimit, getRequestIp } from "@/lib/ip-rate-limit";
import type { ReportData } from "@/lib/pdf-generator";
import type { ReportMode } from "@/lib/pdf-export-constants";

export type GenerateReportPdfResult =
  | { ok: true; filename: string; pdfBase64: string; hasBranding: boolean }
  | {
      ok: false;
      code: "SIGN_IN_REQUIRED" | "ENTITLEMENT_REQUIRED" | "VALIDATION_ERROR" | "RATE_LIMITED" | "SERVER_ERROR";
      message: string;
    };

// ── Payload validation ──────────────────────────────────────────────────────

const money = z.number().finite();
const row = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict();

const projectionRow = row({
  y: z.number().int(),
  rental: money,
  opex: money,
  debt: money,
  net: money,
  tax: money,
  after: money,
  cum: money,
});

const taxRow = row({
  y: z.number().int(),
  rental: money,
  opex: money,
  interest: money,
  dep: money,
  total: money,
  taxable: money,
  savings: money,
  benefit: money,
});

const exitRow = row({
  y: z.number().int(),
  value: money,
  loan: money,
  equity: money,
  netSale: money,
  profit: money,
});

const compRow = z.object({
  address: z.string().max(300),
  price: money.nullable(),
  bedrooms: z.number().nullable(),
  bathrooms: z.number().nullable(),
  squareFootage: z.number().nullable(),
  distanceMiles: z.number().nullable(),
});

/**
 * Shape-only validation of the report payload.
 *
 * Bounded arrays and string lengths matter here: this action renders whatever
 * it is handed, so an unbounded `rows` array is a cheap way to make the server
 * draw a 10,000-page document. The caps are far above any real report (a hold
 * period is 10 years, not 120) and exist purely to keep a hostile payload from
 * turning into CPU and memory.
 */
const reportDataSchema = z
  .object({
    generatedAt: z.coerce.date(),
    methodologyVersion: z.string().max(40).optional(),
    methodologyLabel: z.string().max(120).optional(),
    property: z.object({
      address: z.string().max(300),
      type: z.string().max(60),
      yearBuilt: z.number(),
      purchasePrice: money,
      template: z.string().max(120),
    }),
    financing: z.record(z.string(), z.number()),
    expenses: z.record(z.string(), z.number().nullable()),
    units: z
      .array(
        z.object({
          label: z.string().max(80),
          beds: z.number(),
          baths: z.number(),
          sqft: z.number(),
          rent: money,
        })
      )
      .max(60),
    performance: z.object({
      recommendation: z.string().max(40),
      dealScore: z.number(),
      risk: z.string().max(40),
      rationale: z.string().max(2000),
      monthlyCashFlow: money,
      cocReturn: z.number(),
      capRate: z.number(),
      dscr: z.number(),
      taxSavings: money,
      afterTaxCF: money,
    }),
    inputConfidence: z.unknown().optional(),
    maxOffer: z.unknown().optional(),
    downsideScenario: z.unknown().optional(),
    projection10y: z.object({
      cumulativeCF: money,
      bestAnnualAfterTax: money,
      totalAfterTax: money,
      rows: z.array(projectionRow).max(120),
    }),
    taxStrategy: z.object({
      year1Taxable: money,
      year1Savings: money,
      totalBenefit10y: money,
      annualDepreciation: money,
      rows: z.array(taxRow).max(120),
    }),
    exitScenarios: z.object({
      bestYear: z.number(),
      year5Profit: money,
      year10Profit: money,
      totalROI: z.number(),
      rows: z.array(exitRow).max(120),
    }),
    comps: z
      .object({
        valueEstimate: money.nullable(),
        valueRange: z.object({ low: money.nullable(), high: money.nullable() }).nullable(),
        rentEstimate: money.nullable(),
        rentRange: z.object({ low: money.nullable(), high: money.nullable() }).nullable(),
        saleComps: z.array(compRow).max(50),
        rentComps: z.array(compRow).max(50),
      })
      .nullable()
      .optional(),
  })
  .passthrough();

const inputSchema = z
  .object({
    report: reportDataSchema,
    mode: z.enum(["personal", "lender", "partner", "agent"]).default("personal"),
    /** The $5 pack path: proves purchase without an entitlement. */
    claim: z
      .object({
        id: z.string().uuid(),
        secret: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
        values: investmentFormSchema,
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
const pdfRateLimit = createIpRateLimit({ windowMs: 60 * 60 * 1000, maxPerWindow: 60 });

// ── Gate ────────────────────────────────────────────────────────────────────

type GateOutcome = { allowed: true } | { allowed: false; result: GenerateReportPdfResult };

/**
 * Verify a one-time pack claim WITHOUT consuming it.
 *
 * Consumption is verifyOneTimePdfPaymentAction's job and already happened
 * before the client ever got here; re-consuming would break the documented
 * 24-hour re-download recovery window. This only answers "does this caller
 * genuinely hold a paid claim for this deal?"
 */
async function claimGrantsExport(claim: {
  id: string;
  secret: string;
  values: z.infer<typeof investmentFormSchema>;
}): Promise<boolean> {
  try {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from("one_time_pdf_purchase_claims")
      .select("claim_secret_hash, deal_fingerprint, consumed_at, expires_at")
      .eq("id", claim.id)
      .maybeSingle();
    if (error || !data) return false;

    // The secret is the bearer credential; compare against the stored hash.
    if (!claimSecretMatches(claim.secret, data.claim_secret_hash as string)) return false;

    // Bind to THIS deal, so one purchase cannot render an unlimited series of
    // different properties.
    const fingerprint = fingerprintOneTimePdfDeal(claim.values, claim.secret);
    if (fingerprint !== data.deal_fingerprint) return false;

    // Only a PAID claim is consumed; an unconsumed row is an abandoned
    // checkout, not a purchase.
    if (!data.consumed_at) return false;

    const expiresAt = data.expires_at ? Date.parse(data.expires_at as string) : NaN;
    const horizon = Number.isFinite(expiresAt)
      ? expiresAt
      : Date.parse(data.consumed_at as string) + ONE_TIME_PDF_CLAIM_LIFETIME_MS;
    if (Number.isFinite(horizon) && Date.now() > horizon) return false;

    return true;
  } catch {
    // FAIL CLOSED. An unreadable ledger must not hand out paid reports.
    return false;
  }
}

async function checkGate(input: z.infer<typeof inputSchema>): Promise<GateOutcome> {
  if (input.claim && (await claimGrantsExport(input.claim))) return { allowed: true };

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
        message: "PDF export is a Pro feature. Upgrade, or buy this single report.",
      },
    };
  }
  return { allowed: true };
}

// ── Action ──────────────────────────────────────────────────────────────────

function safeFilename(companyName: string | null | undefined, mode: ReportMode): string {
  const prefix = companyName?.trim().replace(/[^A-Za-z0-9_-]+/g, "-") || "TrueCap";
  const label =
    mode === "lender" ? "Lender" : mode === "partner" ? "Partner" : mode === "agent" ? "Agent" : "Investment";
  return `${prefix}-${label}-Report-${Date.now()}.pdf`;
}

export async function generateReportPdfAction(input: unknown): Promise<GenerateReportPdfResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Could not build this report." };
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
    // Branding is resolved HERE, never accepted from the caller. getBranding
    // is itself entitlement-aware (null for unentitled users), so co-branding
    // cannot be granted by posting a companyName and logoUrl — and the logo
    // host still goes through the allowlist in lib/pdf/load-image.
    const { getBranding } = await import("@/app/actions/branding");
    const brandingResult = await getBranding();
    const branding =
      brandingResult.ok && brandingResult.branding
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

    const { generateInvestmentPDFBlob } = await import("@/lib/pdf-generator");
    const blob = await generateInvestmentPDFBlob(
      parsed.data.report as unknown as ReportData,
      branding as never,
      parsed.data.mode as ReportMode
    );
    const bytes = Buffer.from(await blob.arrayBuffer());
    return {
      ok: true,
      filename: safeFilename(branding?.companyName, parsed.data.mode as ReportMode),
      pdfBase64: bytes.toString("base64"),
      hasBranding: Boolean(branding),
    };
  } catch (error) {
    Sentry.captureException(error, { tags: { feature: "pdf-export", stage: "server-render" } });
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "Could not build this report. Please try again.",
    };
  }
}
