/**
 * Wire schema for the report payload the PDF server action accepts.
 *
 * EXTRACTED FROM the action so it can be round-trip TESTED. It could not be
 * before: a "use server" module may only export async functions, so the schema
 * was unreachable from a test and the only "coverage" was a source-text grep
 * that passed whether or not the schema was correct.
 *
 * ⚠️ THE TRAP THIS FILE EXISTS TO GUARD: only the TOP-LEVEL object is
 * .passthrough(). Every nested z.object() STRIPS keys it does not declare, in
 * silence — no error, no warning, the field simply never reaches the renderer.
 * That is how the comps $/sqft column shipped rendering "—" on every row, and
 * how the RentCast pull date never appeared. If you add a field to ReportData
 * that the PDF renders, DECLARE IT HERE and add it to
 * lib/__tests__/report-payload-schema.test.ts.
 */

import { z } from "zod";
import { specialistAnalysisSnapshotSchema } from "@/lib/specialist-analysis-snapshot";

const money = z.number().finite();
const row = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict();

const projectionRow = row({
  y: z.number().int(),
  rental: money,
  opex: money,
  debt: money,
  net: money,
  cum: money,
  propertyValue: money.optional(),
  loanBalance: money.optional(),
  equity: money.optional(),
  renovationIncomeLoss: money.optional(),
  balloon: money.optional(),
  financingOutflow: money.optional(),
  // Accepted only for historical browser payload compatibility. The server
  // rebuilds report data and the released projection page never renders them.
  tax: money.optional(),
  after: money.optional(),
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
  // Declared, or zod strips it. z.object() drops unknown keys unless the
  // object is .passthrough(), and only the TOP-LEVEL reportDataSchema is —
  // so an undeclared key here silently never reaches the renderer. That is
  // what blanked the whole $/sqft column on every paid export.
  pricePerSqft: z.number().nullable().optional(),
});

const inputConfidenceSchema = z
  .object({
    score: z.number().finite().min(0).max(100),
    stageLabel: z.string().max(120),
    sensitivityRisk: z.enum(["low", "moderate", "high"]),
    methodVersion: z.string().max(40),
    verifiedAssumptions: z.array(z.string().max(120)).max(60),
    unverifiedAssumptions: z
      .array(
        z
          .object({
            label: z.string().max(120),
            sourceClass: z.string().max(80),
            sourceLabel: z.string().max(160),
            reason: z.string().max(500),
          })
          .strict(),
      )
      .max(60),
  })
  .strict();

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
    tenYearProjectionVersion: z.number().int().positive().nullable().optional(),
    property: z.object({
      address: z.string().max(300),
      type: z.string().max(60),
      yearBuilt: z.number().nullable(),
      purchasePrice: money,
      currentValue: money.nullable().optional(),
      stabilizedValue: money.nullable().optional(),
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
          stabilizedRent: money.optional(),
          // Declared, or zod strips it and the cover silently goes back to
          // counting the owner's unit in gross rent — the same trap that
          // blanked the comps $/sqft column.
          isOwnerOccupied: z.boolean().optional(),
        }),
      )
      .max(60),
    performance: z.object({
      recommendation: z.string().max(40),
      dealScore: z.number(),
      risk: z.string().max(40),
      rationale: z.string().max(2000),
      monthlyCashFlow: money,
      cocReturn: z.number(),
      cocApplicable: z.boolean().optional(),
      capRate: z.number(),
      dscr: z.number(),
      taxSavings: money,
      afterTaxCF: money,
    }),
    // DECLARED, not left to .passthrough(). Passthrough would carry it, but
    // then the block renders whatever arbitrary shape the caller sent — and
    // the next person to add a NESTED field would hit the same silent strip
    // that blanked the comps $/sqft column, because only this top level is
    // permissive. Bounded strings, numeric amounts, capped array.
    operatingStatement: z
      .object({
        grossScheduledIncome: money,
        recurringOtherIncome: money.optional(),
        vacancyAllowance: money,
        renovationIncomeLoss: money.optional(),
        effectiveGrossIncome: money,
        operatingExpenses: z
          .array(z.object({ label: z.string().max(60), amount: money }))
          .max(20),
        operatingExpensesTotal: money,
        noi: money,
        annualDebtService: money,
        pmiAnnual: money,
        capexReserve: money,
        netCashFlowAnnual: money,
        loanAmount: money,
        monthlyPayment: money,
        initialMonthlyLoanPayment: money.optional(),
        amortizingMonthlyLoanPayment: money.optional(),
        interestOnlyMonths: money.optional(),
        amortizationTermYears: money.optional(),
        loanMaturityTermYears: money.optional(),
        balloonPayment: money.optional(),
        balloonMonth: money.optional(),
        downPayment: money.optional(),
        closingCosts: money.optional(),
        loanPointsAmount: money.optional(),
        originationFee: money.optional(),
        loanFees: money.optional(),
        initialReserve: money.optional(),
        lenderEscrowDeposit: money.optional(),
        lenderReserveDeposit: money.optional(),
        acquisitionCredits: money.optional(),
        totalCashRequired: money,
        isCashPurchase: z.boolean(),
      })
      .nullable()
      .optional(),
    // Shared strict versioned schema: declaring this nested block is required
    // or z.object() silently strips it before the PDF renderer sees it.
    specialistAnalysis: specialistAnalysisSnapshotSchema.nullable().optional(),
    // This evidence is the only browser-supplied report block preserved by
    // the server rebuild (along with bounded comps), so it must never remain
    // `unknown`: an arbitrary object could otherwise reach the renderer.
    inputConfidence: inputConfidenceSchema.nullable().optional(),
    maxOffer: z.unknown().optional(),
    downsideScenario: z.unknown().optional(),
    projection10y: z.object({
      cumulativeCF: money,
      bestAnnualPreTax: money.optional(),
      year10Equity: money.optional(),
      bestAnnualAfterTax: money.optional(),
      totalAfterTax: money.optional(),
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
        valueRange: z
          .object({ low: money.nullable(), high: money.nullable() })
          .nullable(),
        rentEstimate: money.nullable(),
        rentRange: z
          .object({ low: money.nullable(), high: money.nullable() })
          .nullable(),
        saleComps: z.array(compRow).max(50),
        rentComps: z.array(compRow).max(50),
        // Same trap as pricePerSqft above: undeclared meant the "Pulled
        // <date> via RentCast" provenance line never rendered.
        fetchedAt: z.string().max(40).nullable().optional(),
      })
      .nullable()
      .optional(),
  })
  .passthrough();

export { reportDataSchema, money };
