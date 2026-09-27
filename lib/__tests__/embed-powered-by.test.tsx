/**
 * "Powered by TrueCap" on every embeddable calculator, driven by the registry.
 *
 * Two surfaces carry the credit and both are checked for EVERY embeddable
 * tool, so a tool added to the registry is covered without touching this file:
 *
 *   1. The iframe page (/embed/<slug>) renders a footer link to that tool's own
 *      public page, opening in a new tab.
 *   2. The copy-paste snippet — as rendered and copied by EmbedCodeBlock on the
 *      /embed hub — puts a plain "Powered by <a>TrueCap</a>" line right after
 *      the iframe, linking to the same page.
 *
 * The /embed hub's own claims about the embed are checked against what those
 * surfaces actually render.
 *
 * Everything here renders the real components (no source-text scans), so a
 * moved or renamed builder cannot leave these assertions guarding nothing.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import EmbedPage, {
  dynamicParams,
  generateStaticParams,
} from "@/app/embed/[slug]/page";
import EmbedHubPage from "@/app/embed/page";
import { EmbedCodeBlock } from "@/components/embed/embed-code-block";
import {
  CALCULATOR_COUNT,
  CALCULATOR_REGISTRY,
  EMBEDDABLE_CALCULATORS,
  EMBEDDABLE_COUNT,
  UNRELEASED_UNDERWRITING_CALCULATORS,
} from "@/lib/calculator-registry";
import { EMBED_LIST } from "@/lib/embed-registry";
import { CANONICAL_SITE_URL } from "@/lib/site-url";

type Anchor = { attrs: Record<string, string>; text: string };

function decodeEntities(html: string): string {
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function textOf(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

function anchorsIn(html: string): Anchor[] {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((match) => ({
    attrs: Object.fromEntries(
      [...match[1].matchAll(/([a-zA-Z-]+)="([^"]*)"/g)].map((attr) => [
        attr[1],
        decodeEntities(attr[2]),
      ]),
    ),
    text: textOf(match[2]),
  }));
}

/** The exact strings EmbedCodeBlock displays — and copies. */
function snippetsIn(html: string): string[] {
  return [...html.matchAll(/<code>([\s\S]*?)<\/code>/g)].map((match) =>
    decodeEntities(match[1]),
  );
}

/** The answer text of one /embed FAQ entry, found by its question. */
function faqAnswer(html: string, question: string): string {
  for (const match of html.matchAll(
    /<details\b[^>]*><summary\b[^>]*>([\s\S]*?)<\/summary><p\b[^>]*>([\s\S]*?)<\/p><\/details>/g,
  )) {
    if (textOf(match[1]) === question) return textOf(match[2]);
  }
  throw new Error(`no FAQ entry "${question}"`);
}

/** The inline style of the first <tag> in a snippet, as property -> value. */
function inlineStyleOf(snippet: string, tag: string): Record<string, string> {
  const style = snippet.match(
    new RegExp(`<${tag}\\b[^>]*\\sstyle="([^"]*)"`),
  )?.[1];
  if (style === undefined) throw new Error(`no styled <${tag}> in snippet`);
  return Object.fromEntries(
    style
      .split(";")
      .map((declaration) => declaration.trim())
      .filter(Boolean)
      .map((declaration) => {
        const colon = declaration.indexOf(":");
        return [
          declaration.slice(0, colon).trim(),
          declaration.slice(colon + 1).trim(),
        ];
      }),
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const toolPage = (slug: string) => `${CANONICAL_SITE_URL}/tools/${slug}`;
const poweredByLine = (slug: string) =>
  `Powered by <a href="${toolPage(slug)}">TrueCap</a>`;

async function renderEmbedPage(slug: string): Promise<string> {
  return renderToStaticMarkup(
    await EmbedPage({ params: Promise.resolve({ slug }) }),
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("embed attribution covers every embeddable tool", () => {
  it("iterates the same set the calculator registry calls embeddable", () => {
    expect(EMBED_LIST.length).toBeGreaterThan(0);
    expect(EMBED_LIST).toHaveLength(EMBEDDABLE_COUNT);
    expect(EMBED_LIST.map((entry) => entry.slug).sort()).toEqual(
      EMBEDDABLE_CALCULATORS.map((calculator) => calculator.slug).sort(),
    );
  });

  it.each(EMBED_LIST.map((entry) => [entry.slug] as const))(
    "/embed/%s renders a Powered by TrueCap footer link to its own tool page",
    async (slug) => {
      const html = await renderEmbedPage(slug);
      const footer = html.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/)?.[1];
      expect(footer, "embed page has a footer").toBeTruthy();

      const links = anchorsIn(footer!);
      const poweredBy = links.filter(
        (link) => link.text === "Powered by TrueCap",
      );
      expect(poweredBy).toHaveLength(1);
      expect(poweredBy[0].attrs.href).toBe(toolPage(slug));
      expect(poweredBy[0].attrs.target).toBe("_blank");
      expect(poweredBy[0].attrs.rel).toBe("noopener");

      // No footer link may point at a neighbouring tool's page.
      for (const link of links) {
        expect(new URL(link.attrs.href).pathname).toBe(`/tools/${slug}`);
      }
    },
  );

  it.each(EMBED_LIST.map((entry) => [entry.slug, entry] as const))(
    "the copy control's %s snippet puts the Powered by line right after the iframe",
    (slug, entry) => {
      const html = renderToStaticMarkup(
        <EmbedCodeBlock
          slug={entry.slug}
          title={entry.title}
          siteUrl={CANONICAL_SITE_URL}
          defaultHeight={entry.defaultHeight}
        />,
      );
      const snippets = snippetsIn(html);
      expect(snippets).toHaveLength(1);
      const snippet = snippets[0];

      expect(snippet).toContain(`src="${CANONICAL_SITE_URL}/embed/${slug}"`);
      const afterIframe = snippet.slice(
        snippet.indexOf("</iframe>") + "</iframe>".length,
      );
      expect(afterIframe).toMatch(
        new RegExp(`^\\n<p[^>]*>${escapeRegExp(poweredByLine(slug))}</p>\\n`),
      );
      // One credit, honest anchor text, no rel the partner did not choose.
      expect(snippet.match(/Powered by/g)).toHaveLength(1);
      expect(anchorsIn(snippet)).toEqual([
        { attrs: { href: toolPage(slug) }, text: "TrueCap" },
      ]);
    },
  );
});

describe("the /embed hub", () => {
  it("hands out a snippet with the Powered by line for every embeddable tool on the canonical host", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", CANONICAL_SITE_URL);
    const snippets = snippetsIn(renderToStaticMarkup(EmbedHubPage()));
    expect(snippets).toHaveLength(EMBED_LIST.length);
    for (const entry of EMBED_LIST) {
      const own = snippets.filter((snippet) =>
        snippet.includes(`src="${CANONICAL_SITE_URL}/embed/${entry.slug}"`),
      );
      expect(own, entry.slug).toHaveLength(1);
      expect(own[0]).toContain(poweredByLine(entry.slug));
    }
  });

  it("hands out no snippet at all off the canonical host", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://ci.invalid");
    expect(snippetsIn(renderToStaticMarkup(EmbedHubPage()))).toEqual([]);
  });

  it("only claims what the embed code does", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", CANONICAL_SITE_URL);
    const html = renderToStaticMarkup(EmbedHubPage());
    const text = textOf(html);

    // Counts and the page-only list match today's registry. That alone cannot
    // tell a derived count from a hard-coded one; the "changed registry" test
    // below does.
    const pageOnly = CALCULATOR_REGISTRY.filter((c) => !c.embeddable);
    expect(text).toContain(`${EMBEDDABLE_COUNT} embeddable`);
    expect(text).toContain(`Of ${CALCULATOR_COUNT} TrueCap calculators`);
    expect(text).toContain(`${EMBEDDABLE_COUNT} available`);
    expect(text).toContain(
      `${EMBEDDABLE_COUNT} of our ${CALCULATOR_COUNT} free calculators`,
    );
    for (const calculator of pageOnly) expect(text).toContain(calculator.title);

    // The credit it promises is the one the iframe and the snippet render
    // (the old "Calculator by <a>TrueCap</a>" caption is gone).
    expect(text).toContain("Powered by TrueCap");
    for (const snippet of snippetsIn(html)) {
      expect(snippet).not.toContain("Calculator by <a");
    }

    // The FAQ says the UTM tags ride on the in-frame call to action; they do.
    expect(text).toContain(
      "The 'Underwrite a full property in TrueCap' link inside the calculator carries utm_source=embed",
    );
    const cta = anchorsIn(await renderEmbedPage(EMBED_LIST[0].slug)).find(
      (link) => link.text === "Underwrite a full property in TrueCap",
    );
    expect(cta).toBeDefined();
    expect(new URL(cta!.attrs.href).searchParams.get("utm_source")).toBe(
      "embed",
    );

    // "Send us a note" must reach a person, not the analyzer.
    const note = anchorsIn(html).find((link) => link.text === "Send us a note");
    expect(note?.attrs.href).toMatch(/^mailto:hello@usetruecap\.com/);

    // No ranking promise: the calculator renders in our noindexed iframe.
    expect(text).not.toMatch(/ranks? for/i);
    expect(text).not.toContain("Not in v1");
  });

  it("derives every count from the registry: a changed registry changes the hub", async () => {
    // Releasing BRRRR adds one calculator page and one embed. Re-import the
    // registry and the hub under that flag, so a count typed into the page
    // (instead of read from the registry) no longer matches.
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", CANONICAL_SITE_URL);
    vi.stubEnv("NEXT_PUBLIC_TRUECAP_BRRRR_STRATEGY_MODEL", "true");
    vi.resetModules();
    try {
      const registry = await import("@/lib/calculator-registry");
      const hub = await import("@/app/embed/page");
      const server = await import("react-dom/server");

      // The probe proves nothing unless the registry actually moved.
      expect(registry.EMBEDDABLE_COUNT).toBe(EMBEDDABLE_COUNT + 1);
      expect(registry.CALCULATOR_COUNT).toBe(CALCULATOR_COUNT + 1);

      const embeddable = registry.EMBEDDABLE_COUNT;
      const total = registry.CALCULATOR_COUNT;
      const html = server.renderToStaticMarkup(hub.default());
      const text = textOf(html);
      expect(text).toContain(`${embeddable} embeddable`);
      expect(text).toContain(`Of ${total} TrueCap calculators`);
      expect(text).toContain(`${embeddable} available`);
      expect(text).toContain(`${embeddable} of our ${total} free calculators`);
      expect(snippetsIn(html)).toHaveLength(embeddable);
      expect(hub.metadata.description).toContain(
        `Embed ${embeddable} of TrueCap's free`,
      );
      expect(hub.metadata.openGraph?.description).toContain(
        `${embeddable} free embeddable calculators`,
      );
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });

  it("describes the snippet's inline styles as they are", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", CANONICAL_SITE_URL);
    const html = renderToStaticMarkup(EmbedHubPage());
    const answer = faqAnswer(html, "Can I customize the calculator's look?");
    const snippets = snippetsIn(html);
    expect(snippets).toHaveLength(EMBED_LIST.length);

    // Every property the snippet styles is one the answer accounts for. A new
    // property here means the answer needs a new clause.
    for (const snippet of snippets) {
      const frame = inlineStyleOf(snippet, "iframe");
      expect(Object.keys(frame).sort()).toEqual([
        "border",
        "display",
        "height",
        "max-width",
        "width",
      ]);
      expect(frame).toMatchObject({
        width: "100%",
        "max-width": "640px",
        border: "0",
        display: "block",
      });
      expect(frame.height).toMatch(/^\d+px$/);
      expect(Object.keys(inlineStyleOf(snippet, "p")).sort()).toEqual([
        "color",
        "font",
        "margin",
        "max-width",
      ]);
    }
    expect(answer).toContain(
      "the snippet's inline styles only lay out the frame (full width up to 640px, a starting height that then adjusts to the calculator, no border, on its own line) and set the small gray text of the credit line under it.",
    );
    expect(answer).not.toContain("sets only the frame's width and starting height");
  });

  it("claims no referrer only for the snippet it hands out", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", CANONICAL_SITE_URL);
    const html = renderToStaticMarkup(EmbedHubPage());
    const answer = faqAnswer(html, "Can I track conversions from my embed?");
    const snippets = snippetsIn(html);
    expect(snippets).toHaveLength(EMBED_LIST.length);
    for (const snippet of snippets) {
      expect(snippet).toMatch(/<iframe\b[^>]*\sreferrerpolicy="no-referrer"/);
    }
    // Snippets copied before 2026-08-30 have no referrerpolicy, so their frame
    // request does carry the partner's origin. The claim must not cover them.
    expect(answer).toContain(
      "Snippets copied from this page load the frame with no referrer, so loading the calculator does not tell TrueCap which page it sits on.",
    );
    expect(answer).not.toContain("The frame loads with no referrer");
  });

  it("says a withdrawn calculator's embed stops loading, and it does", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", CANONICAL_SITE_URL);
    const answer = faqAnswer(
      renderToStaticMarkup(EmbedHubPage()),
      "What if the calculator changes?",
    );
    expect(answer).toContain(
      "Snippets for the calculators listed on this page keep working.",
    );
    expect(answer).toContain(
      "If we withdraw a calculator, a frame that still points at it shows TrueCap's 'page not found' page instead.",
    );
    expect(answer).not.toMatch(/copied earlier keep working/);

    // Listed calculators are the only prerendered embed paths, and no other
    // slug is rendered on demand.
    expect(dynamicParams).toBe(false);
    const listed: string[] = (await generateStaticParams()).map(
      (param) => param.slug,
    );
    expect([...listed].sort()).toEqual(
      EMBED_LIST.map((entry) => entry.slug).sort(),
    );

    // Calculators the hub handed out snippets for until 2026-08-28 and has
    // since withdrawn: their frames get the 404 page.
    const withdrawn = [
      ...UNRELEASED_UNDERWRITING_CALCULATORS,
      "brrrr-calculator",
      "rental-property-tax-calculator",
    ].filter((slug) => !listed.includes(slug));
    expect(withdrawn.length).toBeGreaterThanOrEqual(
      UNRELEASED_UNDERWRITING_CALCULATORS.length,
    );
    for (const slug of withdrawn) {
      await expect(renderEmbedPage(slug), slug).rejects.toMatchObject({
        digest: "NEXT_HTTP_ERROR_FALLBACK;404",
      });
    }
  });
});
