#!/usr/bin/env node
/** Persists a healthcheck JSON artifact into the service-role-only SEO tables. */

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const positional = args.filter((value) => !value.startsWith("--"));
const skipLinks = args.includes("--skip-links");
const input = path.resolve(ROOT, positional[0] ?? "artifacts/seo/healthcheck.json");
const output = path.resolve(ROOT, positional[1] ?? "artifacts/seo/health-persist.json");
const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function done(report, code = 0) {
  mkdirSync(path.dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  process.exit(code);
}

if (!supabaseUrl || !serviceKey) {
  done({ status: "DISABLED", missing: [!supabaseUrl ? "SUPABASE_URL" : null, !serviceKey ? "SUPABASE_SERVICE_ROLE_KEY" : null].filter(Boolean) });
}

let report;
try {
  report = JSON.parse(readFileSync(input, "utf8"));
} catch (error) {
  done({ status: "FAILED", error: `Could not read ${input}: ${error.message}` }, 1);
}

async function upsert(table, onConflict, rows) {
  let count = 0;
  for (let index = 0; index < rows.length; index += 500) {
    const batch = rows.slice(index, index + 500);
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}?on_conflict=${onConflict}`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(batch),
    });
    if (!response.ok) throw new Error(`${table} upsert failed (${response.status}): ${(await response.text()).slice(0, 400)}`);
    count += batch.length;
  }
  return count;
}

try {
  const crawledAt = report.generatedAt ?? new Date().toISOString();
  const issueByUrl = new Map();
  for (const finding of report.findings ?? []) {
    const pathMatch = String(finding.detail ?? "").match(/(\/[^\s,)]+)/);
    if (!pathMatch) continue;
    const issues = issueByUrl.get(pathMatch[1]) ?? [];
    issues.push(finding);
    issueByUrl.set(pathMatch[1], issues);
  }
  const pages = (report.pages ?? []).map((page) => ({
    crawled_at: crawledAt,
    url: page.path,
    http_status: page.httpStatus ?? null,
    canonical: page.canonical ?? null,
    noindex: Boolean(page.noindex),
    in_sitemap: Boolean(page.inSitemap),
    title: page.title ?? null,
    h1: page.h1 ?? null,
    schema_types: page.schemaTypes ?? [],
    crawl_depth: page.crawlDepth ?? null,
    issues: issueByUrl.get(page.path) ?? [],
  }));
  const snapshotDate = crawledAt.slice(0, 10);
  const edges = (skipLinks ? [] : report.linkGraph?.edges ?? []).map((edge) => ({
    snapshot_date: snapshotDate,
    source: edge.source,
    target: edge.target,
    anchor: edge.anchor || "(image or empty)",
    placement: edge.placement,
    depth_from_home: report.linkGraph?.depth?.[edge.target] ?? null,
  }));
  const crawlRows = await upsert("seo_crawl_results", "crawled_at,url", pages);
  const linkRows = await upsert("seo_internal_links", "snapshot_date,source,target,anchor,placement", edges);
  done({ status: "SUCCEEDED", crawledAt, crawlRows, linkRows, linksSkipped: skipLinks });
} catch (error) {
  done({ status: "FAILED", error: error instanceof Error ? error.message : String(error) }, 1);
}
