/**
 * Typed access to seo/config.json — the only place caps, thresholds and path
 * fences are defined. Scripts never hard-code a threshold.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { SEO_DIR } from "./paths.ts";

export type SeoConfig = {
  site: { base: string; gscProperty: string; userAgent: string };
  caps: {
    pagesChangedPerRun: number;
    newArticlesPerRun: number;
    noindexShareOfIndexedPerRun: number;
    titleChangeCooldownDays: number;
    pageTouchCooldownDays: number;
    internalLinkSourcesPerTarget: number;
    newLinksPerSourcePagePerRun: number;
    maxChangedFilesPerRun: number;
    maxChangedLinesPerRun: number;
  };
  gates: {
    gapArticlesWhileCrawlStalled: number;
    crawlStall: { minUnknownUrls: number; crawledNotIndexedRisingWeeks: number };
    pruneTierDuringCalibration: number;
    calculatorIntentPattern: string;
  };
  thresholds: {
    strikingDistance: { minImpressions28d: number; positionMin: number; positionMax: number };
    lowCtr: { binomialP: number; minImpressions28d: number };
    refresh: { minBaselineClicks8w: number; clickDropShare: number };
    gapArticle: { minQueryImpressions28d: number; minWords: number; minInboundLinks: number };
    prune: {
      minDaysInSitemap: number;
      maxImpressions28d: number;
      minWords: number;
      minUniqueRatio: number;
      minConfirmingInspections: number;
      minDaysBetweenInspections: number;
    };
    similarity: { mergeAbove: number; templateCommonShare: number };
    persistence: { minWeeksQualifying: number; ofLastWeeks: number };
  };
  brakes: {
    pageClickLoss: { minDaysLive: number; lossShareVsHoldout: number; minImpressions: number };
    siteWideWeekOverWeek: { dropShare: number; minPriorWeekClicks: number };
    changeTypeLossRate: { maxLossRate: number; minScoredNonNeutral: number };
  };
  holdout: {
    share: number;
    weeks: number;
    neverWithhold: { minImpressions28d: number; anyNonBrandClick: boolean };
    crawlAgeBucketsDays: number[];
  };
  outcomes: { minAgeDays: number; neutralBandRatio: number };
  calibration: { requiredOwnerMergedLoopPrs: number };
  brandTerms: string[];
  excludedFromOptimization: string[];
  primarySourceDomains: string[];
  /** Competitor hosts: allowed as sources only for competitor claims in app/vs pages. */
  vendorDomains: string[];
  paths: {
    agentAllow: string[];
    agentDeny: string[];
    articleFileNames: string[];
    forbiddenFileNames: string[];
    importAllow: string[];
    importDenyPrefixes: string[];
  };
  sweepCommits: { shas: string[] };
  ctrCurve: { points: Array<[number, number]> };
};

let cached: SeoConfig | null = null;

export function loadConfig(file: string = path.join(SEO_DIR, "config.json")): SeoConfig {
  if (cached && file === path.join(SEO_DIR, "config.json")) return cached;
  const parsed = JSON.parse(readFileSync(file, "utf8")) as SeoConfig;
  if (!parsed?.site?.base || !parsed?.caps || !parsed?.thresholds) {
    throw new Error(`${file} is missing required sections (site, caps, thresholds)`);
  }
  if (file === path.join(SEO_DIR, "config.json")) cached = parsed;
  return parsed;
}

/**
 * Glob match used for the path fences. Same semantics as the bash `[[ == ]]`
 * match in .github/workflows/ci.yml gate 1a: `*` matches any run of
 * characters INCLUDING `/`. Keep the two in step — a fence that disagrees with
 * CI is worse than no fence, because it teaches that red is normal.
 */
export function globMatch(pattern: string, value: string): boolean {
  const re = new RegExp(`^${pattern.split("*").map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`);
  return re.test(value);
}

export function matchesAny(patterns: string[], value: string): boolean {
  return patterns.some((pattern) => globMatch(pattern, value));
}
