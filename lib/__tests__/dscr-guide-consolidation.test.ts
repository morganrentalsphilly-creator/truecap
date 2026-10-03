import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import sitemap from "@/app/sitemap";
import { BLOG_POSTS, type BlogPost } from "@/lib/blog-posts";
import { BLOG_TOPICS } from "@/lib/blog-topics";
import { calculateAnalysis } from "@/lib/calc-analysis";
import { CITY_STRATEGY_COMBOS } from "@/lib/city-strategy-combos";
import {
  formatDscr,
  NO_DEBT_SERVICE_DSCR_LABEL,
} from "@/lib/financial-presentation";
import { GLOSSARY } from "@/lib/glossary";
import { HISTORICAL_TOOL_REDIRECTS } from "@/lib/historical-tool-redirects";
import { MARKET_CITIES } from "@/lib/markets/cities";
import { SAMPLE_DEAL_VALUES } from "@/lib/sample-deal";
import { LASTMOD, lastmodFor } from "@/lib/seo/lastmod";
import { isNoindexPath } from "@/lib/seo/noindex";

/**
 * Founder decision Q5 (2026-09-28): the three DSCR guides are one canonical
 * page, /blog/how-to-calculate-dscr. /blog/what-is-a-good-dscr and
 * /blog/dscr-loans-explained were deleted, 308 there from next.config.mjs,
 * and nothing on the site may point at them any more.
 */

const ROOT = process.cwd();
const CANONICAL = "/blog/how-to-calculate-dscr";
const REMOVED = ["what-is-a-good-dscr", "dscr-loans-explained"] as const;
const REMOVED_PATHS = REMOVED.map((slug) => `/blog/${slug}`);

type Redirect = { source: string; destination: string; permanent?: boolean };

async function configRedirects(): Promise<Redirect[]> {
  const config = (await import("../../next.config.mjs")).default as {
    redirects: () => Promise<Redirect[]>;
  };
  return config.redirects();
}

async function renderCanonical(): Promise<string> {
  const mod = await import("@/app/blog/how-to-calculate-dscr/page");
  return renderToStaticMarkup(mod.default());
}

const decode = (html: string) =>
  html
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

/**
 * One visible FAQ row as the article frame's FaqSection renders it: the
 * question in the summary's one <span> (the disclosure mark, an aria-hidden
 * svg, follows it), the answer in the row's one <p>.
 */
const FAQ_ROW =
  /<details[^>]*><summary[^>]*><span[^>]*>([^<]*)<\/span><svg aria-hidden="true"[^>]*>(?:<path[^>]*><\/path>)+<\/svg><\/summary><p[^>]*>([\s\S]*?)<\/p><\/details>/g;

/** Visible text of the rendered page: tags and JSON-LD dropped, entities decoded. */
const visibleText = (html: string) =>
  decode(
    html
      .replace(/<script[\s\S]*?<\/script>/g, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " "),
  );

function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/<!--[\s\S]*?-->/g, "");
}

describe("DSCR guide consolidation: redirects", () => {
  it("308s both merged posts in one hop to the canonical guide (next.config.mjs redirects())", async () => {
    const redirects = await configRedirects();
    for (const path of REMOVED_PATHS) {
      expect(
        redirects.filter((r) => r.source === path),
        path,
      ).toEqual([{ source: path, destination: CANONICAL, permanent: true }]);
    }
    // One hop: the canonical is not itself redirected, and it is a real page.
    expect(redirects.map((r) => r.source)).not.toContain(CANONICAL);
    expect(existsSync(join(ROOT, "app/blog/how-to-calculate-dscr/page.tsx"))).toBe(true);
    // The unreleased DSCR calculator still lands on the same canonical.
    expect(HISTORICAL_TOOL_REDIRECTS["dscr-calculator"]).toBe(CANONICAL);
  });

  it("deletes the merged posts together with their OG image routes", () => {
    for (const slug of REMOVED) {
      expect(existsSync(join(ROOT, "app/blog", slug)), slug).toBe(false);
    }
  });
});

describe("DSCR guide consolidation: nothing points at a merged post", () => {
  it("drops them from every registry: posts, hubs, market and strategy reading, glossary, lastmod", () => {
    const removed = new Set<string>(REMOVED);
    expect(BLOG_POSTS.filter((post) => removed.has(post.slug))).toEqual([]);
    expect(BLOG_TOPICS.flatMap((topic) => topic.postSlugs).filter((slug) => removed.has(slug))).toEqual([]);
    expect(MARKET_CITIES.flatMap((city) => city.relatedPosts).filter((slug) => removed.has(slug))).toEqual([]);
    expect(
      CITY_STRATEGY_COMBOS.flatMap((combo) => combo.relatedPosts ?? []).filter((slug) => removed.has(slug)),
    ).toEqual([]);
    expect(
      Object.values(GLOSSARY)
        .map((entry) => entry.postUrl)
        .filter((url) => url !== undefined && REMOVED_PATHS.includes(url.split("#")[0])),
    ).toEqual([]);
    expect(Object.keys(LASTMOD).filter((key) => REMOVED_PATHS.includes(key))).toEqual([]);
  });

  it("links neither slug from any page, component, library module, content file or loop skill", () => {
    const files = execFileSync("git", ["ls-files", "app", "components", "lib", "content", ".claude/skills"], {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    })
      .split("\n")
      .filter((file) => /\.(?:tsx?|json|md)$/.test(file))
      .filter((file) => !file.startsWith("lib/__tests__/"))
      .filter((file) => existsSync(join(ROOT, file)));
    expect(files.length).toBeGreaterThan(500);

    const slugPattern = new RegExp(`(?<![a-z0-9-])(?:${REMOVED.join("|")})(?![a-z0-9-])`);
    const offenders = files.filter((file) =>
      slugPattern.test(withoutComments(readFileSync(join(ROOT, file), "utf8"))),
    );
    expect(offenders).toEqual([]);
  });

  it("has the two surviving DSCR posts link the canonical guide once, in their body", () => {
    const canonicalHref = /href="\/blog\/how-to-calculate-dscr(?:#[a-z-]+)?"/g;
    for (const slug of ["cap-rate-vs-cash-on-cash-vs-dscr", "hard-money-vs-dscr-loan"]) {
      const source = readFileSync(join(ROOT, "app/blog", slug, "page.tsx"), "utf8");
      const body = source.slice(source.indexOf("<article"), source.indexOf("</article>"));
      expect(source.match(canonicalHref), slug).toHaveLength(1);
      expect(body.match(canonicalHref), slug).toHaveLength(1);
    }
    // hard-money's one link to the guide opens the first paragraph under an H2
    // that names DSCR (today "What DSCR actually is"; seo-striking-distance
    // may reword it, so which DSCR section holds it is not pinned). It has no
    // fragment or query, so it lands on the guide (formula first), not on its
    // DSCR-loans section.
    const hardMoney = readFileSync(join(ROOT, "app/blog/hard-money-vs-dscr-loan/page.tsx"), "utf8");
    expect(hardMoney).toMatch(/<h2[^>]*>[^<]*\bDSCR\b[^<]*<\/h2>\s*<p>\s*<Link\s+href="\/blog\/how-to-calculate-dscr"/);
    expect(hardMoney.match(/href="\/blog\/how-to-calculate-dscr[^"]*"/g)).toEqual(['href="/blog/how-to-calculate-dscr"']);
  });

  it("keeps the glossary hub's DSCR card, which links the guide, to what the guide sources", () => {
    const hub = readFileSync(join(ROOT, "app/glossary/page.tsx"), "utf8");
    const start = hub.indexOf('slug: "dscr"');
    const card = hub.slice(start, hub.indexOf("slug:", start + 1));
    expect(card).toContain('postPath: "/blog/how-to-calculate-dscr"');
    // The guide states no market-wide minimum, no rate tiers, and that
    // conventional loans count rent as a net dollar figure, not a ratio.
    expect(card).not.toMatch(/Every lender pulls it/);
    expect(card).not.toMatch(/typical lender minimum/);
    expect(card).not.toMatch(/conventional/i);
    expect(card).not.toMatch(/rate tiers/);
    expect(card).toContain("each lender sets its own");
  });
});

describe("DSCR guide consolidation: the canonical page", () => {
  it("shows one merged FAQ, visibly and as the FAQPage JSON-LD, question for question", async () => {
    const html = await renderCanonical();

    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
      (match) => JSON.parse(match[1]) as Record<string, unknown>,
    );
    const faqPages = blocks.filter((block) => block["@type"] === "FAQPage");
    expect(faqPages).toHaveLength(1);
    const ld = (faqPages[0].mainEntity as { name: string; acceptedAnswer: { text: string } }[]).map(
      (q) => [q.name, q.acceptedAnswer.text],
    );

    const visible = [
      ...html.matchAll(FAQ_ROW),
    ].map((match) => [decode(match[1]), decode(match[2])]);

    expect(visible).toEqual(ld);
    expect(new Set(visible.map(([q]) => q)).size).toBe(visible.length);

    const questions = visible.map(([q]) => q);
    // One from each guide that was merged.
    expect(questions).toEqual(
      expect.arrayContaining([
        "What's the DSCR formula?", // how-to-calculate-dscr
        "What is a good DSCR for a rental property?", // what-is-a-good-dscr
        "What is the DSCR on a cash purchase?", // what-is-a-good-dscr
        "What is a DSCR loan?", // dscr-loans-explained
        "What documentation do DSCR loans require?", // dscr-loans-explained
      ]),
    );
    const cash = visible.find(([q]) => q === "What is the DSCR on a cash purchase?");
    expect(cash?.[1]).toContain(NO_DEBT_SERVICE_DSCR_LABEL);
  });

  it("reads as one article: formula, worked example, what counts as good, DSCR loans, FAQ", async () => {
    const html = await renderCanonical();
    const order = ["formula", "four-steps", "worked-example", "good-dscr", "lender-dscr", "dscr-loans", "stress-test", "faq"].map(
      (id) => html.indexOf(`id="${id}"`),
    );
    expect(order.every((index) => index > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
  });

  it("works the sample rental with TrueCap's own calculator numbers", async () => {
    const text = visibleText(await renderCanonical());
    const usd = (amount: number) => `$${Math.round(amount).toLocaleString("en-US")}`;
    const dscr = (value: number) => formatDscr(value, true);

    const base = calculateAnalysis(SAMPLE_DEAL_VALUES);
    const rent = SAMPLE_DEAL_VALUES.monthlyRent ?? 0;
    expect(rent).toBeGreaterThan(0);
    const pitia = base.monthlyPayment + base.propertyTaxMonthly + base.insuranceMonthly;

    expect(text).toContain(`Gross rent: ${usd(rent)} × 12 = ${usd(base.grossScheduledIncomeAnnual)}`);
    // The calculator rounds each monthly expense to the dollar, so a line's
    // annual figure is its monthly figure × 12, not its percentage of the
    // annual base (5% of $36,600 is $1,830; $153 × 12 is $1,836). Each label
    // shows the monthly figure, so the reader's arithmetic reaches the NOI.
    expect(text).toContain("The calculator rounds each monthly expense to the dollar");
    expect(base.vacancy * 12).toBe(base.vacancyAllowanceAnnual);
    const line = (label: string, monthly: number) => `${label}, ${usd(monthly)} a month): −${usd(monthly * 12)}`;
    const lines = [
      line("Vacancy (5% of rent", base.vacancy),
      line("Property taxes (1.49% of price", base.propertyTaxMonthly),
      line("Insurance (0.5% of price", base.insuranceMonthly),
      line("Maintenance (5% of rent", base.maintenance),
      line("Management (8% of rent", base.management),
    ];
    for (const expected of lines) expect(text).toContain(expected);
    // The listed lines add up to the NOI shown.
    const listed = [base.vacancy, base.propertyTaxMonthly, base.insuranceMonthly, base.maintenance, base.management]
      .map((monthly) => Math.round(monthly) * 12)
      .reduce((sum, annual) => sum + annual, 0);
    expect(base.grossScheduledIncomeAnnual - listed).toBe(base.noiAnnual);
    expect(text).toContain(`NOI: ${usd(base.noiAnnual)}`);
    expect(text).toContain(`Loan: ${usd(base.loanAmount)} at 6.6% for 30 years = ${usd(base.monthlyPayment)} a month`);
    expect(text).toContain(`Annual debt service: ${usd(base.annualDebtService)}`);
    expect(text).toContain(
      `DSCR = ${usd(base.noiAnnual)} ÷ ${usd(base.annualDebtService)} = ${formatDscr(base.dscr, base.annualDebtService > 0)}`,
    );
    expect(text).toContain(`5% CapEx reserve (${usd(base.capex)} a month)`);
    expect(text).toContain(`about ${usd(base.netCashFlow)} a month`);

    // What 1.25 allows at the sample's rate and term.
    const maxDebtService = base.noiAnnual / 1.25;
    const maxLoan = Math.round(((maxDebtService / 12) / (base.monthlyPayment / base.loanAmount)) / 1_000) * 1_000;
    expect(text).toContain(`${usd(maxDebtService)} a year (${usd(maxDebtService / 12)} a month)`);
    expect(text).toContain(`a loan of about ${usd(maxLoan)}, ${Math.round((maxLoan / SAMPLE_DEAL_VALUES.purchasePrice) * 100)}% of the price`);

    // Where 1.25 binds: the "Both" stress case (rent 10% lower, rate a point
    // higher), solved for the down payment and for the price that reach 1.25.
    const price = SAMPLE_DEAL_VALUES.purchasePrice;
    const stressed = {
      ...SAMPLE_DEAL_VALUES,
      monthlyRent: rent * 0.9,
      interestRate: SAMPLE_DEAL_VALUES.interestRate + 1,
    };
    const stressedBase = calculateAnalysis(stressed);
    expect(stressedBase.dscr).toBeLessThan(1.25);
    expect(text).toContain(
      `NOI falls to ${usd(stressedBase.noiAnnual)} against ${usd(stressedBase.annualDebtService)} of debt service, a DSCR of ${dscr(stressedBase.dscr)}`,
    );
    expect(text).toContain(
      `${usd(stressedBase.noiAnnual)} ÷ 1.25 = ${usd(stressedBase.noiAnnual / 1.25)} a year`,
    );
    const solve = (dscrAt: (x: number) => number, low: number, high: number) => {
      // DSCR is monotonic in both inputs over these ranges (at 100% down there
      // is no loan and no DSCR); find where it crosses 1.25.
      const rising = dscrAt(high) > dscrAt(low);
      for (let i = 0; i < 80; i += 1) {
        const mid = (low + high) / 2;
        if ((dscrAt(mid) < 1.25) === rising) low = mid;
        else high = mid;
      }
      return rising ? high : low;
    };
    const downPct = solve((pct) => calculateAnalysis({ ...stressed, downPaymentPct: pct }).dscr, 0, 50);
    const stressedLoan = Math.round((price * (1 - downPct / 100)) / 1_000) * 1_000;
    const stressedDown = price - stressedLoan;
    expect(calculateAnalysis({ ...stressed, downPaymentPct: (stressedDown / price) * 100 }).dscr).toBeGreaterThanOrEqual(1.25);
    expect(text).toContain(`a loan of about ${usd(stressedLoan)}. That takes about ${usd(stressedDown)} down (${Math.round((stressedDown / price) * 100)}%) instead of ${usd(price * 0.2)}`);
    const maxPrice = Math.floor(solve((p) => calculateAnalysis({ ...stressed, purchasePrice: p }).dscr, price / 2, price) / 1_000) * 1_000;
    expect(calculateAnalysis({ ...stressed, purchasePrice: maxPrice }).dscr).toBeGreaterThanOrEqual(1.25);
    expect(calculateAnalysis({ ...stressed, purchasePrice: maxPrice + 1_000 }).dscr).toBeLessThan(1.25);
    expect(text).toContain(
      `the calculator reaches 1.25 at a price of about ${usd(maxPrice)}, ${usd(price - maxPrice)} under the ${usd(price)} in the example`,
    );

    // The lender's versions of the ratio.
    expect(text).toContain(`Rent ÷ PITIA: ${usd(rent)} ÷ ${usd(pitia)} = ${dscr(rent / pitia)}`);
    expect(text).toContain(
      `${usd(base.monthlyPayment)} of principal and interest, ${usd(base.propertyTaxMonthly)} of taxes and ${usd(base.insuranceMonthly)} of insurance`,
    );
    expect(text).toContain(`NOI ÷ PITIA: ${dscr(base.noiAnnual / (pitia * 12))}`);
    expect(text).toContain(`75% × ${usd(rent)} − ${usd(pitia)} = about ${usd(0.75 * rent - pitia)} a month`);

    // Stress cases: one input changed, calculator rerun.
    const lowRent = calculateAnalysis({ ...SAMPLE_DEAL_VALUES, monthlyRent: rent * 0.9 });
    const highRate = calculateAnalysis({ ...SAMPLE_DEAL_VALUES, interestRate: SAMPLE_DEAL_VALUES.interestRate + 1 });
    const both = calculateAnalysis({
      ...SAMPLE_DEAL_VALUES,
      monthlyRent: rent * 0.9,
      interestRate: SAMPLE_DEAL_VALUES.interestRate + 1,
    });
    expect(text).toContain(`Base case: ${dscr(base.dscr)}`);
    expect(text).toContain(`Rent 10% lower (${usd(rent * 0.9)}): ${dscr(lowRent.dscr)}`);
    expect(text).toContain(`Rate 1 point higher (${SAMPLE_DEAL_VALUES.interestRate + 1}%): ${dscr(highRate.dscr)}`);
    expect(text).toContain(`Both: ${dscr(both.dscr)}, under 1.25`);
    expect(both.dscr).toBeLessThan(1.25);

    // The rents at which the calculator's DSCR reaches 1.25 and 1.00, to $10.
    const rentAt = (target: number) => {
      let low = 0;
      let high: number = rent;
      for (let i = 0; i < 60; i += 1) {
        const mid = (low + high) / 2;
        if (calculateAnalysis({ ...SAMPLE_DEAL_VALUES, monthlyRent: mid }).dscr < target) low = mid;
        else high = mid;
      }
      return Math.round(high / 10) * 10;
    };
    const at125 = rentAt(1.25);
    const at100 = rentAt(1);
    expect(text).toContain(
      `fall to about ${usd(at125)} a month, ${Math.round((1 - at125 / rent) * 100)}% under the ${usd(rent)} assumed`,
    );
    expect(text).toContain(`to about ${usd(at100)} before NOI stops covering the payment`);
  });

  it("states the 1.25 benchmark only as far as its sources go, and agrees with its own table", async () => {
    const html = await renderCanonical();
    const text = visibleText(html);
    const faq = new Map(
      [...html.matchAll(FAQ_ROW)].map(
        (match) => [decode(match[1]), decode(match[2])] as const,
      ),
    );

    // 12 CFR 244.17 sets 1.25 only for a multifamily loan (1.5 and 1.7 for
    // commercial real estate); Freddie Mac's Optigo loans are multifamily;
    // HUD's 221(d)(4) uses 1.15 and 1.11.
    const good = faq.get("What is a good DSCR for a rental property?") ?? "";
    expect(good).toContain("The 1.25 figure comes from multifamily lending standards");
    expect(good).not.toMatch(/commercial/i);
    expect(text).toContain("1.25 shows up in two published multifamily standards, and HUD goes lower:");
    expect(text).not.toMatch(/several (?:published )?lending standards/);
    // Fannie Mae's net-rent method is not why DSCR lenders set their own minimums.
    expect(text).not.toMatch(/coverage ratio \(see below\), so/);

    // The FAQ splits the ranges where the table does, at 1.15.
    for (const band of ["1.00 – 1.15", "1.15 – 1.25"]) expect(text).toContain(band);
    expect(good).toContain("From 1.15 to 1.25 there's some cushion");
    expect(good).toContain("from 1.0 to 1.15 the property covers its debt with little room");
    expect(good).not.toContain("Between 1.0 and 1.25");

    // F3 research left "lenders require a bigger cushion in some markets"
    // unconfirmed (Freddie Mac's SBL market tiers are legacy and run by
    // market size), and the page cites nothing for it.
    const tooHigh = faq.get("Can a DSCR be too high?") ?? "";
    expect(tooHigh).not.toMatch(/cushion/i);
  });

  it("says once in the body that clearing the minimum is not an approval", async () => {
    const html = await renderCanonical();
    const body = visibleText(html.slice(0, html.indexOf('id="faq"')));
    expect(body.match(/not an approval|does not guarantee approval|doesn't guarantee approval/g)).toEqual([
      "does not guarantee approval",
    ]);
    // The section that holds that hedge (today the "What lenders check" H3;
    // seo-striking-distance step 3 may reword a heading, so the section is
    // found by its hedge, not its heading text) says "sets its own" once.
    const sections = html.slice(0, html.indexOf('id="faq"')).split(/(?=<h[23][\s>])/);
    const lendersCheck = sections.filter((section) => visibleText(section).includes("does not guarantee approval"));
    expect(lendersCheck).toHaveLength(1);
    expect(visibleText(lendersCheck[0]!).match(/sets its own/g)).toHaveLength(1);
  });

  it("links every lender threshold it states to its primary source", async () => {
    const html = await renderCanonical();
    // 12 CFR 244.17 in any annual CFR edition on govinfo.gov (seo-refresh
    // replaces a superseded edition with the current one), or the eCFR
    // section. The backreferences keep the URL's two year fields, and its two
    // volume fields, in agreement.
    expect(html).toMatch(
      /href="(?:https:\/\/www\.govinfo\.gov\/content\/pkg\/CFR-(\d{4})-title12-vol(\d+)\/pdf\/CFR-\1-title12-vol\2-sec244-17\.pdf|https:\/\/www\.ecfr\.gov\/current\/title-12\/[^"]*section-244\.17)"/,
    );
    for (const href of [
      "https://mf.freddiemac.com/docs/product/fixed_rate.pdf",
      "https://www.hud.gov/sites/dfiles/hudclips/documents/2026-01hsgml.pdf",
      "https://selling-guide.fanniemae.com/sel/b3-6-02/debt-income-ratios",
      "https://selling-guide.fanniemae.com/sel/b2-2-03/multiple-financed-properties-same-borrower",
      "https://selling-guide.fanniemae.com/sel/b3-3.8-02/rental-income-subject-property",
      "https://sf.freddiemac.com/general/maximum-ltv-tltv-htltv-ratio-requirements-for-conforming-and-super-conforming-mortgages",
      "https://www.consumerfinance.gov/rules-policy/regulations/1026/interp-3/",
      "https://selling-guide.fanniemae.com/sel/b3-5.1-01/general-requirements-credit-scores",
      "https://www2.census.gov/govs/pubs/2010pubs/govsrr2010-06.pdf",
    ]) {
      expect(html, href).toContain(`href="${href}"`);
    }
  });
});

describe("DSCR guide consolidation: sitemap", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/blog-posts");
    vi.resetModules();
  });

  const pathsOf = (entries: { url: string }[]) => entries.map((entry) => new URL(entry.url).pathname);

  it("lists exactly the blog post pages on disk, plus the blog hubs, and dates the canonical by its merge", () => {
    const listed = pathsOf(sitemap());
    for (const path of REMOVED_PATHS) expect(listed, path).not.toContain(path);
    expect(listed).toContain(CANONICAL);
    // Dated no earlier than the merge. The publish job bumps the date on every
    // later edit to the page (lastmod.ts bump), and lastmod-contract.test.ts
    // holds the upper bound, so the floor is the rule, not today's date.
    const canonicalLastmod = lastmodFor(CANONICAL);
    expect(canonicalLastmod).toBeDefined();
    expect((canonicalLastmod ?? "") >= "2026-09-28", canonicalLastmod).toBe(true);

    // A fixed baseline that needs no fixture: the post directories under
    // app/blog. The merge deleted two of them, so the sitemap's /blog URLs
    // must be every remaining post page and nothing else. A registry row
    // dropped while its page still exists (a third URL lost) fails here, and
    // so does a row whose page is gone.
    const postDirs = readdirSync(join(ROOT, "app/blog"), { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isDirectory() &&
          entry.name !== "topics" &&
          !entry.name.startsWith("[") &&
          existsSync(join(ROOT, "app/blog", entry.name, "page.tsx")),
      )
      .map((entry) => `/blog/${entry.name}`);
    expect(postDirs.length).toBeGreaterThanOrEqual(73);
    const hubs = ["/blog", "/blog/topics", ...BLOG_TOPICS.map((topic) => `/blog/topics/${topic.slug}`)];
    const expected = [...hubs, ...postDirs].filter((path) => !isNoindexPath(path));
    const listedBlog = listed.filter((path) => path === "/blog" || path.startsWith("/blog/"));
    expect([...listedBlog].sort()).toEqual([...expected].sort());
    expect(new Set(listedBlog).size).toBe(listedBlog.length);
  });

  it("owes the two merged URLs to their registry rows alone: putting the rows back adds exactly them", async () => {
    const after = pathsOf(sitemap());
    const restored: BlogPost[] = REMOVED.map((slug) => ({
      slug,
      title: slug,
      excerpt: slug,
      readingTimeMinutes: 10,
      publishedAt: "2026-05-24",
      available: true,
    }));
    vi.resetModules();
    vi.doMock("@/lib/blog-posts", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@/lib/blog-posts")>();
      return { ...actual, BLOG_POSTS: [...actual.BLOG_POSTS, ...restored] };
    });
    const before = pathsOf((await import("@/app/sitemap")).default());

    expect(before.length - after.length).toBe(2);
    expect(before.filter((path) => !after.includes(path)).sort()).toEqual([...REMOVED_PATHS].sort());
    expect(after.filter((path) => !before.includes(path))).toEqual([]);
  });
});
