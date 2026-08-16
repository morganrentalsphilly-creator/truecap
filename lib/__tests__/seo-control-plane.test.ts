import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getSeoAutopilotConfig, mayAutopublish, mayExecuteRisk } from "@/lib/seo/control-plane/config";
import { detectContradictions } from "@/lib/seo/control-plane/consistency";
import { analyzeInternalLinks } from "@/lib/seo/control-plane/internal-links";
import { findCannibalization, findPerformanceOpportunities, opportunityScore } from "@/lib/seo/control-plane/opportunities";
import { privacySafeObservations, suggestedCitation } from "@/lib/seo/control-plane/original-data";
import { canAutopublishProposal, runPageQualityGates, type PageProposal } from "@/lib/seo/control-plane/quality-gates";
import { SEO_SOURCES, sourceById, sourcesDue } from "@/lib/seo/control-plane/sources";
import { findYearReferences, needsYearRolloverReview } from "@/lib/seo/control-plane/year-rollover";
import { PUBLIC_CATALOG_FACTS } from "@/lib/product-facts";

const ROOT = join(import.meta.dirname, "../..");

describe("SEO autopilot safety", () => {
  it("defaults to disabled observe mode with conservative caps", () => {
    const config = getSeoAutopilotConfig({} as NodeJS.ProcessEnv);
    expect(config).toMatchObject({
      enabled: false,
      autopublishEnabled: false,
      mode: "observe",
      dailyMutationCap: 3,
      weeklyPublicationCap: 1,
      haltOnSourceFailure: true,
      haltOnQualityFailure: true,
    });
    expect(mayExecuteRisk(config, "low")).toBe(false);
  });

  it("never auto-executes medium/high risk and requires a second publish switch", () => {
    const config = getSeoAutopilotConfig({
      NODE_ENV: "test",
      SEO_AUTOPILOT_ENABLED: "true",
      SEO_AUTOPILOT_MODE: "auto",
      SEO_AUTOPUBLISH_ENABLED: "false",
    } as NodeJS.ProcessEnv);
    expect(mayExecuteRisk(config, "low")).toBe(true);
    expect(mayExecuteRisk(config, "medium")).toBe(false);
    expect(mayExecuteRisk(config, "high")).toBe(false);
    expect(mayAutopublish(config, "low")).toBe(false);
  });
});

describe("source ledger", () => {
  it("uses unique HTTPS sources and primary sources for every tax dependency", () => {
    expect(new Set(SEO_SOURCES.map((source) => source.id)).size).toBe(SEO_SOURCES.length);
    expect(SEO_SOURCES.every((source) => source.url.startsWith("https://"))).toBe(true);
    expect(SEO_SOURCES.filter((source) => source.category === "TAX").every((source) => source.authorityLevel === "PRIMARY")).toBe(true);
    expect(sourceById("irs-bonus-depreciation-2026")?.affectedPaths).toContain(
      "/blog/bonus-depreciation-rental-property-2026",
    );
  });

  it("returns never-fetched and expired sources, not fresh ones", () => {
    const now = new Date("2026-08-15T12:00:00.000Z");
    const state = Object.fromEntries(SEO_SOURCES.map((source) => [source.id, "2026-08-14T12:00:00.000Z"]));
    expect(sourcesDue(state, now)).toHaveLength(0);
    expect(sourcesDue({ ...state, "irs-publication-946": null }, now).map((source) => source.id)).toContain("irs-publication-946");
  });
});

describe("opportunity engine", () => {
  it("scores striking distance, CTR, decay, gaps, and conversion without inventing demand", () => {
    const current = [
      { query: "rental property analyzer", page: "/blog/analyze", intentClass: "guide", clicks: 2, impressions: 200, ctr: 0.01, position: 8, analyzerStarts: 0 },
      { query: "max offer calculator", page: null, intentClass: "calculator", clicks: 0, impressions: 40, ctr: 0, position: 18 },
    ];
    const previous = [
      { query: "rental property analyzer", page: "/blog/analyze", intentClass: "guide", clicks: 10, impressions: 400, ctr: 0.025, position: 4 },
    ];
    const types = new Set(findPerformanceOpportunities(current, previous).map((item) => item.type));
    expect(types).toEqual(new Set(["STRIKING_DISTANCE", "HIGH_IMPRESSION_LOW_CTR", "CONTENT_DECAY", "QUERY_GAP"]));
    expect(opportunityScore({ relevance: 1, existingAuthority: 1, searchEvidence: 1, businessValue: 1, conversionPotential: 1, probabilityOfImprovement: 1, effort: 1, contentRisk: 1, cannibalizationRisk: 1 })).toBe(100);
  });

  it("flags only same-query, same-intent multi-page collisions", () => {
    const collision = findCannibalization([
      { query: "cap rate definition", page: "/glossary/cap-rate", intentClass: "definition", clicks: 2, impressions: 50, ctr: 0.04, position: 6 },
      { query: "cap rate definition", page: "/blog/cap-rate", intentClass: "definition", clicks: 1, impressions: 30, ctr: 0.03, position: 9 },
      { query: "cap rate definition", page: "/tools/cap-rate-calculator", intentClass: "calculator", clicks: 4, impressions: 70, ctr: 0.05, position: 5 },
    ]);
    expect(collision).toHaveLength(1);
    expect(collision[0].evidence.pages).toEqual(["/glossary/cap-rate", "/blog/cap-rate"]);
  });
});

describe("internal link graph", () => {
  it("reports depth, broken targets, orphans, and contextual weakness", () => {
    const report = analyzeInternalLinks(
      ["/", "/hub", "/winner", "/orphan"],
      [
        { source: "/", target: "/hub", anchor: "Guides", placement: "navigation" },
        { source: "/hub", target: "/winner", anchor: "analyze a rental", placement: "contextual" },
        { source: "/hub", target: "/missing", anchor: "old", placement: "contextual" },
      ],
      { weakThreshold: 1 },
    );
    expect(report.depth["/winner"]).toBe(2);
    expect(report.orphans).toEqual(["/orphan"]);
    expect(report.brokenTargets).toEqual(["/missing"]);
    expect(report.weaklyLinked).toContain("/hub");
  });
});

describe("quality gates and original data", () => {
  const proposal: PageProposal = {
    path: "/research/test",
    canonical: "https://usetruecap.com/research/test",
    title: "Rental market test",
    description: "Original aggregated rental-market findings with transparent methodology and source dates.",
    h1: "Rental market test",
    indexable: true,
    sitemapEligible: true,
    distinctIntent: "Original rental benchmark",
    informationGain: ["aggregated TrueCap calculation"],
    claims: [{ claim: "Median result", sourceId: "truecap-aggregate", sourceDate: "2026-08-01", retrievedAt: "2026-08-15", confidence: 1, primarySource: true, contradictionChecked: true }],
    parentHub: "/research",
    internalLinksOut: ["/methodology", "/tools/cap-rate-calculator"],
    incomingLinkPlan: ["/blog/topics/markets"],
    hasUsefulCta: true,
    hasPlaceholders: false,
    maxTemplateSimilarity: 0.3,
    mobileSafe: true,
    accessible: true,
    riskClass: "low",
  };

  it("passes a complete low-risk proposal and fails high-risk autopublishing", () => {
    expect(runPageQualityGates(proposal).passed).toBe(true);
    expect(canAutopublishProposal(proposal)).toBe(true);
    expect(canAutopublishProposal({ ...proposal, riskClass: "high" })).toBe(false);
    expect(runPageQualityGates({ ...proposal, hasPlaceholders: true, maxTemplateSimilarity: 0.9 }).blockers).toHaveLength(2);
  });

  it("suppresses undersized cohorts and emits a stable citation", () => {
    expect(privacySafeObservations([{ cohortSize: 49, metric: "median", value: 1 }, { cohortSize: 50, metric: "median", value: 2 }])).toEqual([{ cohortSize: 50, metric: "median", value: 2 }]);
    expect(suggestedCitation({ title: "Index", updatedAt: "2026-08-15", canonical: "https://usetruecap.com/research/index" })).toContain("TrueCap");
  });
});

describe("year rollover and factual consistency", () => {
  it("prefers the authoritative fact and makes YMYL disagreement critical", () => {
    expect(detectContradictions([
      { factKey: "bonus_depreciation_2026", value: "100%", location: "IRS", authoritative: true },
      { factKey: "bonus_depreciation_2026", value: "20%", location: "/blog/old", authoritative: false },
    ], new Set(["bonus_depreciation_2026"]))).toEqual([
      expect.objectContaining({ authoritativeValue: "100%", severity: "critical" }),
    ]);
  });

  it("finds year references but never rewrites them", () => {
    expect(findYearReferences("Limits for 2026 differ from 2025").map((item) => item.year)).toEqual([2026, 2025]);
    expect(needsYearRolloverReview("Current 2026 limits", new Date("2026-11-15T00:00:00Z"))).toMatchObject({ due: true });
  });

  it("keeps public catalog counts derived from registries", () => {
    expect(PUBLIC_CATALOG_FACTS).toEqual({ calculators: 20, embeddableCalculators: 19, markets: 162, states: 33 });
    const statePage = readFileSync(join(ROOT, "app/states/page.tsx"), "utf8");
    expect(statePage).toContain("STATE_COUNT");
    expect(statePage).not.toMatch(/15-state|Fifteen states|The 15 best states/);
  });

  it("blocks the obsolete 2026 bonus-depreciation claim everywhere public", () => {
    const publicFiles = [
      "app/blog/bonus-depreciation-rental-property-2026/page.tsx",
      "app/blog/how-to-calculate-rental-property-depreciation/page.tsx",
      "app/blog/page.tsx",
    ].map((file) => readFileSync(join(ROOT, file), "utf8")).join("\n");
    expect(publicFiles).not.toMatch(/20% (?:in|for|bonus).*2026|2026[^\n]{0,50}20%|None have passed|goes to zero in 2027/i);
    expect(publicFiles).toContain("100% bonus depreciation");
    expect(publicFiles).toContain("January 19, 2025");
  });

  it("ships every normalized control-plane table in one migration", () => {
    const migration = readFileSync(join(ROOT, "supabase/migrations/20260815120000_seo_control_plane.sql"), "utf8");
    for (const table of ["seo_pages", "seo_sources", "seo_page_source_dependencies", "seo_gsc_daily", "seo_opportunities", "seo_internal_links", "seo_crawl_results", "seo_conversions_daily", "seo_embed_referrals", "seo_job_runs", "seo_mutations"]) {
      expect(migration).toContain(`public.${table}`);
    }
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("revoke all");
  });
});
