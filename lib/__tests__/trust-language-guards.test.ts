import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function read(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

describe("trust-language guards", () => {
  it("labels the simplified tax model as an illustration on decision surfaces", () => {
    const taxPanel = read("../../components/investcalc/tax-strategy/panel.tsx");
    const compare = read("../../components/investcalc/compare-deals-client.tsx");
    const pricing = read("../../app/pricing/page.tsx");

    for (const source of [taxPanel, compare, pricing]) {
      expect(source).toMatch(/Illustrative Tax Impact/i);
    }
    expect(taxPanel).toContain("Passive-loss");
    expect(taxPanel).toContain("mixed personal/rental-use allocation");
    expect(taxPanel).toContain("not tax advice");
  });

  it("keeps the PDF versioned and explicit about benchmark limitations", () => {
    const constants = read("../pdf-export-constants.ts");
    const generator = read("../pdf-generator.ts");

    // Pinned so a bump is always a DELIBERATE act with a changelog entry
    // above it, never an accident — cached PDFs are invalidated by this
    // number, so changing it silently either strands users on a stale
    // document or throws away every cache for nothing.
    // Bumped to 9 because saved-deal exports are now content-addressed and a
    // frozen historical report may not mix in today's inverse-solver math.
    expect(constants).toContain("PDF_SNAPSHOT_VERSION = 9");
    // The changelog comment must actually document the current version.
    expect(constants).toMatch(/\/\/\s+9 - /);
    expect(generator).toContain("TRUECAP_UNDERWRITING_STANDARD_VERSION");
    expect(generator).toContain("area rent benchmark");
    expect(generator).toContain("owner-occupied national mortgage benchmark");
    expect(generator).toContain("highest modeled profit is not a recommendation");
    expect(generator).not.toContain('"Best Year to Sell"');
  });

  it("does not advertise unimplemented STR tax or seasonality models", () => {
    const comparison = read("../../app/vs/dealcheck-for-short-term-rentals/page.tsx");
    const roundup = read("../../app/blog/best-short-term-rental-analysis-tool-2026/page.tsx");
    const combined = `${comparison}\n${roundup}`;

    expect(combined).not.toMatch(/supports accelerated depreciation/i);
    expect(combined).not.toMatch(/12-month seasonal income breakdown/i);
    expect(combined).toContain("does not determine STR-loophole eligibility");
    expect(combined).toContain("Seasonal months require separate saved scenarios");
  });

  it("does not turn common DSCR program features into universal approval rules", () => {
    const explainer = read("../../app/blog/dscr-loans-explained/page.tsx");
    const hardMoney = read("../../app/blog/hard-money-vs-dscr-loan/page.tsx");
    const dti = read("../../app/blog/debt-to-income-ratio-investment-property/page.tsx");
    const metricGuide = read("../../app/blog/cap-rate-vs-cash-on-cash-vs-dscr/page.tsx");
    const blogIndex = read("../../app/blog/page.tsx");
    const tool = read("../../app/tools/dscr-calculator/page.tsx");
    const glossary = read("../glossary.ts");
    const combined = `${explainer}\n${hardMoney}\n${dti}\n${metricGuide}\n${blogIndex}\n${tool}\n${glossary}`;

    expect(combined).not.toMatch(/lender doesn(?:'|&apos;)t care about your/i);
    expect(combined).not.toMatch(/you don(?:'|&apos;)t provide tax returns/i);
    expect(combined).not.toMatch(/income docs needed<\/td><td>none/i);
    expect(combined).not.toMatch(/ignores your personal DTI entirely/i);
    expect(combined).not.toMatch(/DSCR loans bypass it entirely/i);
    expect(combined).not.toMatch(/DSCR loans approve based on/i);
    expect(combined).not.toMatch(/1\.25\+ is bankable/i);
    expect(explainer).toContain("Requirements vary by lender, program, state, borrower, and property");
    expect(explainer).toContain("it does not guarantee approval");
  });

  it("keeps refinance, appraisal, LTV, credit, and DTI guidance program-specific", () => {
    const hardMoney = read("../../app/blog/hard-money-vs-dscr-loan/page.tsx");
    const cashOutHeloc = read(
      "../../app/blog/cash-out-refinance-vs-heloc-rental/page.tsx"
    );
    const brrrr = read("../../app/blog/brrrr-method-explained/page.tsx");
    const refinance = read(
      "../../app/blog/how-to-refinance-a-rental-property/page.tsx"
    );
    const dti = read(
      "../../app/blog/debt-to-income-ratio-investment-property/page.tsx"
    );
    const combined = `${hardMoney}\n${cashOutHeloc}\n${brrrr}\n${refinance}\n${dti}`;

    expect(combined).not.toMatch(/same at every lender/i);
    expect(combined).not.toMatch(/Every rental, everywhere/i);
    expect(combined).not.toMatch(/Typical 2026 DSCR cash-out requirements/i);
    expect(combined).not.toMatch(/standard 2026 structure/i);
    expect(combined).not.toMatch(/the deal finances/i);
    expect(combined).not.toMatch(/squeaking under the wire with automated approval/i);
    expect(combined).not.toMatch(/the refi is still doable/i);
    expect(combined).not.toMatch(/delayed-financing exception lets .* immediately/i);
    expect(combined).not.toMatch(/680\+ FICO[\s\S]{0,100}740\+/i);
    expect(combined).not.toMatch(/700\+ credit[\s\S]{0,100}720-740/i);
    expect(combined).not.toMatch(/require(?:s|d)? (?:six|6|12) months/i);

    expect(brrrr).toContain("There is no universal BRRRR cash-out ceiling");
    expect(brrrr).toContain("meeting one threshold does not guarantee approval");
    expect(refinance).toContain("Seasoning and the eligible value basis vary");
    expect(cashOutHeloc).toContain("There is no universal maximum");
    expect(hardMoney).toContain("not a loan quote or approval");
    expect(dti).toContain("one illustration, not a universal lender rule");
  });

  it("keeps rental-tax education sourced and scenario-based", () => {
    const taxDeductions = read("../../app/blog/rental-property-tax-deductions/page.tsx");

    expect(taxDeductions).toContain("https://www.irs.gov/publications/p527");
    expect(taxDeductions).toContain("https://www.irs.gov/publications/p925");
    expect(taxDeductions).toContain("Cost Segregation Audit Technique Guide");
    expect(taxDeductions).not.toMatch(/typically saves you 3-5x/i);
    expect(taxDeductions).not.toMatch(/typically pays back 4-10x/i);
    expect(taxDeductions).not.toMatch(/Worth doing on properties over/i);
    expect(taxDeductions).not.toMatch(/\$4,650\/year of tax savings/i);
  });

  it("does not promise a fixed state-tax lift in market content", () => {
    const dallas = read("../../app/markets/dallas/page.tsx");
    const houston = read("../../app/markets/houston/page.tsx");
    const phoenix = read("../../app/markets/phoenix/page.tsx");
    const states = read("../states.ts");
    const cityStrategies = read("../city-strategy-combos.ts");
    const combined = `${dallas}\n${houston}\n${phoenix}\n${states}\n${cityStrategies}`;

    expect(combined).not.toMatch(/5-7% after-tax CF lift/i);
    expect(combined).not.toMatch(/3-7% higher after-tax cash flow/i);
    expect(combined).not.toMatch(/Arizona often beats Texas on net carrying cost/i);
    expect(combined).not.toMatch(/brutal after-tax drag/i);
    expect(combined).not.toMatch(/compresses after-tax returns severely/i);
    expect(combined).toContain("taxpayer-specific");
  });

  it("keeps 1031 and cost-segregation content conditional rather than outcome-promising", () => {
    const exchange = read("../../app/blog/1031-exchange-basics/page.tsx");
    const campaign = read("../../emails/content/2026-09-08.json");

    expect(exchange).toContain("https://www.irs.gov/publications/p544");
    expect(exchange).not.toMatch(/permanently wipes out/i);
    expect(exchange).not.toMatch(/real and durable tax strategy/i);
    expect(exchange).not.toMatch(/\$20-50k\+ deferred/i);
    expect(campaign).toContain("Property-specific");
    expect(campaign).not.toMatch(/cost seg can save \$20-50k/i);
    expect(campaign).not.toMatch(/break-even is roughly \$250k/i);
    expect(campaign).not.toMatch(/materially improves IRR/i);
  });

  it("does not publish unsupported appraisal, reserve, insurance, or source-authority shortcuts", () => {
    const cityStrategies = read("../city-strategy-combos.ts");
    const glossary = read("../glossary.ts");
    const mashvisor = read("../../app/vs/mashvisor/page.tsx");
    const rule = read("../../app/blog/50-percent-rule-rentals/page.tsx");

    expect(cityStrategies).not.toMatch(/Cleveland appraisals (?:run|consistently come in)/i);
    expect(glossary).not.toMatch(/1925 building needs 3-5x/i);
    expect(mashvisor).not.toMatch(/authoritative public sources/i);
    expect(rule).not.toMatch(/FL routinely 3-5x/i);
    expect(rule).not.toMatch(/coastal can be \$6-12k/i);
  });

  it("uses review-oriented public report and tax-impact labels", () => {
    const signup = read("../../components/marketing/signup-prompt-card.tsx");
    const landing = read("../../components/marketing/landing-sections.tsx");
    const purchase = read("../../components/investcalc/pdf-purchase-dialog.tsx");
    const changelog = read("../../app/changelog/page.tsx");
    const combined = `${signup}\n${landing}\n${purchase}\n${changelog}`;

    expect(combined).not.toMatch(/lender-ready/i);
    expect(combined).toContain("Lender-facing");
    expect(changelog).not.toMatch(/tax strategy/i);
    expect(changelog).toContain("Illustrative Tax Impact");
  });

  it("keeps market, voucher, operator, appraisal, and lender outcomes verification-first", () => {
    const cityStrategies = read("../city-strategy-combos.ts");
    const cityStrategyPage = read("../../app/markets/[city]/[strategy]/page.tsx");
    const proForma = read("../../app/blog/rental-property-pro-forma-explained/page.tsx");
    const voucher = read("../../app/blog/section-8-rental-property-investing/page.tsx");
    const philadelphia = read("../../app/markets/philadelphia/page.tsx");
    const houston = read("../../app/markets/houston/page.tsx");
    const atlanta = read("../../app/markets/atlanta/page.tsx");
    const memphis = read("../../app/markets/memphis/page.tsx");
    const hardMoney = read("../../app/blog/hard-money-vs-dscr-loan/page.tsx");
    const quickUnderwrite = read("../../app/blog/how-to-underwrite-a-rental-property-in-60-seconds/page.tsx");
    const calculateDscr = read("../../app/blog/how-to-calculate-dscr/page.tsx");
    const goodDscr = read("../../app/blog/what-is-a-good-dscr/page.tsx");
    const vacancy = read("../../app/blog/vacancy-rate-rental-property/page.tsx");
    const lenderCopy = `${hardMoney}\n${quickUnderwrite}\n${calculateDscr}\n${goodDscr}\n${vacancy}`;

    expect(cityStrategies).not.toMatch(/FMR runs 10-18% above market rent/i);
    expect(cityStrategies).not.toMatch(/HUD-paid guaranteed portion of rent/i);
    expect(cityStrategies).not.toMatch(/reliable 8-10% cash-on-cash returns/i);
    expect(cityStrategies).not.toMatch(/Appraisals lag comps by 5-10%/i);
    expect(cityStrategies).not.toMatch(/Cincinnati appraisals modestly under-comp/i);
    expect(cityStrategyPage).toContain("not a forecast, appraisal");

    expect(proForma).not.toMatch(/what you(?:'|&apos;)d actually achieve/i);
    expect(`${voucher}\n${philadelphia}`).not.toMatch(/guaranteed rent \+ automatic renewals/i);
    expect(voucher).not.toMatch(/effectively cannot bounce/i);
    expect(voucher).not.toMatch(/most of the check guaranteed/i);
    expect(voucher).not.toMatch(/something close to a Treasury coupon/i);

    expect(houston).not.toMatch(/Texas evictions move fast \(21-45 days uncontested\)/i);
    expect(atlanta).not.toMatch(/Georgia evictions move faster[\s\S]{0,80}30-45 days/i);
    expect(memphis).not.toMatch(/insurance runs \$1,200-2,400\/yr/i);
    expect(memphis).not.toMatch(/your net is typically 2-4% lower/i);

    expect(lenderCopy).not.toMatch(/Most DSCR lenders won(?:'|&apos;)t fund anything below 1\.0/i);
    expect(lenderCopy).not.toMatch(/Trying to use DSCR for the acquisition usually fails/i);
    expect(lenderCopy).not.toMatch(/Most DSCR lenders set their minimum/i);
    expect(lenderCopy).not.toMatch(/most DSCR lenders qualify/i);
  });

  it("does not claim an unverified security grade on authentication screens", () => {
    const authShell = read("../../components/auth/auth-shell.tsx");

    expect(authShell).not.toMatch(/bank-level security/i);
    expect(authShell).not.toMatch(/military-grade/i);
    expect(authShell).toContain("Owner-scoped saved data");
  });

  it("keeps the retired refund guarantee fail-closed", () => {
    const landing = read("../../components/marketing/landing-sections.tsx");
    const config = read("../../lib/marketing-offer-config.ts");
    const guaranteePage = read("../../app/guarantee/page.tsx");
    const reviewsPage = read("../../app/reviews/page.tsx");
    const termsPage = read("../../app/terms/page.tsx");

    expect(landing).not.toContain('"The 5-Deal Guarantee"');
    expect(landing).not.toContain("fiveDealGuaranteeEnabled,");
    expect(landing).toContain("export function NeverOverpayGuarantee()");
    expect(landing).not.toContain("Read the full guarantee");
    expect(landing).not.toContain("Never Overpay Guarantee");
    expect(config).toContain("const guaranteeEnabled = false");
    expect(config).toMatch(/safePublicUrl\([\s\S]*\?\?\s*\n?\s*"\/guarantee"/);
    expect(guaranteePage).toContain("notFound()");
    expect(guaranteePage).toContain("No public TrueCap refund guarantee is currently offered.");
    expect(reviewsPage).not.toContain("Never Overpay Guarantee");
    expect(termsPage).not.toContain("Never Overpay Guarantee");
  });
});
