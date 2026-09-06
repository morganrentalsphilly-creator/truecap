/**
 * Tag-driven related content (docs/site-overhaul.md Phase 8.4).
 *
 * Every surface is described by the tokens in its slug/title; related items
 * are the strongest token overlaps across the three registries. Pure and
 * deterministic, so the same page always links the same neighbours:
 *   tools ↔ glossary ↔ two blog posts
 *   blog  → one tool + the analyzer
 *   vs    → pricing + the sample deal
 */
import { BLOG_POSTS, type BlogPost } from "@/app/blog/page";
import { CALCULATOR_REGISTRY, type CalculatorEntry } from "@/lib/calculator-registry";
import { GLOSSARY, type GlossaryEntry } from "@/lib/glossary";

export type RelatedKind = "tool" | "glossary" | "blog" | "vs";

export type RelatedLink = {
  href: string;
  label: string;
  kind: "tool" | "glossary" | "blog" | "analyzer" | "pricing" | "sample";
};

const STOP = new Set([
  "a", "an", "and", "the", "of", "for", "to", "in", "on", "vs", "your", "you", "how", "what", "is", "it",
  "rental", "property", "real", "estate", "calculator", "guide", "explained", "truecap", "2026", "with",
  "from", "by", "or", "at", "as", "be", "do", "does", "should", "can", "i", "my", "we", "our",
]);

const ALIASES: Record<string, string> = {
  coc: "cash-on-cash",
  "cash-on-cash": "cashoncash",
  cashoncash: "cashoncash",
  noi: "noi",
  dscr: "dscr",
  grm: "grm",
  brrrr: "brrrr",
  arv: "arv",
  piti: "piti",
  fmr: "hud",
};

export function tokensOf(...texts: Array<string | null | undefined>): Set<string> {
  const out = new Set<string>();
  for (const text of texts) {
    if (!text) continue;
    for (const raw of text.toLowerCase().replace(/[^a-z0-9%-]+/g, " ").split(/\s+/)) {
      const t = raw.replace(/^-+|-+$/g, "");
      if (!t || STOP.has(t) || t.length < 3) continue;
      out.add(ALIASES[t] ?? t);
      // "cap-rate" → "cap", "rate" as well as the joined form.
      if (t.includes("-")) {
        const parts = t.split("-");
        for (const part of parts) if (part.length > 2 && !STOP.has(part)) out.add(part);
        // Adjacent pairs too, so "cap-rate-calculator" matches "cap-rate".
        for (let i = 0; i + 1 < parts.length; i += 1) out.add(`${parts[i]}${parts[i + 1]}`);
        out.add(t.replace(/-/g, ""));
      }
    }
  }
  return out;
}

function overlap(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const t of a) if (b.has(t)) n += 1;
  return n;
}

function rank<T>(items: T[], subject: Set<string>, key: (item: T) => Set<string>, take: number, exclude: (item: T) => boolean): T[] {
  return items
    .filter((item) => !exclude(item))
    .map((item) => ({ item, score: overlap(subject, key(item)) }))
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, take)
    .map((x) => x.item);
}

const availablePosts = (): BlogPost[] => BLOG_POSTS.filter((p) => p.available);
const glossaryEntries = (): GlossaryEntry[] => Object.values(GLOSSARY);

const toolLink = (c: CalculatorEntry): RelatedLink => ({ href: `/tools/${c.slug}`, label: c.shortTitle || c.title, kind: "tool" });
const glossaryLink = (g: GlossaryEntry): RelatedLink => ({ href: `/glossary/${g.slug}`, label: g.term, kind: "glossary" });
const blogLink = (p: BlogPost): RelatedLink => ({ href: `/blog/${p.slug}`, label: p.title, kind: "blog" });
const ANALYZER: RelatedLink = { href: "/analyze", label: "Analyze a deal free", kind: "analyzer" };
const PRICING: RelatedLink = { href: "/pricing", label: "See Pro pricing", kind: "pricing" };
const SAMPLE: RelatedLink = { href: "/analyze?sample=1", label: "See the sample deal", kind: "sample" };

export function getRelatedContent(input: { kind: RelatedKind; slug: string; title?: string }): RelatedLink[] {
  const subject = tokensOf(input.slug, input.title);
  const tools = CALCULATOR_REGISTRY;
  const glossary = glossaryEntries();
  const posts = availablePosts();

  switch (input.kind) {
    case "tool": {
      const g = rank(glossary, subject, (e) => tokensOf(e.slug, e.term), 2, () => false).map(glossaryLink);
      const p = rank(posts, subject, (e) => tokensOf(e.slug, e.title), 2, () => false).map(blogLink);
      const t = rank(tools, subject, (e) => tokensOf(e.slug, e.title), 1, (e) => e.slug === input.slug).map(toolLink);
      return [...g, ...p, ...t, ANALYZER];
    }
    case "glossary": {
      const t = rank(tools, subject, (e) => tokensOf(e.slug, e.title), 2, () => false).map(toolLink);
      const p = rank(posts, subject, (e) => tokensOf(e.slug, e.title), 2, () => false).map(blogLink);
      const g = rank(glossary, subject, (e) => tokensOf(e.slug, e.term), 1, (e) => e.slug === input.slug).map(glossaryLink);
      return [...t, ...p, ...g, ANALYZER];
    }
    case "blog": {
      const t = rank(tools, subject, (e) => tokensOf(e.slug, e.title), 1, () => false).map(toolLink);
      const g = rank(glossary, subject, (e) => tokensOf(e.slug, e.term), 1, () => false).map(glossaryLink);
      return [...t, ...g, ANALYZER];
    }
    case "vs":
      return [PRICING, SAMPLE, ANALYZER];
  }
}
