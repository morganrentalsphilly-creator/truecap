/**
 * Regex-level HTML extraction for rendered TrueCap pages.
 *
 * Deliberately not a DOM parser: the toolkit is dependency-free, and the
 * pages are server-rendered Next output with a stable shape. Every extractor
 * returns null/empty when it cannot find its target rather than guessing, and
 * callers treat null as "unknown", never as a violation.
 *
 * "Main text" is the visible text inside <main> (falling back to <article>,
 * then <body>) with <script>, <style>, <nav>, <header>, <footer>, <svg> and
 * <noscript> removed. Its hash is the per-URL "significant change" signal the
 * honest-lastmod logic keys on: header/footer chrome changes do not move it.
 */

import { createHash } from "node:crypto";
import { toPath } from "./sitemap.ts";

export type LinkRecord = { href: string; target: string; anchor: string; placement: "navigation" | "footer" | "contextual" };
export type ExternalLink = { href: string; host: string; anchor: string };

export type PageExtract = {
  title: string | null;
  metaDescription: string | null;
  h1: string[];
  canonical: string | null;
  robots: string | null;
  jsonLd: unknown[];
  jsonLdTypes: string[];
  jsonLdParseErrors: number;
  datePublished: string | null;
  dateModified: string | null;
  visibleUpdatedDate: string | null;
  mainText: string;
  wordCount: number;
  mainHash: string;
  internalLinks: LinkRecord[];
  externalLinks: ExternalLink[];
};

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'", "#x27": "'", mdash: "—", ndash: "–", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", hellip: "…" };

export function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, name: string) => {
    const lower = name.toLowerCase();
    if (lower in ENTITIES) return ENTITIES[lower];
    if (lower.startsWith("#x")) return String.fromCodePoint(parseInt(lower.slice(2), 16));
    if (lower.startsWith("#")) return String.fromCodePoint(parseInt(lower.slice(1), 10));
    return whole;
  });
}

const stripTags = (html: string): string => decodeEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

function metaContent(html: string, attr: "name" | "property", key: string): string | null {
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0];
    const keyMatch = new RegExp(`\\b${attr}=["']${key}["']`, "i").test(tag);
    if (!keyMatch) continue;
    const content = /\bcontent=["']([^"']*)["']/i.exec(tag)?.[1];
    if (content !== undefined) return decodeEntities(content).trim();
  }
  return null;
}

function removeBlocks(html: string, tags: string[]): string {
  let out = html;
  for (const tag of tags) out = out.replace(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, "gi"), " ");
  return out;
}

export function mainHtml(html: string): string {
  const main = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html)?.[1];
  if (main) return main;
  const article = /<article\b[^>]*>([\s\S]*?)<\/article>/i.exec(html)?.[1];
  if (article) return article;
  return /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html)?.[1] ?? html;
}

export function mainTextOf(html: string): string {
  const cleaned = removeBlocks(mainHtml(html), ["script", "style", "nav", "header", "footer", "svg", "noscript", "template"]);
  return stripTags(cleaned.replace(/<(br|\/p|\/li|\/h[1-6]|\/tr|\/div)\b[^>]*>/gi, " \n "));
}

export function countWords(text: string): number {
  return (text.match(/[\p{L}\p{N}][\p{L}\p{N}'’.,%$-]*/gu) ?? []).length;
}

export function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function collectTypes(node: unknown, out: Set<string>): void {
  if (Array.isArray(node)) {
    for (const item of node) collectTypes(item, out);
    return;
  }
  if (!node || typeof node !== "object") return;
  const record = node as Record<string, unknown>;
  const t = record["@type"];
  if (typeof t === "string") out.add(t);
  else if (Array.isArray(t)) for (const x of t) if (typeof x === "string") out.add(x);
  for (const value of Object.values(record)) if (value && typeof value === "object") collectTypes(value, out);
}

function firstDate(nodes: unknown[], key: "datePublished" | "dateModified"): string | null {
  const stack = [...nodes];
  while (stack.length) {
    const node = stack.shift();
    if (Array.isArray(node)) {
      stack.push(...node);
      continue;
    }
    if (!node || typeof node !== "object") continue;
    const record = node as Record<string, unknown>;
    if (typeof record[key] === "string") return record[key] as string;
    for (const value of Object.values(record)) if (value && typeof value === "object") stack.push(value);
  }
  return null;
}

export function extractJsonLd(html: string): { blocks: unknown[]; errors: number } {
  const blocks: unknown[] = [];
  let errors = 0;
  for (const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      blocks.push(JSON.parse(m[1]));
    } catch {
      errors += 1;
    }
  }
  return { blocks, errors };
}

const VISIBLE_DATE_RE = /\b(?:Updated|Last updated|Reviewed|Last reviewed)\b[^<]{0,20}?((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.? \d{1,2},? \d{4}|\d{4}-\d{2}-\d{2})/i;

export function extractLinks(html: string, pageUrl: string): { internal: LinkRecord[]; external: ExternalLink[] } {
  const origin = new URL(pageUrl).origin;
  const internal = new Map<string, LinkRecord>();
  const external: ExternalLink[] = [];
  for (const m of html.matchAll(/<a\b([^>]*?)\bhref=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const raw = m[2].trim();
    if (!raw || raw.startsWith("#") || /^(?:mailto|tel|javascript):/i.test(raw)) continue;
    let resolved: URL;
    try {
      resolved = new URL(decodeEntities(raw), pageUrl);
    } catch {
      continue;
    }
    const anchor = stripTags(m[4]).slice(0, 240);
    if (resolved.origin !== origin) {
      if (/^https?:$/.test(resolved.protocol)) external.push({ href: resolved.href, host: resolved.hostname.toLowerCase(), anchor });
      continue;
    }
    const index = m.index ?? 0;
    const inOpen = (name: string): boolean => html.lastIndexOf(`<${name}`, index) > html.lastIndexOf(`</${name}`, index);
    const placement: LinkRecord["placement"] = inOpen("footer") ? "footer" : inOpen("nav") ? "navigation" : "contextual";
    const target = toPath(resolved.href);
    const key = `${target}\u0000${anchor}\u0000${placement}`;
    internal.set(key, { href: raw, target, anchor, placement });
  }
  return { internal: [...internal.values()], external };
}

export function extractPage(html: string, pageUrl: string): PageExtract {
  const title = (() => {
    const t = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
    return t === undefined ? null : stripTags(t);
  })();
  const canonical = (() => {
    for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
      if (/\brel=["']canonical["']/i.test(m[0])) return /\bhref=["']([^"']+)["']/i.exec(m[0])?.[1] ?? null;
    }
    return null;
  })();
  const { blocks, errors } = extractJsonLd(html);
  const types = new Set<string>();
  collectTypes(blocks, types);
  const mainText = mainTextOf(html);
  const links = extractLinks(html, pageUrl);
  const visible = VISIBLE_DATE_RE.exec(stripTags(mainHtml(html)))?.[1] ?? null;
  return {
    title,
    metaDescription: metaContent(html, "name", "description"),
    h1: [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => stripTags(m[1])).filter(Boolean),
    canonical,
    robots: metaContent(html, "name", "robots"),
    jsonLd: blocks,
    jsonLdTypes: [...types].sort(),
    jsonLdParseErrors: errors,
    datePublished: firstDate(blocks, "datePublished") ?? metaContent(html, "property", "article:published_time"),
    dateModified: firstDate(blocks, "dateModified") ?? metaContent(html, "property", "article:modified_time"),
    visibleUpdatedDate: visible,
    mainText,
    wordCount: countWords(mainText),
    mainHash: sha256(mainText),
    internalLinks: links.internal,
    externalLinks: links.external,
  };
}
