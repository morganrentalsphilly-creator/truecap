/**
 * scripts/polish-emails.ts
 *
 * One-shot polish pass on emails/content/*.json. Applies sharper subject
 * lines, tighter preheaders, and stronger ship-note CTAs to each weekly
 * digest content file. Target audience: real estate investors who skim
 * subject lines aggressively and convert on specific dollar figures +
 * contrarian framing.
 *
 * Design principles applied:
 *   - Subject: specific number or contrarian hook in first 6 words
 *   - Preheader: extends the subject's promise, adds another concrete data point
 *   - Ship note title: outcome-focused, not feature-focused
 *   - Ship note items: each ends with a specific verb (open, run, compare, save)
 *
 * Run once:  npx -y tsx scripts/polish-emails.ts
 * Dry run:   npx -y tsx scripts/polish-emails.ts --dry-run
 *
 * Safe to re-run — overwrites the same fields each time.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

type Polish = {
  subject: string;
  preheader: string;
  shipNote: {
    title: string;
    items: string[];
  };
};

const CONTENT_DIR = path.join(process.cwd(), "emails", "content");

const POLISH: Record<string, Polish> = {
  // ───── 2026-05-25 ──── Launch (past-dated; included for completeness)
  "2026-05-25": {
    subject: "Underwrite any rental in 60 seconds — without the spreadsheet",
    preheader:
      "Paste an address. Get cap rate, cash flow, DSCR, 10-year projection. Free, no signup.",
    shipNote: {
      title: "Start with the free TrueCap analyzer",
      items: [
        "Free: unlimited cap rate, cash-on-cash, DSCR, monthly cash flow — auto-filled with property tax + rent",
        "Pro at $16.67/mo: 10-year projection, sensitivity grid, MAO calculator, A/B mortgage compare, PDF reports, saved-deals portfolio",
        "Open the analyzer →",
      ],
    },
  },

  // ───── 2026-06-02 ──── 5-number triage
  "2026-06-02": {
    subject: "The 5 numbers that decide every rental deal (in 60 seconds)",
    preheader:
      "Cap rate, cash-on-cash, DSCR, monthly NCF, 10-yr IRR — and which to weight when",
    shipNote: {
      title: "All 5 numbers, every analysis — free",
      items: [
        "Paste an address — cap rate, cash-on-cash, DSCR, monthly net cash flow auto-calculated in 60 seconds",
        "Pro: 10-year IRR projection, sensitivity grid, max-allowable-offer calculator",
        "Run your next deal through TrueCap →",
      ],
    },
  },

  // ───── 2026-06-09 ──── 1031 exchange
  "2026-06-09": {
    subject: "1031 exchanges: when they save $50k, when they cost you more",
    preheader:
      "45/180-day windows · QI fees · the replacement-property panic that costs more than the deferred tax",
    shipNote: {
      title: "Model the 1031 trade-off in TrueCap",
      items: [
        "Free analyzer: estimate the capital gains tax bill you'd defer",
        "Pro: side-by-side compare 'pay tax + reinvest' vs '1031 into replacement' on a 10-year basis",
        "Decide before you sell — open TrueCap →",
      ],
    },
  },

  // ───── 2026-06-16 ──── BRRRR math
  "2026-06-16": {
    subject: "BRRRR: 4 conditions have to be true (most deals fail at #2)",
    preheader:
      "Purchase + rehab + holding ≤ 75% ARV · the appraisal risk most investors don't price in",
    shipNote: {
      title: "Run BRRRR math before you offer",
      items: [
        "TrueCap BRRRR analyzer: model purchase + rehab + ARV + refi cash-out in one view",
        "Pro: sensitivity grid shows what happens if your ARV comes in 5-10% under expectation",
        "Stress-test your next BRRRR →",
      ],
    },
  },

  // ───── 2026-06-23 ──── Insurance
  "2026-06-23": {
    subject: "Insurance just quietly killed your cap rate",
    preheader:
      "Coastal premiums up 25-40% in 5 years · the $80-400/mo gap most investors don't price in",
    shipNote: {
      title: "Re-underwrite with real insurance numbers",
      items: [
        "Free: TrueCap pulls a baseline insurance estimate based on property type + location",
        "Pro: sensitivity grid — see exactly how a $1,500/yr insurance hike moves your cap rate and cash flow",
        "Quote insurance first, then run the deal →",
      ],
    },
  },

  // ───── 2026-06-30 ──── Cash flow vs appreciation
  "2026-06-30": {
    subject: "Cash flow or appreciation? The honest answer most investors dodge",
    preheader:
      "Different markets do different things · why the mixed portfolio usually beats either pure strategy",
    shipNote: {
      title: "Compare both strategies on the same deal",
      items: [
        "Free: cap rate + cash flow + DSCR for any property in 60 seconds",
        "Pro: 10-year IRR projection — see whether cash flow or appreciation actually drives this deal's return",
        "Run both scenarios in TrueCap →",
      ],
    },
  },

  // ───── 2026-07-07 ──── DSCR loans
  "2026-07-07": {
    subject: "DSCR loans: when they save the deal, when they're a trap",
    preheader:
      "When DTI doesn't pencil · 8-9% typical rate band · the 1.20 floor that decides everything",
    shipNote: {
      title: "DSCR ratio shown on every analysis",
      items: [
        "Free: TrueCap calculates DSCR alongside cap rate + cash-on-cash on every deal",
        "Pro: A/B mortgage compare — model the same deal at conventional vs DSCR rates side-by-side",
        "Know if your deal pencils before you call a lender →",
      ],
    },
  },

  // ───── 2026-07-14 ──── Cash vs leveraged
  "2026-07-14": {
    subject: "All cash or leveraged? The math at $300k vs $900k",
    preheader:
      "No-debt cash flow vs leveraged compounding · the 'one good deal' problem with paying cash",
    shipNote: {
      title: "Model the leverage decision in TrueCap",
      items: [
        "Free: switch between cash purchase and financed in one click — see DSCR and cash-on-cash both ways",
        "Pro: 10-year IRR comparison — when leverage compounds, when it underperforms",
        "Stop guessing — run both scenarios →",
      ],
    },
  },

  // ───── 2026-07-21 ──── Mailbag
  "2026-07-21": {
    subject: "5 questions investors are actually asking right now",
    preheader:
      "LLC structure · partnership splits · firing your PM · first-deal regrets · refi timing math",
    shipNote: {
      title: "Use TrueCap to answer your next 'should I' question",
      items: [
        "Free: paste an address, get every key metric in 60 seconds — no spreadsheet wrangling",
        "Pro: refi A/B compare, sensitivity grid, MAO calculator for offer math",
        "Stop building Excel models for one-off questions →",
      ],
    },
  },

  // ───── 2026-07-28 ──── Section 8
  "2026-07-28": {
    subject: "Section 8 pays 10-18% above market in some zip codes",
    preheader:
      "FMR often beats market rent in B/C zones · the screening trade-off · why the data doesn't match the stereotypes",
    shipNote: {
      title: "Stress-test voucher math in TrueCap",
      items: [
        "Free: model the rent as FMR vs market and see the cap rate spread",
        "Pro: sensitivity grid — what happens if voucher tenants turn over annually vs every 3 years",
        "Underwrite a voucher deal honestly →",
      ],
    },
  },

  // ───── 2026-08-04 ──── Property tax appeal
  "2026-08-04": {
    subject: "Your property tax bill is probably wrong — here's the 30-min fix",
    preheader:
      "30-40% of rental properties over-assessed · $400-1,800/yr saved per property · 62% appeal success rate",
    shipNote: {
      title: "TrueCap flags likely over-assessments",
      items: [
        "Free: property details panel shows assessed value vs comp-supported value",
        "Pro: portfolio rollup shows total annual tax savings across your saved properties if you appeal each",
        "Check your portfolio in TrueCap →",
      ],
    },
  },

  // ───── 2026-08-11 ──── Inspection report
  "2026-08-11": {
    subject: "The 6 lines on your inspection report that actually matter",
    preheader:
      "Roof, electrical, plumbing, foundation, HVAC, mold · how to negotiate vs walk · 3 inspection scenarios",
    shipNote: {
      title: "Price the inspection findings before re-negotiating",
      items: [
        "Free: rehab cost estimator built in — model how a $15k roof or $8k electrical changes the deal",
        "Pro: sensitivity grid — see exact cap rate impact of accepting vs walking",
        "Re-underwrite after inspection in 60 seconds →",
      ],
    },
  },

  // ───── 2026-08-18 ──── Seller financing
  "2026-08-18": {
    subject: "Seller financing: how to get a 5% rate when banks want 8%",
    preheader:
      "When sellers say yes · the 4 deal-types where it works · why creative structures save deals",
    shipNote: {
      title: "Model seller terms in TrueCap",
      items: [
        "Free: enter custom interest rate + term — see how seller-financing terms change DSCR and cash flow",
        "Pro: A/B mortgage compare — show the seller a side-by-side of conventional vs their offer",
        "Bring real numbers to the negotiation →",
      ],
    },
  },

  // ───── 2026-08-25 ──── Out-of-state
  "2026-08-25": {
    subject: "Out-of-state investing: 4 jobs you keep, 3 you delegate",
    preheader:
      "The #1 OOS-investor failure mode (hint: it's not the PM) · how to underwrite from 2,000 miles away",
    shipNote: {
      title: "Underwrite any market from your couch",
      items: [
        "Free: TrueCap pulls property tax + rent estimates for any US address — no local knowledge required",
        "Pro: save your top markets, run side-by-side comparisons, surface the best cap rates",
        "Compare markets without travel →",
      ],
    },
  },

  // ───── 2026-09-01 ──── Small multi-family
  "2026-09-01": {
    subject: "5+ unit small multi-family: the under-priced sweet spot",
    preheader:
      "Commercial pricing kicks in at 5+ · cap-rate compression upside · the under-management opportunity",
    shipNote: {
      title: "Multi-family math, simplified",
      items: [
        "Free: per-unit rent + expense modeling for 2-12 unit properties",
        "Pro: portfolio rollup across multiple multi-family deals, A/B compare two acquisitions",
        "Run a small multi-family deal →",
      ],
    },
  },

  // ───── 2026-09-08 ──── Cost segregation
  "2026-09-08": {
    subject: "Cost seg can save $20-50k in tax — when it actually works",
    preheader:
      "Front-load 25-35% of depreciation · the $4-7k study · why it backfires on short holds",
    shipNote: {
      title: "Decide before you pay for the study",
      items: [
        "Free: 10-year projection shows your taxable income trajectory — when cost-seg helps most",
        "Pro: sensitivity grid — model how cost-seg recapture changes a 5-year vs 10-year hold",
        "See if cost-seg pencils for your deal →",
      ],
    },
  },

  // ───── 2026-09-15 ──── House hacking
  "2026-09-15": {
    subject: "House hacking: $300/mo housing cost on a $400k duplex",
    preheader:
      "3.5% down FHA · the year-2 transition where break-even flips to real cash flow · true out-of-pocket math",
    shipNote: {
      title: "Year-1 + year-2 math in one view",
      items: [
        "Free: owner-occupant mode shows your true out-of-pocket housing cost while you live in it",
        "Pro: year-2 conversion to pure-rental view, side-by-side cash flow + cap rate",
        "Model your first house hack →",
      ],
    },
  },

  // ───── 2026-09-22 ──── STR vs LTR
  "2026-09-22": {
    subject: "STRs claim 2-3x the cash flow — here's when that's actually true",
    preheader:
      "The regulatory wave that killed STRs in dense urban · 4 markets to skip · the operational tax most don't price in",
    shipNote: {
      title: "Underwrite STR + LTR side-by-side",
      items: [
        "Free: cap rate + cash flow with long-term rental assumptions in 60 seconds",
        "Pro: customize rent + vacancy + management to model STR scenarios — see if the upside is real after operational cost",
        "Compare both strategies on the same property →",
      ],
    },
  },

  // ───── 2026-09-29 ──── Year-1 capex
  "2026-09-29": {
    subject: "Year-1 capex: the budget no one prepares you for",
    preheader:
      "The 3-tier reserve framework · 1925 rowhouses vs 2018 tract homes · the 6 most common first-year surprises",
    shipNote: {
      title: "Build year-1 capex into every deal",
      items: [
        "Free: customize capex reserve by % of rent or fixed annual — see how the right reserve changes your cash flow",
        "Pro: 10-year projection layers year-1 vs steady-state capex separately",
        "Stop under-budgeting capex →",
      ],
    },
  },

  // ───── 2026-10-06 ──── Tenant screening
  "2026-10-06": {
    subject: "The 5 tenant screening criteria that actually predict outcomes",
    preheader:
      "Rent-to-income · prior-landlord reference · credit · employment · eviction history · 3 you can safely skip",
    shipNote: {
      title: "Build vacancy reality into your underwrite",
      items: [
        "Free: vacancy rate input on every analysis — model 5% vs 8% vs 12% scenarios",
        "Pro: sensitivity grid shows exact cap-rate impact of each vacancy assumption",
        "Underwrite vacancy honestly →",
      ],
    },
  },

  // ───── 2026-10-13 ──── Mortgage points
  "2026-10-13": {
    subject: "Mortgage points: when they pay back in 4 years, when never",
    preheader:
      "Break-even math · the 4-year rule · why most points buyers regret it",
    shipNote: {
      title: "Run the points-vs-cash trade-off",
      items: [
        "Free: enter custom interest rate — see how a 25bp lower rate changes monthly cash flow",
        "Pro: A/B mortgage compare — points vs no-points side-by-side with break-even highlighted",
        "Decide before you write the check at closing →",
      ],
    },
  },
};

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const files = await fs.readdir(CONTENT_DIR);
  const dates = files
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();

  console.log(`\nPolishing ${dates.length} content files (${dryRun ? "DRY RUN" : "LIVE"})`);
  console.log("─".repeat(60));

  let updated = 0;
  let skipped = 0;

  for (const date of dates) {
    const filePath = path.join(CONTENT_DIR, `${date}.json`);
    const polish = POLISH[date];
    if (!polish) {
      console.log(`[skip] ${date} — no polish defined`);
      skipped += 1;
      continue;
    }
    const raw = await fs.readFile(filePath, "utf8");
    const data = JSON.parse(raw);

    data.subject = polish.subject;
    data.preheader = polish.preheader;
    data.shipNote = polish.shipNote;

    if (dryRun) {
      console.log(`[dry] ${date}`);
      console.log(`       subj: ${polish.subject}`);
    } else {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
      console.log(`[ok] ${date}`);
    }
    updated += 1;
  }

  console.log("─".repeat(60));
  console.log(`Done. Updated: ${updated}. Skipped: ${skipped}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
