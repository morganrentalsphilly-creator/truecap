import type { GscMetric, SeoOpportunity } from "./types";

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

export function opportunityScore(input: {
  relevance: number;
  existingAuthority: number;
  searchEvidence: number;
  businessValue: number;
  conversionPotential: number;
  probabilityOfImprovement: number;
  effort: number;
  contentRisk: number;
  cannibalizationRisk: number;
}): number {
  const upside =
    input.relevance *
    input.existingAuthority *
    input.searchEvidence *
    input.businessValue *
    input.conversionPotential *
    input.probabilityOfImprovement;
  const cost = Math.max(0.1, input.effort * input.contentRisk * input.cannibalizationRisk);
  return Math.round(clamp((upside / cost) * 100));
}

function baseScore(metric: GscMetric, probability: number, effort = 0.5): number {
  return opportunityScore({
    relevance: 0.9,
    existingAuthority: clamp(metric.impressions / 500, 0.25, 1),
    searchEvidence: clamp(metric.impressions / 250, 0.25, 1),
    businessValue: /calculator|analy|dscr|cap rate|cash flow|max offer|rental property/i.test(metric.query) ? 1 : 0.65,
    conversionPotential: 0.8,
    probabilityOfImprovement: probability,
    effort,
    contentRisk: 1,
    cannibalizationRisk: 1,
  });
}

export function findPerformanceOpportunities(
  current: GscMetric[],
  previous: GscMetric[] = [],
): SeoOpportunity[] {
  const out: SeoOpportunity[] = [];
  const prior = new Map(previous.map((metric) => [`${metric.query}\u0000${metric.page ?? ""}`, metric]));

  for (const metric of current) {
    const key = `${metric.query}\u0000${metric.page ?? ""}`;
    if (metric.page && metric.impressions >= 20 && metric.position !== null && metric.position >= 4 && metric.position <= 15) {
      out.push({
        type: "STRIKING_DISTANCE",
        key: `striking:${key}`,
        page: metric.page,
        query: metric.query,
        score: baseScore(metric, 0.85, 0.45),
        evidence: { impressions: metric.impressions, clicks: metric.clicks, position: metric.position },
        recommendedAction: "Refresh the existing URL, close intent gaps, add evidence and relevant internal authority before creating a new page.",
        riskClass: "medium",
      });
    }

    if (metric.page && metric.impressions >= 50 && metric.position !== null && metric.position <= 10 && metric.ctr < 0.02) {
      out.push({
        type: "HIGH_IMPRESSION_LOW_CTR",
        key: `ctr:${key}`,
        page: metric.page,
        query: metric.query,
        score: baseScore(metric, 0.75, 0.25),
        evidence: { impressions: metric.impressions, ctr: metric.ctr, position: metric.position },
        recommendedAction: "Run one truthful title/snippet experiment and hold it long enough to measure.",
        riskClass: "medium",
      });
    }

    if (!metric.page && metric.impressions >= 10) {
      out.push({
        type: "QUERY_GAP",
        key: `gap:${metric.query}`,
        page: null,
        query: metric.query,
        score: baseScore(metric, 0.5, 0.8),
        evidence: { impressions: metric.impressions, position: metric.position },
        recommendedAction: "First test whether an existing page should expand; create a URL only for distinct intent with original information gain.",
        riskClass: "medium",
      });
    }

    const before = prior.get(key);
    if (before && before.impressions >= 30) {
      const impressionRatio = metric.impressions / Math.max(1, before.impressions);
      const positionLoss = (metric.position ?? 100) - (before.position ?? 100);
      if (impressionRatio <= 0.7 || positionLoss >= 3) {
        out.push({
          type: "CONTENT_DECAY",
          key: `decay:${key}`,
          page: metric.page,
          query: metric.query,
          score: baseScore(before, 0.8, 0.55),
          evidence: {
            currentImpressions: metric.impressions,
            previousImpressions: before.impressions,
            currentPosition: metric.position,
            previousPosition: before.position,
          },
          recommendedAction: "Diagnose factual freshness, intent, snippet, internal links, competitors, and technical status before rewriting.",
          riskClass: "medium",
        });
      }
    }

    const conversionRate = metric.clicks > 0 ? (metric.analyzerStarts ?? 0) / metric.clicks : null;
    if (metric.page && metric.clicks >= 25 && conversionRate !== null && conversionRate < 0.01) {
      out.push({
        type: "CONVERSION_OPPORTUNITY",
        key: `conversion:${key}`,
        page: metric.page,
        query: metric.query,
        score: baseScore(metric, 0.7, 0.35),
        evidence: { clicks: metric.clicks, analyzerStarts: metric.analyzerStarts ?? 0, conversionRate },
        recommendedAction: "Improve the page-to-analyzer bridge without weakening the informational answer.",
        riskClass: "low",
      });
    }
  }

  return out.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
}

export function findCannibalization(metrics: GscMetric[]): SeoOpportunity[] {
  const groups = new Map<string, GscMetric[]>();
  for (const metric of metrics) {
    if (!metric.page || metric.impressions < 10) continue;
    const key = `${metric.query.trim().toLowerCase()}\u0000${metric.intentClass}`;
    const items = groups.get(key) ?? [];
    items.push(metric);
    groups.set(key, items);
  }

  const out: SeoOpportunity[] = [];
  for (const [key, items] of groups) {
    const uniquePages = [...new Set(items.map((item) => item.page!))];
    if (uniquePages.length < 2) continue;
    const [query, intentClass] = key.split("\u0000");
    const impressions = items.reduce((sum, item) => sum + item.impressions, 0);
    out.push({
      type: "CANNIBALIZATION",
      key: `cannibalization:${key}`,
      page: null,
      query,
      score: clamp(Math.round(40 + Math.log10(Math.max(10, impressions)) * 15)),
      evidence: { intentClass, pages: uniquePages, impressions },
      recommendedAction: "Review the SERP task. Keep definition, calculator, guide, and benchmark pages separate when intent differs; merge or retarget only true task overlap.",
      riskClass: "medium",
    });
  }
  return out.sort((a, b) => b.score - a.score);
}
