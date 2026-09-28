import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/**
 * F4 — structured data done right, checked on RENDERED pages.
 *
 *   · FAQPage only where the Q&A is visible: every FAQPage question and its
 *     answer appear, in that order, in the page's main text, and every
 *     visible <details> question on a page with FAQPage markup is in it
 *     (FAQPage entries == visible FAQ). A registry-driven sample of every
 *     template: all posts, /vs pages, glossary terms and released tools, the
 *     home and pricing FAQs, a sample of market, state and strategy pages,
 *     and the hubs.
 *   · Every released tool emits ONE application entity, @id
 *     `${siteUrl}/tools/<slug>#app`; /analyze points at the homepage's
 *     SoftwareApplication (/#software) by @id, and /pricing declares its Offers
 *     on that same entity (F4 review).
 *   · BreadcrumbList: Home › Hub on the six hubs, Home › Comparisons › page
 *     on every /vs page.
 *   · The glossary's DefinedTermSet has @id /glossary#terms and every
 *     DefinedTerm points at it.
 *   · Every sampled page passes the loop's own validator (jsonld-validate),
 *     whose HowTo rule (F4 review) needs every step's text on the page.
 */

// Pricing reads the session and Stripe display prices; the homepage's client
// islands call next/navigation hooks. Neither changes the structured data.
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
}));
vi.mock("@/lib/stripe/display-prices", () => ({ loadStripeDisplayPrice: async () => null }));
// The unreleased calculators call permanentRedirect before they render; the
// release-readiness check below renders them past it (and only there).
const navigation = vi.hoisted(() => ({ renderPastRedirects: false }));
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return {
    ...actual,
    useRouter: () => ({ push() {}, replace() {}, prefetch() {}, back() {}, forward() {}, refresh() {} }),
    usePathname: () => "/",
    useSearchParams: () => new URLSearchParams(),
    permanentRedirect: ((...args: Parameters<typeof actual.permanentRedirect>) =>
      navigation.renderPastRedirects ? (undefined as never) : actual.permanentRedirect(...args)) as typeof actual.permanentRedirect,
  };
});

// Imported after the mocks (vi.mock is hoisted above these).
import { ActionConfirmProvider } from "@/components/ui/action-confirm-dialog";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { CALCULATOR_REGISTRY, UNRELEASED_UNDERWRITING_CALCULATORS } from "@/lib/calculator-registry";
import { CITY_STRATEGY_COMBOS } from "@/lib/city-strategy-combos";
import { GLOSSARY } from "@/lib/glossary";
import { BESPOKE_MARKETS, MARKET_CITIES } from "@/lib/markets/cities";
import { getSiteUrl } from "@/lib/site-url";
import { STATES } from "@/lib/states";
import { extractLdJsonBlocks, normalizeVisible, validateHtml } from "../../seo/scripts/jsonld-validate.ts";
import { decodeEntities, mainHtml, mainTextOf } from "../../seo/scripts/lib/html.ts";
import { jsonLdNodes, missingSchema } from "../../scripts/seo/structured-data-expectations.mjs";

const ROOT = process.cwd();
const SITE = getSiteUrl();
/** The tests that render many pages in one case; each page takes tens of ms, more on a busy runner. */
const MANY_PAGES_MS = 60_000;

type Node = Record<string, unknown>;
type Faq = { q: string; a: string };

async function render(element: ReactElement | Promise<ReactElement>): Promise<string> {
  const node = await element;
  try {
    return renderToStaticMarkup(node);
  } catch (error) {
    // A server component that suspends (pricing's async islands) needs the streaming prerender.
    if (!/suspended/i.test(String((error as Error).message))) throw error;
    const { prerenderToNodeStream } = await import("react-dom/static");
    const { prelude } = await prerenderToNodeStream(node);
    let html = "";
    for await (const chunk of prelude) html += chunk.toString();
    return html;
  }
}

/** Every JSON-LD node on the page (top-level blocks, @graph members, nested objects). */
function ldNodes(html: string): Node[] {
  const out: Node[] = [];
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== "object") return;
    out.push(value as Node);
    for (const child of Object.values(value as Node)) if (child && typeof child === "object") visit(child);
  };
  for (const block of extractLdJsonBlocks(html)) visit(block.value);
  return out;
}

/** The top-level JSON-LD objects (each block, or each @graph member). */
function ldTopLevel(html: string): Node[] {
  return extractLdJsonBlocks(html).flatMap((block) => {
    const value = block.value as Node | Node[];
    const roots = Array.isArray(value) ? value : [value];
    return roots.flatMap((root) => (Array.isArray(root["@graph"]) ? (root["@graph"] as Node[]) : [root]));
  });
}

const typeOf = (node: Node) => (Array.isArray(node["@type"]) ? (node["@type"] as string[]) : [node["@type"] as string]);
const isRef = (node: Node) => "@id" in node && Object.keys(node).every((k) => k === "@id" || k === "@type" || k === "@context");

function faqsOf(html: string): Faq[] {
  return ldNodes(html)
    .filter((node) => typeOf(node).includes("FAQPage"))
    .flatMap((node) =>
      ((node.mainEntity as Node[]) ?? []).map((question) => {
        const answer = (Array.isArray(question.acceptedAnswer) ? question.acceptedAnswer[0] : question.acceptedAnswer) as Node | undefined;
        return { q: String(question.name ?? ""), a: String(answer?.text ?? "") };
      }),
    );
}

/** The visible question of every <details> in <main>. */
function detailsQuestions(html: string): string[] {
  return [...mainHtml(html).matchAll(/<details\b[^>]*>\s*<summary\b[^>]*>([\s\S]*?)<\/summary>/gi)]
    // The "+" toggle glyph is aria-hidden decoration, not part of the question.
    .map((m) => decodeEntities(m[1].replace(/<span\b[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/span>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim())
    .filter((text) => text.endsWith("?"));
}

/** Problems with a page's FAQPage markup against what the page shows. */
function faqMirrorProblems(html: string): string[] {
  const faqs = faqsOf(html);
  if (faqs.length === 0) return [];
  const visible = normalizeVisible(mainTextOf(html));
  const problems: string[] = [];
  for (const { q, a } of faqs) {
    const qAt = visible.indexOf(normalizeVisible(q));
    if (qAt === -1) {
      problems.push(`question not visible: ${q}`);
      continue;
    }
    if (!a.trim() || visible.indexOf(normalizeVisible(a), qAt) === -1) problems.push(`answer not visible after its question: ${q}`);
  }
  const marked = new Set(faqs.map((f) => normalizeVisible(f.q)));
  for (const question of detailsQuestions(html)) {
    if (!marked.has(normalizeVisible(question))) problems.push(`visible FAQ question missing from FAQPage: ${question}`);
  }
  if (marked.size !== faqs.length) problems.push("FAQPage repeats a question");
  return problems;
}

// ------------------------------------------------------------ the page sets

const isRedirectStub = (file: string) => {
  const source = readFileSync(join(ROOT, file), "utf8");
  return /\b(?:permanentRedirect|redirect)\(/.test(source) && !/<main\b/.test(source);
};
const VS_SLUGS = readdirSync(join(ROOT, "app/vs")).filter((slug) => existsSync(join(ROOT, "app/vs", slug, "page.tsx")) && !isRedirectStub(`app/vs/${slug}/page.tsx`));
const POST_SLUGS = BLOG_POSTS.filter((post) => post.available).map((post) => post.slug);
const TOOL_SLUGS = CALCULATOR_REGISTRY.map((tool) => tool.slug);
const TERM_SLUGS = Object.values(GLOSSARY).map((entry) => entry.slug);
const everyNth = <T,>(list: readonly T[], n: number) => list.filter((_, i) => i % n === 0);

const renderPost = async (slug: string) => render((await import(`@/app/blog/${slug}/page.tsx`)).default({}));
const renderVs = async (slug: string) => render((await import(`@/app/vs/${slug}/page.tsx`)).default({}));
const renderTool = async (slug: string) => render((await import(`@/app/tools/${slug}/page.tsx`)).default({}));
const renderTerm = async (slug: string) => render((await import("@/app/glossary/[slug]/page")).default({ params: Promise.resolve({ slug }) }));
const renderHub = async (hub: string) => render((await import(`@/app/${hub}/page.tsx`)).default());

/** [path, render] for the registry-driven sample of every template that can carry FAQPage. */
function faqSample(): Array<[string, () => Promise<string>]> {
  const pages: Array<[string, () => Promise<string>]> = [];
  for (const slug of POST_SLUGS) pages.push([`/blog/${slug}`, () => renderPost(slug)]);
  for (const slug of VS_SLUGS) pages.push([`/vs/${slug}`, () => renderVs(slug)]);
  for (const slug of TERM_SLUGS) pages.push([`/glossary/${slug}`, () => renderTerm(slug)]);
  for (const slug of TOOL_SLUGS) pages.push([`/tools/${slug}`, () => renderTool(slug)]);
  pages.push(["/tools/rental-property-spreadsheet", () => renderTool("rental-property-spreadsheet")]);
  pages.push(["/", async () => render((await import("@/app/page")).default())]);
  pages.push(["/pricing", async () => render((await import("@/app/pricing/page")).default())]);
  pages.push(["/why-truecap", async () => render((await import("@/app/why-truecap/page")).default())]);
  for (const city of everyNth(MARKET_CITIES, 25)) {
    pages.push([`/markets/${city.slug}`, async () => render((await import("@/app/markets/[city]/page")).default({ params: Promise.resolve({ city: city.slug }) }))]);
  }
  for (const { slug } of everyNth(BESPOKE_MARKETS, 6)) pages.push([`/markets/${slug}`, async () => render((await import(`@/app/markets/${slug}/page.tsx`)).default())]);
  for (const state of everyNth(Object.values(STATES), 8)) {
    pages.push([`/states/${state.slug}`, async () => render((await import("@/app/states/[slug]/page")).default({ params: Promise.resolve({ slug: state.slug }) }))]);
  }
  for (const combo of everyNth(CITY_STRATEGY_COMBOS, 9)) {
    pages.push([
      `/markets/${combo.citySlug}/${combo.strategy}`,
      async () => render((await import("@/app/markets/[city]/[strategy]/page")).default({ params: Promise.resolve({ city: combo.citySlug, strategy: combo.strategy }) })),
    ]);
  }
  for (const hub of HUBS) pages.push([`/${hub.path}`, () => renderHub(hub.path)]);
  return pages;
}

const HUBS = [
  { path: "blog", name: "Blog" },
  { path: "tools", name: "Free Tools" },
  { path: "vs", name: "Comparisons" },
  { path: "markets", name: "Markets" },
  { path: "states", name: "States" },
  { path: "glossary", name: "Glossary" },
] as const;

// ------------------------------------------------------------ the checks

describe("the FAQ mirror check itself", () => {
  const page = (ld: Faq[], main: string) =>
    `<html><body><script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: ld.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) })}</script><main>${main}</main></body></html>`;

  it("passes a visible FAQ and names each way the markup can drift", () => {
    const qa = [{ q: "What is NOI?", a: "Income minus operating expenses." }];
    expect(faqMirrorProblems(page(qa, "<details><summary>What is NOI?</summary><p>Income minus operating <b>expenses</b>.</p></details>"))).toEqual([]);
    expect(faqMirrorProblems(page(qa, "<p>No questions here.</p>"))).toEqual(["question not visible: What is NOI?"]);
    expect(faqMirrorProblems(page(qa, "<h2>What is NOI?</h2><p>A paraphrase of the answer.</p>"))).toEqual(["answer not visible after its question: What is NOI?"]);
    expect(faqMirrorProblems(page(qa, "<details><summary>What is NOI?</summary>Income minus operating expenses.</details><details><summary>What is DSCR?</summary>x</details>"))).toEqual([
      "visible FAQ question missing from FAQPage: What is DSCR?",
    ]);
  });
});

describe("FAQPage entries == the visible FAQ, on a registry-driven sample of every template", () => {
  const sample = faqSample();

  it("covers every template", () => {
    expect(POST_SLUGS.length).toBeGreaterThanOrEqual(75);
    expect(VS_SLUGS.length).toBeGreaterThanOrEqual(38);
    expect(TERM_SLUGS.length).toBeGreaterThanOrEqual(44);
    expect(TOOL_SLUGS.length).toBeGreaterThanOrEqual(10);
    expect(sample.length).toBeGreaterThan(POST_SLUGS.length + VS_SLUGS.length + TERM_SLUGS.length + TOOL_SLUGS.length + 15);
  });

  it.each(sample)("%s", async (path, renderPage) => {
    const html = await renderPage();
    expect(html.length, path).toBeGreaterThan(1000);
    expect(faqMirrorProblems(html), path).toEqual([]);
    // The loop's own validator agrees: no invisible FAQ, no missing required property, no breakout,
    // and the page's F4 values (structured-data-expectations.mjs, shared with the healthcheck).
    expect(validateHtml(html, path), path).toEqual([]);
    // …and the healthcheck's required @types for the route family.
    expect(missingSchema(path, jsonLdNodes(html)), path).toEqual([]);
  });

  it("keeps FAQPage where the FAQ is visible (the check is not passing on empty pages)", async () => {
    const withFaq: string[] = [];
    for (const [path, renderPage] of [
      ["/", sample.find(([p]) => p === "/")![1]],
      ["/pricing", sample.find(([p]) => p === "/pricing")![1]],
      ["/blog/what-is-a-good-dscr", () => renderPost("what-is-a-good-dscr")],
      ["/vs/dealcheck", () => renderVs("dealcheck")],
      ["/tools/1-percent-rule-calculator", () => renderTool("1-percent-rule-calculator")],
    ] as Array<[string, () => Promise<string>]>) {
      if (faqsOf(await renderPage()).length > 0) withFaq.push(path);
    }
    expect(withFaq).toEqual(["/", "/pricing", "/blog/what-is-a-good-dscr", "/vs/dealcheck", "/tools/1-percent-rule-calculator"]);
  }, MANY_PAGES_MS);

  it("/vs answers in the markup are the visible answers, word for word (no hand-kept paraphrase)", async () => {
    const html = await renderVs("airdna");
    const faqs = faqsOf(html);
    expect(faqs.length).toBeGreaterThan(0);
    expect(faqs[0].a).toBe(
      "No — they solve different problems. AirDNA is STR market + revenue data; TrueCap is the underwriting calculator. AirDNA feeds revenue inputs; TrueCap runs the cap rate / DSCR / cash flow math on top. STR investors typically use both.",
    );
    // No HTML entity survives into a question or an answer (they render literally).
    for (const slug of VS_SLUGS) {
      for (const { q, a } of faqsOf(await renderVs(slug))) expect(`${q} ${a}`, slug).not.toMatch(/&[a-z]+;|&#x?[0-9a-f]+;/i);
    }
  }, MANY_PAGES_MS);
});

const APP_TYPES = ["SoftwareApplication", "WebApplication", "MobileApplication"];

/** A tool page's one application entity: stable @id, its url, the Organization by @id, the free Offer. */
function expectOneToolApp(html: string, slug: string): void {
  const apps = ldNodes(html).filter((node) => !isRef(node) && typeOf(node).some((t) => APP_TYPES.includes(t)));
  const appId = `${SITE}/tools/${slug}#app`;
  expect(apps.map((app) => app["@id"]), slug).toEqual([appId]);
  const [app] = apps;
  expect(app.url).toBe(`${SITE}/tools/${slug}`);
  expect(app.publisher).toEqual({ "@id": `${SITE}/#organization` });
  expect(app.offers).toMatchObject({ "@type": "Offer", price: "0", priceCurrency: "USD" });
  // A WebPage on the same page points at the app instead of standing beside it.
  for (const page of ldTopLevel(html).filter((node) => typeOf(node).includes("WebPage"))) expect(page.mainEntity, slug).toEqual({ "@id": appId });
}

describe("tools: one application entity with a stable @id", () => {
  it.each(TOOL_SLUGS)("/tools/%s", async (slug) => {
    expectOneToolApp(await renderTool(slug), slug);
  });

  it("/pricing declares its Offers on the homepage's product entity (/#software), not on a second app", async () => {
    const pricing = await render((await import("@/app/pricing/page")).default());
    const apps = ldNodes(pricing).filter((node) => !isRef(node) && typeOf(node).some((t) => APP_TYPES.includes(t)));
    expect(apps.map((app) => app["@id"])).toEqual([`${SITE}/#software`]);
    const home = await render((await import("@/app/page")).default());
    const [product] = ldNodes(home).filter((node) => node["@id"] === `${SITE}/#software` && !isRef(node));
    // Same entity, same identity: type, name and url agree, so the two declarations merge.
    for (const key of ["@type", "name", "url", "applicationCategory", "operatingSystem"]) expect(apps[0][key], key).toEqual(product[key]);
    expect((apps[0].offers as Node[]).map((offer) => offer.name)).toContain("TrueCap Free");
    expect(validateHtml(pricing, "/pricing")).toEqual([]);
  }, MANY_PAGES_MS);

  it("/analyze points at the homepage's SoftwareApplication by @id and declares no second app", async () => {
    const { default: AnalyzePage } = await import("@/app/analyze/page");
    const html = await render(<ActionConfirmProvider>{AnalyzePage()}</ActionConfirmProvider>);
    const pages = ldTopLevel(html).filter((node) => typeOf(node).includes("WebPage"));
    expect(pages).toHaveLength(1);
    expect(pages[0].mainEntity).toEqual({ "@id": `${SITE}/#software` });
    expect(pages[0].url).toBe(`${SITE}/analyze`);
    expect(ldNodes(html).filter((node) => !isRef(node) && typeOf(node).includes("SoftwareApplication"))).toEqual([]);
    expect(validateHtml(html, "/analyze")).toEqual([]);
    // …and the entity it names is the one the homepage declares.
    const home = await render((await import("@/app/page")).default());
    expect(ldNodes(home).filter((node) => node["@id"] === `${SITE}/#software` && !isRef(node)).map((node) => node["@type"])).toEqual(["SoftwareApplication"]);
  }, MANY_PAGES_MS);
});

describe("unreleased calculators already carry the released structured data", () => {
  /**
   * These pages permanentRedirect today, so nothing here is served. The day a
   * slug leaves UNRELEASED_UNDERWRITING_CALCULATORS its page goes live as it
   * is: before the F4 review they still emitted two app entities without @id,
   * and dscr/noi an FAQPage for questions they never show. Rendered past the
   * redirect, each must already pass the released tools' checks.
   */
  const renderUnreleased = async (slug: string) => {
    navigation.renderPastRedirects = true;
    try {
      return await renderTool(slug);
    } finally {
      navigation.renderPastRedirects = false;
    }
  };

  it("they are still unreleased and still redirect (the bypass is test-only)", async () => {
    expect(UNRELEASED_UNDERWRITING_CALCULATORS.length).toBeGreaterThanOrEqual(8);
    for (const slug of UNRELEASED_UNDERWRITING_CALCULATORS) {
      expect(TOOL_SLUGS, slug).not.toContain(slug);
      await expect(renderTool(slug), slug).rejects.toMatchObject({ digest: expect.stringMatching(/^NEXT_REDIRECT/) });
    }
  }, MANY_PAGES_MS);

  it.each(UNRELEASED_UNDERWRITING_CALCULATORS)("/tools/%s", async (slug) => {
    const path = `/tools/${slug}`;
    const html = await renderUnreleased(slug);
    expect(html.length, path).toBeGreaterThan(1000);
    expectOneToolApp(html, slug);
    expect(faqMirrorProblems(html), path).toEqual([]);
    expect(validateHtml(html, path), path).toEqual([]);
    expect(missingSchema(path, jsonLdNodes(html)), path).toEqual([]);
  });
});

describe("HowTo only where its steps are visible", () => {
  it("/playbook's HowTo steps are the playbook's visible steps (the one HowTo left)", async () => {
    const html = await render((await import("@/app/playbook/page")).default());
    const steps = ldNodes(html).filter((node) => typeOf(node).includes("HowToStep"));
    expect(steps.length).toBeGreaterThanOrEqual(3);
    // jsonld-validate's HowTo rule: each step's text (here its name) is in the main text.
    expect(validateHtml(html, "/playbook")).toEqual([]);
  });
});

describe("BreadcrumbList on the hubs and 3-level /vs trails", () => {
  const trail = (html: string) =>
    ldNodes(html)
      .filter((node) => typeOf(node).includes("BreadcrumbList"))
      .map((node) => (node.itemListElement as Node[]).map((item) => [item.position, item.name, item.item]));

  it.each(HUBS)("/$path: TrueCap › $name", async ({ path, name }) => {
    expect(trail(await renderHub(path))).toEqual([
      [
        [1, "TrueCap", SITE],
        [2, name, `${SITE}/${path}`],
      ],
    ]);
  });

  it.each(VS_SLUGS)("/vs/%s: TrueCap › Comparisons › page", async (slug) => {
    const [crumbs, ...rest] = trail(await renderVs(slug));
    expect(rest).toEqual([]);
    expect(crumbs.slice(0, 2)).toEqual([
      [1, "TrueCap", SITE],
      [2, "Comparisons", `${SITE}/vs`],
    ]);
    expect(crumbs[2][0]).toBe(3);
    expect(crumbs[2][2]).toBe(`${SITE}/vs/${slug}`);
    expect(crumbs).toHaveLength(3);
  });
});

describe("glossary: one DefinedTermSet, every DefinedTerm in it", () => {
  const SET_ID = `${SITE}/glossary#terms`;

  it("the hub declares the set with @id /glossary#terms and each listed term points at it", async () => {
    const html = await renderHub("glossary");
    const sets = ldNodes(html).filter((node) => typeOf(node).includes("DefinedTermSet") && !isRef(node));
    expect(sets.map((set) => set["@id"])).toEqual([SET_ID]);
    const terms = (sets[0].hasDefinedTerm as Node[]) ?? [];
    expect(terms.length).toBeGreaterThanOrEqual(TERM_SLUGS.length);
    for (const term of terms) expect((term.inDefinedTermSet as Node)?.["@id"], String(term.name)).toBe(SET_ID);
  });

  it.each(TERM_SLUGS)("/glossary/%s: its DefinedTerm is in the hub's set", async (slug) => {
    const terms = ldNodes(await renderTerm(slug)).filter((node) => typeOf(node).includes("DefinedTerm"));
    expect(terms).toHaveLength(1);
    expect((terms[0].inDefinedTermSet as Node)?.["@id"]).toBe(SET_ID);
  });
});
