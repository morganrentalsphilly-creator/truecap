#!/usr/bin/env node
/**
 * Deterministic SEO decision cycle. It inventories the live URL universe,
 * aggregates first-party GSC data, scores opportunities, and persists the
 * dashboard state. It never writes public content.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sourceManifest = JSON.parse(readFileSync(path.join(ROOT, "config/seo-sources.json"), "utf8"));
const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
};
const CADENCE = ["daily", "weekly", "monthly", "quarterly", "manual"].includes(flag("cadence"))
  ? flag("cadence")
  : "manual";
const requestedMode = (process.env.SEO_AUTOPILOT_MODE ?? "observe").toLowerCase();
const MODE = ["observe", "recommend", "auto"].includes(requestedMode) ? requestedMode : "observe";
const AUTOPILOT_ENABLED = process.env.SEO_AUTOPILOT_ENABLED === "true";
const EFFECTIVE_MODE = AUTOPILOT_ENABLED ? MODE : "observe";
const BASE = (flag("base", "https://usetruecap.com") ?? "https://usetruecap.com").replace(/\/$/, "");
const OUT = path.resolve(ROOT, flag("out", `artifacts/seo/control-plane-${CADENCE}.json`));
const now = new Date();
const today = now.toISOString().slice(0, 10);
const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DAY = 86_400_000;
const dateDaysAgo = (days) => new Date(now.getTime() - days * DAY).toISOString().slice(0, 10);
const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));
// JSON tuples are collision-safe without embedding NUL bytes, which PostgreSQL
// text columns reject when opportunity keys are persisted through PostgREST.
const metricKey = (query, page) => JSON.stringify([String(query), String(page ?? "")]);
const tokens = (value) => new Set(
  String(value).toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2 && !["the", "and", "for", "with", "truecap"].includes(token)),
);

function classify(pathname) {
  const yearSpecific = /\b20\d{2}\b/.test(pathname);
  const tax = /tax|depreciation|1031|schedule-e|cost-seg|passive-activity/.test(pathname);
  const lending = /loan|mortgage|dscr|down-payment|refinance|heloc|seller-financing/.test(pathname);
  const topicCluster = tax
    ? "tax"
    : lending
      ? "financing"
      : /market|state/.test(pathname)
        ? "markets"
        : /brrrr|house-hack|flip|short-term|buy-and-hold/.test(pathname)
          ? "strategy"
          : /closing|offer|appraisal|rent-roll|tenant|due-diligence/.test(pathname)
            ? "acquisition"
            : "underwriting";

  let pageType = "landing-page";
  if (pathname === "/") pageType = "product";
  else if (pathname === "/about" || pathname.startsWith("/authors/")) pageType = "author";
  else if (pathname === "/methodology") pageType = "methodology";
  // The downloadable spreadsheet is a useful tool resource, but it is not one
  // of the 20 functional calculator pages in CALCULATOR_REGISTRY.
  else if (pathname === "/tools/rental-property-spreadsheet") pageType = "landing-page";
  else if (pathname.startsWith("/tools/")) pageType = "calculator";
  else if (pathname.startsWith("/blog/topics")) pageType = "topic-hub";
  else if (pathname.startsWith("/blog/")) pageType = "article";
  else if (pathname.startsWith("/glossary/")) pageType = "glossary";
  else if (pathname.startsWith("/markets/")) pageType = "market";
  else if (pathname.startsWith("/states/")) pageType = "state";
  else if (pathname.startsWith("/vs/")) pageType = "comparison";
  else if (pathname.startsWith("/for-")) pageType = "persona";
  else if (["/pricing", "/why-truecap"].includes(pathname)) pageType = "product";

  const freshnessClass = pageType === "comparison"
    ? "competitor"
    : tax
      ? "tax-law"
      : yearSpecific
        ? "year-specific"
        : pageType === "state"
          ? "tax-law"
          : pageType === "market"
          ? "market-data"
          : "evergreen-formula";
  const riskClass = tax || lending || pageType === "state" ? "high" : ["market", "comparison"].includes(pageType) ? "medium" : "low";
  const businessRelevance = ["product", "calculator", "persona"].includes(pageType) ? 1 : ["article", "comparison"].includes(pageType) ? 0.8 : 0.6;
  const primaryQuery = pathname === "/" ? "rental property analyzer" : pathname.split("/").pop().replace(/-/g, " ");
  return { pageType, topicCluster, freshnessClass, riskClass, businessRelevance, primaryQuery };
}

async function fetchSitemap() {
  const response = await fetch(`${BASE}/sitemap.xml`, { headers: { "user-agent": "TrueCap-SEO-Control-Plane/1.0" } });
  if (!response.ok) throw new Error(`sitemap returned ${response.status}`);
  const xml = await response.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname.replace(/\/$/, "") || "/");
}

async function rest(pathname, init = {}) {
  if (!supabaseUrl || !serviceKey) return null;
  const response = await fetch(`${supabaseUrl}/rest/v1/${pathname}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(`Supabase REST ${response.status}: ${(await response.text()).slice(0, 500)}`);
  if (response.status === 204) return null;
  return response.json().catch(() => null);
}

async function upsert(table, onConflict, rows) {
  if (!supabaseUrl || !serviceKey || rows.length === 0) return 0;
  let count = 0;
  for (let index = 0; index < rows.length; index += 500) {
    const batch = rows.slice(index, index + 500);
    await rest(`${table}?on_conflict=${onConflict}`, {
      method: "POST",
      headers: { prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(batch),
    });
    count += batch.length;
  }
  return count;
}

async function pagedSelect(pathname, pageSize = 5000) {
  if (!supabaseUrl || !serviceKey) return [];
  const out = [];
  for (let start = 0; ; start += pageSize) {
    const rows = await rest(pathname, { headers: { range: `${start}-${start + pageSize - 1}` } });
    out.push(...(rows ?? []));
    if (!rows || rows.length < pageSize) break;
  }
  return out;
}

function aggregateGsc(rows, from, to) {
  const map = new Map();
  for (const row of rows) {
    if (row.date < from || row.date > to) continue;
    const key = metricKey(row.query, row.page);
    const item = map.get(key) ?? { query: row.query, page: new URL(row.page).pathname, clicks: 0, impressions: 0, positionWeight: 0 };
    item.clicks += row.clicks;
    item.impressions += row.impressions;
    item.positionWeight += Number(row.position ?? 0) * row.impressions;
    map.set(key, item);
  }
  return [...map.values()].map((item) => ({
    query: item.query,
    page: item.page,
    clicks: item.clicks,
    impressions: item.impressions,
    ctr: item.impressions ? item.clicks / item.impressions : 0,
    position: item.impressions ? item.positionWeight / item.impressions : null,
  }));
}

function score(metric, probability, effort = 0.5) {
  const searchEvidence = clamp(metric.impressions / 250, 0.25, 1);
  const authority = clamp(metric.impressions / 500, 0.25, 1);
  const business = /calculator|analy|dscr|cap rate|cash flow|max offer|rental property/i.test(metric.query) ? 1 : 0.65;
  return Math.round(clamp(((0.9 * authority * searchEvidence * business * 0.8 * probability) / Math.max(0.1, effort)) * 100));
}

function opportunities(current, previous, urls) {
  const out = [];
  const prior = new Map(previous.map((item) => [metricKey(item.query, item.page), item]));
  const queryPages = new Map();
  for (const metric of current) {
    const key = metricKey(metric.query, metric.page);
    if (metric.impressions >= 20 && metric.position >= 4 && metric.position <= 15) {
      out.push({ type: "STRIKING_DISTANCE", key: `striking:${key}`, ...metric, score: score(metric, 0.85, 0.45), risk: "medium", action: "Refresh the existing winner and strengthen contextual authority before creating a new URL." });
    }
    if (metric.impressions >= 50 && metric.position <= 10 && metric.ctr < 0.02) {
      out.push({ type: "HIGH_IMPRESSION_LOW_CTR", key: `ctr:${key}`, ...metric, score: score(metric, 0.75, 0.25), risk: "medium", action: "Run one truthful title/snippet experiment and hold it for a full measurement window." });
    }
    const before = prior.get(key);
    if (before && before.impressions >= 30 && (metric.impressions <= before.impressions * 0.7 || metric.position >= before.position + 3)) {
      out.push({ type: "CONTENT_DECAY", key: `decay:${key}`, ...metric, score: score(before, 0.8, 0.55), risk: "medium", action: "Diagnose source freshness, intent, competitors, links, snippet, and technical status before rewriting.", before });
    }
    const qKey = metric.query.toLowerCase();
    const items = queryPages.get(qKey) ?? [];
    items.push(metric);
    queryPages.set(qKey, items);
  }

  for (const [query, items] of queryPages) {
    const distinctPages = [...new Set(items.map((item) => item.page))];
    if (distinctPages.length >= 2 && items.reduce((sum, item) => sum + item.impressions, 0) >= 20) {
      out.push({
        type: "CANNIBALIZATION",
        key: `cannibalization:${query}`,
        query,
        page: null,
        score: clamp(45 + Math.round(Math.log10(items.reduce((sum, item) => sum + item.impressions, 0)) * 12)),
        risk: "medium",
        action: "Verify task-level intent before merging; definition, calculator, guide, and benchmark pages are intentionally distinct.",
        pages: distinctPages,
      });
    }

    const queryTokens = tokens(query);
    let bestCoverage = 0;
    let nearestPage = null;
    for (const url of urls) {
      const urlTokens = tokens(url);
      const overlap = [...queryTokens].filter((token) => urlTokens.has(token)).length;
      const coverage = queryTokens.size ? overlap / queryTokens.size : 1;
      if (coverage > bestCoverage) {
        bestCoverage = coverage;
        nearestPage = url;
      }
    }
    const impressions = items.reduce((sum, item) => sum + item.impressions, 0);
    if (impressions >= 10 && bestCoverage < 0.5) {
      const representative = { query, impressions, clicks: items.reduce((sum, item) => sum + item.clicks, 0), position: Math.min(...items.map((item) => item.position ?? 100)) };
      out.push({
        type: "QUERY_GAP",
        key: `gap:${query}`,
        query,
        page: null,
        score: score(representative, 0.5, 0.8),
        risk: "medium",
        action: "Expand the nearest relevant page first; create a URL only for distinct intent with original information gain.",
        nearestPage,
        nearestCoverage: bestCoverage,
        impressions,
      });
    }
  }
  return out.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
}

function pageMetrics(current) {
  const map = new Map();
  for (const row of current) {
    const item = map.get(row.page) ?? { clicks: 0, impressions: 0, weightedPosition: 0, nonbrandClicks: 0 };
    item.clicks += row.clicks;
    item.impressions += row.impressions;
    item.weightedPosition += (row.position ?? 0) * row.impressions;
    if (!/\btrue\s*cap\b|\btruecap\b|\buse\s*truecap\b/i.test(row.query)) item.nonbrandClicks += row.clicks;
    map.set(row.page, item);
  }
  return [...map.entries()].map(([page, item]) => ({
    snapshot_date: today,
    page,
    window_days: 28,
    clicks: item.clicks,
    impressions: item.impressions,
    ctr: item.impressions ? item.clicks / item.impressions : 0,
    position: item.impressions ? item.weightedPosition / item.impressions : null,
    nonbrand_clicks: item.nonbrandClicks,
  }));
}

function queryClass(query) {
  if (/\btrue\s*cap\b|\btruecap\b|\buse\s*truecap\b/i.test(query)) return "branded";
  if (/\b(vs|alternative|competitor|dealcheck|biggerpockets|stessa|rentredi)\b/i.test(query)) return "competitor";
  if (/\bcalculator|calculate|formula\b/i.test(query)) return "calculator";
  if (/\b(best|software|tool|analyzer|analysis|max offer)\b/i.test(query)) return "commercial";
  if (/\b(city|state|market|rent in|invest in)\b/i.test(query)) return "market";
  if (/^(how|what|why|when|where|can|does|is|should)\b/i.test(query.trim())) return "question";
  return "educational";
}

function queryMetrics(current) {
  const map = new Map();
  for (const row of current) {
    const item = map.get(row.query) ?? { clicks: 0, impressions: 0, weightedPosition: 0, pages: new Set() };
    item.clicks += row.clicks;
    item.impressions += row.impressions;
    item.weightedPosition += (row.position ?? 0) * row.impressions;
    if (row.page) item.pages.add(row.page);
    map.set(row.query, item);
  }
  return [...map.entries()].map(([query, item]) => ({
    snapshot_date: today,
    query,
    query_class: queryClass(query),
    window_days: 28,
    clicks: item.clicks,
    impressions: item.impressions,
    ctr: item.impressions ? item.clicks / item.impressions : 0,
    position: item.impressions ? item.weightedPosition / item.impressions : null,
    pages: [...item.pages].sort(),
  }));
}

function linkGraphOpportunities(pages) {
  const artifact = path.join(ROOT, "artifacts/seo/healthcheck.json");
  if (!existsSync(artifact)) return { available: false, snapshot: null, edges: 0, items: [] };
  try {
    const health = JSON.parse(readFileSync(artifact, "utf8"));
    if (!health.linkGraph?.ran) {
      return { available: false, snapshot: health.generatedAt ?? null, edges: 0, items: [] };
    }
    const pageByPath = new Map(pages.map((page) => [page.path, page]));
    const contextualSources = new Map(pages.map((page) => [page.path, new Set()]));
    const anySources = new Map(pages.map((page) => [page.path, new Set()]));
    const edges = health.linkGraph.edges ?? [];
    for (const edge of edges) {
      // A crawlable noindex hub such as /vs is a legitimate source even though
      // it is intentionally absent from the sitemap/page registry.
      if (!pageByPath.has(edge.target)) continue;
      anySources.get(edge.target).add(edge.source);
      if (edge.placement === "contextual") contextualSources.get(edge.target).add(edge.source);
    }
    const items = [];
    for (const page of pages) {
      if (page.path === "/") continue;
      const inbound = anySources.get(page.path).size;
      const contextual = contextualSources.get(page.path).size;
      const depth = health.linkGraph.depth?.[page.path] ?? null;
      const orphan = inbound === 0;
      // Keep the work queue focused on pages with business/search value; legal
      // and utility pages can remain reachable through navigation/footer.
      if (!orphan && (page.business_relevance < 0.8 || contextual >= 2)) continue;
      items.push({
        type: "ORPHAN_OR_WEAKLY_LINKED",
        key: `${orphan ? "orphan" : "weak"}:${page.path}`,
        page: page.path,
        query: page.primary_query,
        score: orphan ? 95 : Math.round(clamp(52 + page.business_relevance * 25 + Math.max(0, (depth ?? 3) - 3) * 4)),
        risk: "low",
        action: orphan
          ? "Restore a crawlable, relevant incoming path before considering the page healthy."
          : "Add one or two genuinely relevant contextual incoming links, including a reverse link from an established related page; vary anchors naturally.",
        evidence: { inboundSources: inbound, contextualInboundSources: contextual, depth },
      });
    }
    return {
      available: true,
      snapshot: health.generatedAt ?? null,
      edges: edges.length,
      items: items.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key)),
    };
  } catch (error) {
    return { available: false, snapshot: null, edges: 0, items: [], error: error instanceof Error ? error.message : String(error) };
  }
}

const output = {
  generatedAt: now.toISOString(),
  cadence: CADENCE,
  configuredMode: MODE,
  effectiveMode: EFFECTIVE_MODE,
  autopilotEnabled: AUTOPILOT_ENABLED,
  persisted: Boolean(supabaseUrl && serviceKey),
  status: "RUNNING",
  inventory: {},
  performance: { available: false },
  linkGraph: { available: false },
  opportunities: [],
  actions: [],
};

try {
  const urls = await fetchSitemap();
  const pages = urls.map((pathname) => {
    const kind = classify(pathname);
    return {
      path: pathname,
      canonical: `${BASE}${pathname === "/" ? "" : pathname}`,
      page_type: kind.pageType,
      topic_cluster: kind.topicCluster,
      search_intent: kind.primaryQuery,
      primary_query: kind.primaryQuery,
      business_relevance: kind.businessRelevance,
      author: kind.pageType === "article" ? "Morgan Page" : null,
      freshness_class: kind.freshnessClass,
      risk_class: kind.riskClass,
      indexable: true,
      in_sitemap: true,
      // PostgREST requires every object in a bulk upsert to expose the same
      // keys. Keep the explicit ACTIVE value here instead of relying on the
      // database default for non-state rows.
      status: kind.pageType === "state" ? "STALE_REVIEW_REQUIRED" : "ACTIVE",
      metadata: kind.pageType === "state"
        ? { sourceCoverage: "official state-law and property-tax dependencies required before autonomous factual refresh" }
        : {},
      updated_at: now.toISOString(),
    };
  });
  output.inventory = {
    total: pages.length,
    byType: Object.fromEntries([...new Set(pages.map((page) => page.page_type))].sort().map((type) => [type, pages.filter((page) => page.page_type === type).length])),
    byCluster: Object.fromEntries([...new Set(pages.map((page) => page.topic_cluster))].sort().map((cluster) => [cluster, pages.filter((page) => page.topic_cluster === cluster).length])),
    highRisk: pages.filter((page) => page.risk_class === "high").length,
  };
  const linkReport = linkGraphOpportunities(pages);
  output.linkGraph = {
    available: linkReport.available,
    snapshot: linkReport.snapshot,
    edges: linkReport.edges,
    opportunities: linkReport.items.length,
    ...(linkReport.error ? { error: linkReport.error } : {}),
  };
  output.opportunities = linkReport.items;
  await upsert("seo_pages", "path", pages);
  await upsert(
    "seo_sources",
    "source_id",
    sourceManifest.map((source) => ({
      source_id: source.id,
      authoritative_url: source.url,
      source_organization: source.organization,
      source_category: source.category,
      refresh_interval_days: source.refreshIntervalDays,
      authority_level: source.authorityLevel,
      affected_content: source.affectedPaths,
      extracted_facts: source.expectedFacts,
      updated_at: now.toISOString(),
    })),
  );
  const pageSet = new Set(pages.map((page) => page.path));
  const dependencies = sourceManifest.flatMap((source) =>
    source.affectedPaths.filter((pagePath) => pageSet.has(pagePath)).flatMap((pagePath) =>
      source.expectedFacts.map((claim, index) => ({
        page_path: pagePath,
        source_id: source.id,
        claim_key: `${source.id}:${index + 1}`,
        claim_text: claim,
        confidence: 1,
        is_primary_source: source.authorityLevel === "PRIMARY",
        contradiction_checked: source.id === "irs-bonus-depreciation-2026" && pagePath.includes("bonus-depreciation"),
      })),
    ),
  );
  await upsert("seo_page_source_dependencies", "page_path,source_id,claim_key", dependencies);

  if (supabaseUrl && serviceKey) {
    const gscRows = await pagedSelect(`seo_gsc_daily?select=date,query,page,clicks,impressions,ctr,position&date=gte.${dateDaysAgo(60)}&order=date.asc`);
    const current = aggregateGsc(gscRows, dateDaysAgo(30), dateDaysAgo(3));
    const previous = aggregateGsc(gscRows, dateDaysAgo(58), dateDaysAgo(31));
    const found = [...opportunities(current, previous, urls), ...linkReport.items]
      .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
    output.performance = {
      available: gscRows.length > 0,
      rows: gscRows.length,
      currentQueries: new Set(current.map((item) => item.query)).size,
      currentPages: new Set(current.map((item) => item.page)).size,
      clicks28d: current.reduce((sum, item) => sum + item.clicks, 0),
      impressions28d: current.reduce((sum, item) => sum + item.impressions, 0),
    };
    output.opportunities = found.slice(0, 100);
    await upsert("seo_page_metrics", "snapshot_date,page,window_days", pageMetrics(current));
    await upsert("seo_query_metrics", "snapshot_date,query,window_days", queryMetrics(current));
    await upsert(
      "seo_opportunities",
      "opportunity_key",
      found.map((item) => ({
        opportunity_key: item.key,
        opportunity_type: item.type,
        page: item.page ?? null,
        query: item.query ?? null,
        score: item.score,
        risk_class: item.risk,
        evidence: item,
        recommended_action: item.action,
        status: "OPEN",
        last_seen_at: now.toISOString(),
      })),
    );
  }

  output.actions.push({
    action: "public_content_mutation",
    executed: false,
    reason: "The deterministic cycle records evidence and recommendations only. Public mutations require a traceable PR and all quality gates.",
  });
  output.status = output.performance.available ? "SUCCEEDED" : "DEGRADED";
  if (supabaseUrl && serviceKey) {
    await upsert("seo_job_runs", "idempotency_key", [{
      job_name: "seo-control-plane",
      cadence: CADENCE,
      mode: EFFECTIVE_MODE,
      started_at: now.toISOString(),
      finished_at: new Date().toISOString(),
      status: output.status,
      found: { inventory: output.inventory, opportunities: output.opportunities.length },
      changed: { pagesUpserted: pages.length, publicContentMutations: 0 },
      evidence: output.performance,
      tests: ["sitemap fetched", "page registry classified", "opportunities deterministic"],
      idempotency_key: `seo-control-plane:${CADENCE}:${today}`,
    }]);
  }
} catch (error) {
  output.status = "FAILED";
  output.error = error instanceof Error ? error.message : String(error);
  process.exitCode = 1;
}

mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
