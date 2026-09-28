import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
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

  it("has the two surviving DSCR posts link the canonical guide in their body", () => {
    for (const slug of ["cap-rate-vs-cash-on-cash-vs-dscr", "hard-money-vs-dscr-loan"]) {
      const source = readFileSync(join(ROOT, "app/blog", slug, "page.tsx"), "utf8");
      const body = source.slice(source.indexOf("<article"), source.indexOf("</article>"));
      expect(body, slug).toMatch(/href="\/blog\/how-to-calculate-dscr(?:#[a-z-]+)?"/);
    }
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
      ...html.matchAll(/<details[^>]*><summary[^>]*>([\s\S]*?)<\/summary><p[^>]*>([\s\S]*?)<\/p><\/details>/g),
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
    expect(text).toContain(`Vacancy (5% of rent): −${usd(base.vacancyAllowanceAnnual)}`);
    expect(text).toContain(`Property taxes (1.49% of price): −${usd(base.propertyTaxMonthly * 12)}`);
    expect(text).toContain(`Insurance (0.5% of price): −${usd(base.insuranceMonthly * 12)}`);
    expect(text).toContain(`Maintenance (5% of rent): −${usd(base.maintenance * 12)}`);
    expect(text).toContain(`Management (8% of rent): −${usd(base.management * 12)}`);
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

  it("links every lender threshold it states to its primary source", async () => {
    const html = await renderCanonical();
    for (const href of [
      "https://mf.freddiemac.com/docs/product/fixed_rate.pdf",
      "https://www.govinfo.gov/content/pkg/CFR-2025-title12-vol4/pdf/CFR-2025-title12-vol4-sec244-17.pdf",
      "https://www.hud.gov/sites/dfiles/hudclips/documents/2026-01hsgml.pdf",
      "https://selling-guide.fanniemae.com/sel/b3-6-02/debt-income-ratios",
      "https://selling-guide.fanniemae.com/sel/b2-2-03/multiple-financed-properties-same-borrower",
      "https://selling-guide.fanniemae.com/sel/b3-3.8-02/rental-income-subject-property",
      "https://sf.freddiemac.com/general/maximum-ltv-tltv-htltv-ratio-requirements-for-conforming-and-super-conforming-mortgages",
      "https://www.consumerfinance.gov/rules-policy/regulations/1026/interp-3/",
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

  it("drops exactly the two merged URLs and dates the canonical by its merge", async () => {
    const pathsOf = (entries: { url: string }[]) => entries.map((entry) => new URL(entry.url).pathname);
    const after = pathsOf(sitemap());
    for (const path of REMOVED_PATHS) expect(after, path).not.toContain(path);
    expect(after).toContain(CANONICAL);
    expect(lastmodFor(CANONICAL)).toBe("2026-09-28");

    // The same sitemap with the two registry rows put back, as they were
    // before the merge: it must differ by exactly those two URLs.
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
