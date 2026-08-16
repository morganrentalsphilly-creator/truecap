#!/usr/bin/env node
/**
 * Incremental Google Search Console ingestion into seo_gsc_daily.
 *
 * - Official Search Console API, read-only scope.
 * - One finalised day at a time, so pagination cannot silently mix/truncate days.
 * - Dimensions: date, query, page, device, country.
 * - Idempotent Supabase REST upsert on the table's composite primary key.
 * - Missing credentials produce an explicit DISABLED artifact and exit 0.
 * - No credential is ever serialised to disk or logs.
 *
 * Usage:
 *   node scripts/seo/gsc-ingest.mjs                 # last 7 finalised days
 *   node scripts/seo/gsc-ingest.mjs --days 480      # historical backfill
 *   node scripts/seo/gsc-ingest.mjs --end 2026-08-10 --days 1
 */

import { createSign, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
};
const clampInt = (value, fallback, min, max) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};

const SITE = flag("site", process.env.GSC_SITE ?? "sc-domain:usetruecap.com");
const DAYS = clampInt(flag("days", process.env.SEO_GSC_BACKFILL_DAYS), 7, 1, 480);
const DATA_LAG_DAYS = 3;
const OUT = path.resolve(ROOT, flag("out", "artifacts/seo/gsc-ingest.json"));
const ROW_LIMIT = 25_000;
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const API = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`;

const isoDate = (date) => date.toISOString().slice(0, 10);
const addDays = (date, days) => new Date(date.getTime() + days * 86_400_000);
const defaultEnd = addDays(new Date(), -DATA_LAG_DAYS);
const endValue = flag("end", isoDate(defaultEnd));
const endDate = new Date(`${endValue}T00:00:00.000Z`);
const startDate = addDays(endDate, -(DAYS - 1));

function writeReport(report) {
  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

if (!/^\d{4}-\d{2}-\d{2}$/.test(endValue) || !Number.isFinite(endDate.getTime()) || isoDate(endDate) !== endValue) {
  writeReport({
    status: "FAILED",
    generatedAt: new Date().toISOString(),
    site: SITE,
    error: "--end must be a real ISO calendar date in YYYY-MM-DD form",
  });
  process.exit(1);
}

function base64Url(input) {
  return Buffer.from(input).toString("base64url");
}

function loadServiceAccount() {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.client_email || !parsed.private_key) throw new Error("required fields missing");
    return parsed;
  } catch (error) {
    throw new Error(`GSC_SERVICE_ACCOUNT_JSON is not a valid service-account JSON object: ${error.message}`);
  }
}

async function accessToken(account) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(
    JSON.stringify({
      iss: account.client_email,
      scope: SCOPE,
      aud: account.token_uri ?? "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signingInput = `${header}.${claims}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const assertion = `${signingInput}.${signer.sign(account.private_key).toString("base64url")}`;
  const response = await fetch(account.token_uri ?? "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) {
    throw new Error(`Google OAuth failed (${response.status}): ${body.error_description ?? body.error ?? "unknown error"}`);
  }
  return body.access_token;
}

async function queryDay(token, date, ingestionRunId) {
  const rows = [];
  for (let startRow = 0; ; startRow += ROW_LIMIT) {
    const response = await fetch(API, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        startDate: date,
        endDate: date,
        dimensions: ["date", "query", "page", "device", "country"],
        type: "web",
        dataState: "final",
        rowLimit: ROW_LIMIT,
        startRow,
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = body?.error?.message ?? "unknown error";
      throw new Error(`Search Analytics failed for ${date} (${response.status}): ${message}`);
    }
    const page = body.rows ?? [];
    rows.push(
      ...page.map((row) => ({
        date: row.keys?.[0] ?? date,
        query: row.keys?.[1] ?? "",
        page: row.keys?.[2] ?? "",
        device: row.keys?.[3] ?? "unknown",
        country: row.keys?.[4] ?? "unknown",
        clicks: row.clicks ?? 0,
        impressions: row.impressions ?? 0,
        ctr: row.ctr ?? 0,
        position: row.position ?? null,
        ingestion_run_id: ingestionRunId,
        ingested_at: new Date().toISOString(),
      })),
    );
    if (page.length < ROW_LIMIT) break;
  }
  return rows;
}

async function upsertRows(rows) {
  const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return { persisted: false, reason: "missing_supabase_credentials", rows: 0 };
  let persisted = 0;
  for (let index = 0; index < rows.length; index += 500) {
    const batch = rows.slice(index, index + 500);
    const response = await fetch(
      `${supabaseUrl}/rest/v1/seo_gsc_daily?on_conflict=date,query,page,device,country`,
      {
        method: "POST",
        headers: {
          apikey: serviceKey,
          authorization: `Bearer ${serviceKey}`,
          "content-type": "application/json",
          prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify(batch),
      },
    );
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 600);
      throw new Error(`Supabase seo_gsc_daily upsert failed (${response.status}): ${detail}`);
    }
    persisted += batch.length;
  }
  return { persisted: true, reason: null, rows: persisted };
}

async function pruneSupersededDay(date, ingestionRunId) {
  const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const query = new URLSearchParams({
    date: `eq.${date}`,
    or: `(ingestion_run_id.neq.${ingestionRunId},ingestion_run_id.is.null)`,
  });
  const response = await fetch(`${supabaseUrl}/rest/v1/seo_gsc_daily?${query}`, {
    method: "DELETE",
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      prefer: "return=minimal",
    },
  });
  if (!response.ok) {
    throw new Error(`Supabase GSC day reconciliation failed (${response.status}): ${(await response.text()).slice(0, 600)}`);
  }
}

const missing = [];
if (!process.env.GSC_SERVICE_ACCOUNT_JSON) missing.push("GSC_SERVICE_ACCOUNT_JSON");
if (!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)) missing.push("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
if (missing.length) {
  writeReport({
    status: "DISABLED",
    generatedAt: new Date().toISOString(),
    site: SITE,
    missing,
    action: "Add the listed GitHub Actions secrets after applying the SEO control-plane migration.",
  });
  process.exit(0);
}

try {
  const account = loadServiceAccount();
  const token = await accessToken(account);
  let queried = 0;
  let persisted = 0;
  const days = [];
  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    const day = isoDate(date);
    const ingestionRunId = randomUUID();
    const rows = await queryDay(token, day, ingestionRunId);
    const result = await upsertRows(rows);
    // Only after every current row is safely upserted, remove rows Google no
    // longer returns for that finalized day. This converges late corrections
    // without a delete-before-insert window that could erase a day on failure.
    await pruneSupersededDay(day, ingestionRunId);
    queried += rows.length;
    persisted += result.rows;
    days.push({ date: day, rows: rows.length });
    console.error(`[gsc-ingest] ${day}: ${rows.length} rows`);
  }
  writeReport({
    status: "SUCCEEDED",
    generatedAt: new Date().toISOString(),
    site: SITE,
    range: { startDate: isoDate(startDate), endDate: isoDate(endDate), dataLagDays: DATA_LAG_DAYS },
    queriedRows: queried,
    persistedRows: persisted,
    days,
  });
} catch (error) {
  writeReport({
    status: "FAILED",
    generatedAt: new Date().toISOString(),
    site: SITE,
    range: { startDate: isoDate(startDate), endDate: isoDate(endDate) },
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
}
