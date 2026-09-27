/**
 * performance-read.mjs — how the control plane reads GSC rows back out of
 * Supabase, and how it decides whether what it read is usable.
 *
 * Why this exists (2026-09-27): PostgREST caps every response at the
 * project's max-rows (Supabase's default is 1,000) whatever the Range header
 * asks for. control-plane.mjs asked for 5,000, got 1,000, read "1000 < 5000"
 * as the last page and kept only the OLDEST 1,000 rows of its 60-day window
 * (date ascending). From 2026-08-30 the current 28-day window was therefore
 * empty — 0 clicks, 0 queries — while the run still reported SUCCEEDED,
 * because "available" only meant "at least one row".
 *
 * Pure functions, so lib/__tests__/seo-control-plane-paging.test.ts can run
 * them against a fake capped server.
 */

/**
 * Reads every row of a paged source. `fetchPage(start, end)` returns the rows
 * for the inclusive Range start-end — possibly FEWER than asked for, because
 * the server caps the page size. So the offset advances by what actually came
 * back, and only an empty page ends the read. The caller's query must have a
 * total order (the primary key), or rows can move between pages.
 */
export async function readAllPages(fetchPage, { pageSize = 1000, maxPages = 500 } = {}) {
  const out = [];
  let start = 0;
  for (let page = 0; page < maxPages; page += 1) {
    const rows = await fetchPage(start, start + pageSize - 1);
    if (!Array.isArray(rows) || rows.length === 0) return out;
    out.push(...rows);
    start += rows.length;
  }
  // A partial read is exactly the failure this module exists to prevent.
  throw new Error(`readAllPages: more than ${maxPages} pages; refusing a partial read`);
}

/**
 * Whether the rows read support this cycle's performance numbers. The cycle is
 * SUCCEEDED only when the current window has rows AND the newest row is recent;
 * otherwise DEGRADED with a reason the status issue shows.
 */
export function assessPerformanceData(rows, { currentFrom, currentTo, staleBefore }) {
  let newestDate = null;
  let currentWindowRows = 0;
  for (const row of rows) {
    if (newestDate === null || row.date > newestDate) newestDate = row.date;
    if (row.date >= currentFrom && row.date <= currentTo) currentWindowRows += 1;
  }
  let reason = null;
  if (rows.length === 0) reason = "no GSC rows in Supabase for the last 60 days (is gsc-ingest running?)";
  else if (newestDate < staleBefore) reason = `GSC data is stale: the newest row is ${newestDate}, before ${staleBefore}`;
  else if (currentWindowRows === 0) reason = `no GSC rows in the current window ${currentFrom}..${currentTo}`;
  return { available: reason === null, reason, newestDate, currentWindowRows };
}
