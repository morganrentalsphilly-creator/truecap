#!/usr/bin/env node
/**
 * Summarize an audit crawl folder into summary.md + summary.json.
 *   node audit/summarize.mjs artifacts/audit/<run>/<role>
 */
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: node audit/summarize.mjs <artifacts dir>");
  process.exit(2);
}
const read = (f) =>
  fs.existsSync(path.join(dir, f))
    ? fs.readFileSync(path.join(dir, f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l))
    : [];
const pages = read("pages.jsonl");
const assets = read("assets.jsonl");
const dark = read("dark-scheme.jsonl");
const links = fs.existsSync(path.join(dir, "links.json")) ? JSON.parse(fs.readFileSync(path.join(dir, "links.json"), "utf8")) : null;

const byPath = new Map();
for (const p of pages) {
  if (!byPath.has(p.path)) byPath.set(p.path, []);
  byPath.get(p.path).push(p);
}
const widths = [...new Set(pages.map((p) => p.width))].sort((a, b) => a - b);

// Noise we deliberately do not count as a defect (documented in AUDIT.md).
const NOISE = [
  /Failed to load resource: net::ERR_CONNECTION_REFUSED.*127\.0\.0\.1:54321/, // loopback Supabase is intentionally absent
  /127\.0\.0\.1:54321/,
];
const isNoise = (t) => NOISE.some((re) => re.test(t));

const group = (items, keyFn) => {
  const m = new Map();
  for (const it of items) {
    const k = keyFn(it);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(it);
  }
  return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
};

const consoleErrors = pages.flatMap((p) => p.consoleErrors.filter((e) => !isNoise(e.text)).map((e) => ({ ...e, path: p.path, width: p.width })));
const consoleWarnings = pages.flatMap((p) => p.consoleWarnings.filter((e) => !isNoise(e.text)).map((e) => ({ ...e, path: p.path, width: p.width })));
const pageErrors = pages.flatMap((p) => p.pageErrors.map((t) => ({ text: t, path: p.path, width: p.width })));
const hydration = pages.flatMap((p) => p.hydration.map((t) => ({ text: t, path: p.path, width: p.width })));
const failed = pages.flatMap((p) => p.failedRequests.filter((r) => !isNoise(r.url)).map((r) => ({ ...r, path: p.path, width: p.width })));
const overflow = pages.filter((p) => p.overflow?.overflows);
const errors = pages.filter((p) => p.error);
const non200 = pages.filter((p) => p.status !== null && p.status >= 400 && !/not-a-real|does-not-exist|Y2FwLXJhdG|cap-rate-calculator$/.test(p.path));
const axe = pages.flatMap((p) => (p.axe ?? []).map((v) => ({ ...v, path: p.path, width: p.width })));
const axeSerious = axe.filter((v) => v.impact === "serious" || v.impact === "critical");
const textFlags = pages.filter((p) => p.width === widths[0] && p.textFlags.length).map((p) => ({ path: p.path, flags: p.textFlags }));
const missingAlt = pages.filter((p) => p.width === widths[0]).flatMap((p) => p.images.filter((i) => i.alt === null && i.visible).map((i) => ({ path: p.path, src: i.src })));
const oversized = pages.filter((p) => p.width === 375).flatMap((p) => p.images.filter((i) => i.visible && i.naturalWidth > 0 && i.naturalWidth > i.renderedWidth * 2.5 && (i.bytes ?? 0) > 80 * 1024).map((i) => ({ path: p.path, src: i.src, natural: i.naturalWidth, rendered: i.renderedWidth, kb: Math.round((i.bytes ?? 0) / 1024) })));
const first = (p) => byPath.get(p)?.[0];
const seo = [...byPath.keys()].map((p) => {
  const r = first(p);
  return {
    path: p,
    status: r.status,
    redirected: r.redirected,
    finalUrl: r.finalUrl,
    title: r.title,
    titleLen: r.title?.length ?? 0,
    description: r.description,
    descLen: r.description?.length ?? 0,
    canonical: r.canonical,
    robots: r.robots,
    ogImage: r.ogImage,
    twitterCard: r.twitterCard,
    h1Count: r.h1Count,
    jsonLdInvalid: r.jsonLd?.invalid ?? 0,
    lang: r.lang,
    words: Math.round((r.bodyTextLength ?? 0) / 6),
  };
});
const indexable = seo.filter((s) => s.status === 200 && !s.redirected && !/noindex/i.test(s.robots ?? ""));
const dupTitles = group(indexable, (s) => s.title ?? "").filter(([, v]) => v.length > 1);
const dupDesc = group(indexable, (s) => s.description ?? "").filter(([, v]) => v.length > 1);
const noDesc = indexable.filter((s) => !s.description);
const noCanonical = indexable.filter((s) => !s.canonical);
const noOg = indexable.filter((s) => !s.ogImage);
const badH1 = seo.filter((s) => s.status === 200 && !s.redirected && s.h1Count !== 1);
const longTitle = indexable.filter((s) => s.titleLen > 65);
const longDesc = indexable.filter((s) => s.descLen > 165);

const md = [];
md.push(`# Crawl summary — ${path.relative(process.cwd(), dir)}`);
md.push("");
md.push(`- Routes: **${byPath.size}** · page-visits: **${pages.length}** · widths: ${widths.join(", ")}`);
md.push(`- Navigation errors (crawler could not load): **${errors.length}**`);
md.push(`- Unexpected non-2xx main responses: **${non200.length}**`);
md.push(`- Console errors: **${consoleErrors.length}** (${group(consoleErrors, (e) => e.text.slice(0, 80)).length} distinct) · warnings: **${consoleWarnings.length}**`);
md.push(`- Uncaught page errors: **${pageErrors.length}** · hydration signals: **${hydration.length}**`);
md.push(`- Failed / 4xx / 5xx requests: **${failed.length}** (${group(failed, (r) => r.url.replace(/\?.*$/, "")).length} distinct URLs)`);
md.push(`- Horizontal overflow page-visits: **${overflow.length}**`);
md.push(`- axe violations: **${axe.length}** (serious/critical: **${axeSerious.length}**, ${group(axeSerious, (v) => v.id).length} rules)`);
md.push(`- Visible images without alt attribute: **${missingAlt.length}** · oversized images at 375px: **${oversized.length}**`);
md.push(`- Suspicious text flags: **${textFlags.length}** pages`);
if (links) {
  const bi = links.internal.filter((r) => r.status === null || r.status >= 400);
  const be = links.external.filter((r) => r.status === null || (r.status >= 400 && !r.unverifiable));
  const un = links.external.filter((r) => r.unverifiable);
  const bimg = links.images.filter((r) => r.status === null || r.status >= 400);
  md.push(`- Links: internal ${links.internal.length} (broken **${bi.length}**) · external ${links.external.length} (broken **${be.length}**, bot-blocked ${un.length}) · images ${links.images.length} (broken **${bimg.length}**)`);
}
md.push(`- SEO (indexable ${indexable.length}): duplicate titles ${dupTitles.length}, duplicate descriptions ${dupDesc.length}, missing description ${noDesc.length}, missing canonical ${noCanonical.length}, missing og:image ${noOg.length}, h1≠1 ${badH1.length}, title>65 ${longTitle.length}, desc>165 ${longDesc.length}`);
md.push("");

const section = (title, rows, fmt, limit = 40) => {
  md.push(`## ${title} (${rows.length})`);
  md.push("");
  if (!rows.length) {
    md.push("_none_");
  } else {
    for (const r of rows.slice(0, limit)) md.push(`- ${fmt(r)}`);
    if (rows.length > limit) md.push(`- … ${rows.length - limit} more`);
  }
  md.push("");
};

section("Navigation errors", errors, (p) => `\`${p.path}\` @${p.width}: ${p.error}`);
section("Unexpected non-2xx", non200, (p) => `${p.status} \`${p.path}\` @${p.width} → ${p.finalUrl}`);
section("Console errors (grouped)", group(consoleErrors, (e) => e.text.slice(0, 160)), ([text, items]) => `×${items.length} \`${text.replace(/`/g, "'")}\` — e.g. \`${items[0].path}\`@${items[0].width}${items[0].location ? ` (${items[0].location.slice(-60)})` : ""}`);
section("Console warnings (grouped)", group(consoleWarnings, (e) => e.text.slice(0, 160)), ([text, items]) => `×${items.length} \`${text.replace(/`/g, "'")}\` — e.g. \`${items[0].path}\`@${items[0].width}`);
section("Uncaught page errors (grouped)", group(pageErrors, (e) => e.text.slice(0, 160)), ([text, items]) => `×${items.length} \`${text.replace(/`/g, "'")}\` — e.g. \`${items[0].path}\`@${items[0].width}`);
section("Hydration signals", hydration, (h) => `\`${h.path}\`@${h.width}: ${h.text.slice(0, 200)}`);
section("Failed / 4xx / 5xx requests (grouped by URL)", group(failed, (r) => `${r.status ?? r.errorText} ${r.url.replace(/\?.*$/, "")}`), ([k, items]) => `×${items.length} ${k} — e.g. \`${items[0].path}\`@${items[0].width} (${items[0].resourceType})`);
section("Horizontal overflow", overflow, (p) => `\`${p.path}\` @${p.width}: scrollWidth ${p.overflow.scrollWidth} > ${p.overflow.clientWidth}`);
section("axe serious/critical (grouped by rule)", group(axeSerious, (v) => `${v.impact}:${v.id}`), ([k, items]) => `×${items.length} ${k} — ${items[0].help}; e.g. \`${items[0].path}\`@${items[0].width} → ${items[0].targets[0] ?? ""}`);
section("axe moderate/minor (grouped by rule)", group(axe.filter((v) => v.impact !== "serious" && v.impact !== "critical"), (v) => `${v.impact}:${v.id}`), ([k, items]) => `×${items.length} ${k} — ${items[0].help}; e.g. \`${items[0].path}\``);
section("Images without alt (visible)", group(missingAlt, (i) => i.src), ([src, items]) => `×${items.length} ${src} — e.g. \`${items[0].path}\``);
section("Oversized images at 375px (natural > 2.5× rendered, > 80 KB)", oversized, (i) => `\`${i.path}\` ${i.src} natural ${i.natural}px rendered ${i.rendered}px ${i.kb} KB`);
section("Suspicious text", textFlags, (t) => `\`${t.path}\`: ${t.flags.map((f) => `"…${f}…"`).join(" | ")}`);
section("SEO: h1 count ≠ 1", badH1, (s) => `\`${s.path}\` h1×${s.h1Count}`);
section("SEO: duplicate titles", dupTitles, ([t, items]) => `"${t}" — ${items.map((i) => `\`${i.path}\``).join(", ")}`);
section("SEO: duplicate descriptions", dupDesc, ([t, items]) => `"${t.slice(0, 80)}…" — ${items.map((i) => `\`${i.path}\``).join(", ")}`);
section("SEO: missing description", noDesc, (s) => `\`${s.path}\``);
section("SEO: missing canonical", noCanonical, (s) => `\`${s.path}\``);
section("SEO: missing og:image", noOg, (s) => `\`${s.path}\``);
section("SEO: title > 65 chars", longTitle, (s) => `\`${s.path}\` (${s.titleLen}) ${s.title}`);
section("SEO: description > 165 chars", longDesc, (s) => `\`${s.path}\` (${s.descLen})`);
section("Non-HTML endpoints", assets, (a) => `${a.status ?? "ERR"} \`${a.path}\` ${a.contentType ?? ""} ${a.bytes ?? ""}B${a.error ? ` ${a.error}` : ""}`);
section("Dark-scheme emulation probe", dark, (d) => `\`${d.path}\`@${d.width}: html.class="${d.htmlClass ?? ""}" body bg ${d.bodyBg} color ${d.bodyColor}${d.error ? ` ERROR ${d.error}` : ""}`);
if (links) {
  section("Broken internal links", links.internal.filter((r) => r.status === null || r.status >= 400), (r) => `${r.status ?? "ERR"} \`${r.path}\` ← ${r.sources.join(", ")}${r.sourceCount > 5 ? ` (+${r.sourceCount - 5})` : ""}`);
  section("Internal redirect chains", links.internal.filter((r) => r.chain?.length), (r) => `\`${r.path}\` → ${r.chain.map((c) => `${c.status} ${c.to}`).join(" → ")} (${r.sourceCount} refs)`);
  section("Broken external links", links.external.filter((r) => r.status === null || (r.status >= 400 && !r.unverifiable)), (r) => `${r.status ?? "ERR"} ${r.url} ← ${r.sources.join(", ")}${r.error ? ` ${r.error}` : ""}`);
  section("Unverifiable external links (bot-blocked)", links.external.filter((r) => r.unverifiable), (r) => `${r.status} ${r.url}`);
  section("Broken images", links.images.filter((r) => r.status === null || r.status >= 400), (r) => `${r.status ?? "ERR"} ${r.key} ← ${r.sources.join(", ")}`);
  section("Images over 300 KB", links.images.filter((r) => (r.bytes ?? 0) > 300 * 1024), (r) => `${Math.round(r.bytes / 1024)} KB ${r.key} ← ${r.sources[0]}`);
}
fs.writeFileSync(path.join(dir, "summary.md"), md.join("\n"));
fs.writeFileSync(
  path.join(dir, "summary.json"),
  JSON.stringify({ routes: byPath.size, visits: pages.length, consoleErrors: consoleErrors.length, consoleWarnings: consoleWarnings.length, pageErrors: pageErrors.length, hydration: hydration.length, failedRequests: failed.length, overflow: overflow.length, axe: axe.length, axeSerious: axeSerious.length, missingAlt: missingAlt.length, navigationErrors: errors.length, non200: non200.length }, null, 2),
);
console.log(md.slice(0, 14).join("\n"));
