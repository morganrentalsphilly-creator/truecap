/**
 * Hand-built sample deals for the admin email preview, so Morgan can review
 * the rate-alert and rent-alert email designs without waiting for a real
 * cron run (which needs live data + a rate/rent move + spends a RentCast call).
 *
 * Internally consistent with the real builders: one improving deal (rate fell
 * / rent rose) and one deteriorating deal, both financed so the DSCR line
 * renders. Preview-only — never sent.
 */
import type { RateAlertDeal } from "@/lib/rate-alerts";
import type { RentAlertDeal } from "@/lib/rent-alerts";

export const SAMPLE_RATE_ALERT_DEALS: RateAlertDeal[] = [
  {
    id: "sample-rate-up",
    label: "1205 N 5th St",
    savedRatePct: 7.625,
    currentRatePct: 6.75,
    before: { monthlyCashFlow: -64, dscr: 1.11, dscrBand: "tight", tier: "Marginal" },
    after: { monthlyCashFlow: 158, dscr: 1.29, dscrBand: "bankable", tier: "Solid" },
    changes: [
      "Now cash-flows $158/mo (was -$64/mo)",
      "DSCR 1.29 clears the typical ≥1.25 lender threshold (was 1.11)",
      "Verdict moved Marginal → Solid",
    ],
    improved: true,
  },
  {
    id: "sample-rate-down",
    label: "88 Maple Ave",
    savedRatePct: 6.25,
    currentRatePct: 7.375,
    before: { monthlyCashFlow: 96, dscr: 1.27, dscrBand: "bankable", tier: "Solid" },
    after: { monthlyCashFlow: -42, dscr: 1.13, dscrBand: "tight", tier: "Marginal" },
    changes: [
      "Now NEGATIVE -$42/mo (was $96/mo)",
      "DSCR 1.13 is above breakeven but below the ≥1.25 lenders want (was 1.27)",
      "Verdict moved Solid → Marginal",
    ],
    improved: false,
  },
];

export const SAMPLE_RENT_ALERT_DEALS: RentAlertDeal[] = [
  {
    id: "sample-rent-up",
    label: "1205 N 5th St",
    savedRentMonthly: 1850,
    currentMarketRentMonthly: 2200,
    before: { monthlyCashFlow: -38, dscr: 1.12, dscrBand: "tight", tier: "Marginal" },
    after: { monthlyCashFlow: 244, dscr: 1.34, dscrBand: "bankable", tier: "Solid" },
    changes: [
      "Now cash-flows $244/mo (was -$38/mo)",
      "DSCR 1.34 clears the typical ≥1.25 lender threshold (was 1.12)",
      "Verdict moved Marginal → Solid",
    ],
    improved: true,
  },
  {
    id: "sample-rent-down",
    label: "88 Maple Ave",
    savedRentMonthly: 2400,
    currentMarketRentMonthly: 2050,
    before: { monthlyCashFlow: 120, dscr: 1.3, dscrBand: "bankable", tier: "Solid" },
    after: { monthlyCashFlow: -90, dscr: 1.09, dscrBand: "tight", tier: "Marginal" },
    changes: [
      "Now NEGATIVE -$90/mo (was $120/mo)",
      "DSCR 1.09 is above breakeven but below the ≥1.25 lenders want (was 1.30)",
      "Verdict moved Solid → Marginal",
    ],
    improved: false,
  },
];
