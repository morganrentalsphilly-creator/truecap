export type SeoMode = "observe" | "recommend" | "auto";
export type RiskClass = "low" | "medium" | "high";
export type FreshnessClass =
  | "competitor"
  | "rates"
  | "tax-law"
  | "market-data"
  | "annual-data"
  | "year-specific"
  | "evergreen-formula";

export type PageType =
  | "product"
  | "calculator"
  | "article"
  | "topic-hub"
  | "glossary"
  | "market"
  | "state"
  | "comparison"
  | "persona"
  | "methodology"
  | "author"
  | "landing-page";

export type SeoPage = {
  path: string;
  canonical: string;
  pageType: PageType;
  topicCluster: string;
  searchIntent: string;
  primaryQuery: string | null;
  secondaryQueries: string[];
  businessRelevance: number;
  author: string | null;
  reviewer: { name: string; credentials: string; reviewedAt: string } | null;
  createdAt: string | null;
  modifiedAt: string | null;
  lastFactualReviewAt: string | null;
  freshnessClass: FreshnessClass;
  riskClass: RiskClass;
  indexable: boolean;
  inSitemap: boolean;
  sourceIds: string[];
  status: "ACTIVE" | "STALE_REVIEW_REQUIRED" | "DRAFT" | "MERGE_CANDIDATE" | "RETIRED";
};

export type SourceCategory =
  | "TAX"
  | "LENDING"
  | "RATES"
  | "HUD"
  | "STATE_LAW"
  | "PROPERTY_TAX"
  | "COMPETITOR"
  | "TRUECAP_PRODUCT"
  | "MARKET_DATA";

export type SeoSource = {
  id: string;
  url: string;
  organization: string;
  category: SourceCategory;
  refreshIntervalDays: number;
  authorityLevel: "PRIMARY" | "OFFICIAL" | "SECONDARY";
  affectedPaths: string[];
  expectedFacts: string[];
  riskClass: RiskClass;
};

export type GscMetric = {
  query: string;
  page: string | null;
  intentClass: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number | null;
  analyzerStarts?: number;
};

export type SeoOpportunityType =
  | "STRIKING_DISTANCE"
  | "HIGH_IMPRESSION_LOW_CTR"
  | "QUERY_GAP"
  | "CONTENT_DECAY"
  | "CANNIBALIZATION"
  | "ORPHAN_OR_WEAKLY_LINKED"
  | "CONVERSION_OPPORTUNITY"
  | "LINK_ASSET_OPPORTUNITY";

export type SeoOpportunity = {
  type: SeoOpportunityType;
  key: string;
  page: string | null;
  query: string | null;
  score: number;
  evidence: Record<string, unknown>;
  recommendedAction: string;
  riskClass: RiskClass;
};

export type EvidenceClaim = {
  claim: string;
  sourceId: string;
  sourceDate: string | null;
  retrievedAt: string;
  confidence: number;
  primarySource: boolean;
  contradictionChecked: boolean;
};
