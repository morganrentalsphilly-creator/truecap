import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import AboutPage from "@/app/about/page";
import sitemap from "@/app/sitemap";
import { AuthorBio } from "@/components/marketing/author-bio";
import { BlogByline } from "@/components/marketing/blog-byline";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { SourceFirstArticle } from "@/components/marketing/source-first-article";
import { AUTHOR_BIO, AUTHOR_BYLINE_SUFFIX } from "@/lib/author";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { forbiddenGivenName, forbiddenHandle } from "./helpers/founder-identity";
import { mainTextOf } from "../../seo/scripts/lib/html.ts";

/**
 * F1 — the unnamed author, everywhere (founder decision, 2026-09-27: "Stay
 * unnamed. Author = TrueCap Organization. Pages get the unnamed BlogByline
 * plus a name-free bio from seo/author.md").
 *
 *   · seo/author.md (human-editable) and lib/author.ts say the same thing;
 *   · /about renders AUTHOR_BIO, so /about, posts and /vs pages never drift;
 *   · every post in the registry and every /vs/<slug> page renders the
 *     byline once in its header and the bio once at the end of its main
 *     content. Each page is RENDERED, so a post that loses <BlogByline />
 *     (or the block that carries the bio) fails here by name.
 */

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

const norm = (text: string) => text.replace(/\s+/g, " ").trim();
const ENTITIES: Record<string, string> = { "&amp;": "&", "&#x27;": "'", "&#39;": "'", "&quot;": '"', "&lt;": "<", "&gt;": ">", "&nbsp;": " " };
const textOf = (html: string) => norm(html.replace(/<[^>]+>/g, "").replace(/&(?:amp|#x27|#39|quot|lt|gt|nbsp);/g, (e) => ENTITIES[e]));
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

/** The text under `## <heading>` in a Markdown file, up to the next `## ` heading. */
function mdSection(markdown: string, heading: string): string {
  const lines = markdown.split("\n");
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return "";
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith("## "));
  return norm((end === -1 ? rest : rest.slice(0, end)).join("\n"));
}

// ------------------------------------------------------------ source (AST)

function parse(path: string): ts.SourceFile {
  return ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function tagOf(node: ts.Node): string | null {
  if (ts.isJsxElement(node)) return node.openingElement.tagName.getText();
  if (ts.isJsxSelfClosingElement(node)) return node.tagName.getText();
  return null;
}

/** Every JSX element with this tag name (JSX only: a mention in a comment or a string is not a use). */
function jsxElements(sf: ts.SourceFile, tag: string): ts.Node[] {
  const found: ts.Node[] = [];
  const visit = (node: ts.Node): void => {
    if (tagOf(node) === tag) found.push(node);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

/** The element sibling rendered immediately before `node` (whitespace text skipped), or null. */
function previousElementSibling(node: ts.Node): ts.Node | null {
  const parent = node.parent;
  if (!parent || !ts.isJsxElement(parent)) return null;
  const siblings = parent.children.filter((child) => tagOf(child) !== null);
  const index = siblings.indexOf(node as ts.JsxChild);
  return index > 0 ? siblings[index - 1] : null;
}

function importsNamed(sf: ts.SourceFile, name: string, from: string): boolean {
  return sf.statements.some(
    (stmt) =>
      ts.isImportDeclaration(stmt) &&
      ts.isStringLiteral(stmt.moduleSpecifier) &&
      stmt.moduleSpecifier.text === from &&
      !!stmt.importClause?.namedBindings &&
      ts.isNamedImports(stmt.importClause.namedBindings) &&
      stmt.importClause.namedBindings.elements.some((el) => el.name.text === name),
  );
}

/** A date line: the element that prints the publication (or update) date. */
const DATE_LINE = /\bPUBLISHED_AT\b|\bMODIFIED_AT\b|\bpublishedAt\b|toLocaleDateString/;

// ------------------------------------------------------------ rendered pages

const BYLINE_HTML = renderToStaticMarkup(<BlogByline />);
const BIO_HTML = renderToStaticMarkup(<>{AUTHOR_BIO}</>);
const BYLINE_TEXT = `By TrueCap · ${AUTHOR_BYLINE_SUFFIX}`;

async function renderPost(slug: string): Promise<string> {
  const mod = await import(`@/app/blog/${slug}/page.tsx`);
  return renderToStaticMarkup(await mod.default({}));
}

async function renderVs(slug: string): Promise<string> {
  const mod = await import(`@/app/vs/${slug}/page.tsx`);
  return renderToStaticMarkup(await mod.default({}));
}

/** The inner text of every <h2> in `html`. */
const h2Texts = (html: string) => [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => textOf(m[1]));

/** Every JSON-LD object a page emits (top level and @graph members). */
function jsonLd(html: string): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    const data = JSON.parse(match[1]) as Record<string, unknown>;
    out.push(data, ...(((data["@graph"] as Array<Record<string, unknown>> | undefined) ?? [])));
  }
  return out;
}

/**
 * Checks shared by posts and /vs pages: one byline, one bio, the bio inside
 * <main> after the header, and nothing Person-shaped in the structured data.
 * Returns the positions for the template-specific checks.
 */
function expectAuthorship(html: string, label: string) {
  expect(count(html, BYLINE_HTML), `${label}: renders the byline exactly once`).toBe(1);
  expect(count(html, "data-author-bio"), `${label}: renders the bio block exactly once`).toBe(1);
  expect(count(html, BIO_HTML), `${label}: the bio is AUTHOR_BIO, once`).toBe(1);

  const byline = html.indexOf(BYLINE_HTML);
  const bio = html.indexOf("data-author-bio");
  const mainStart = html.indexOf("<main");
  const mainEnd = html.lastIndexOf("</main>");
  const h1 = html.indexOf("<h1");
  expect(mainStart, `${label}: has a <main>`).toBeGreaterThanOrEqual(0);
  expect(h1 > mainStart && byline > h1, `${label}: byline sits under the H1`).toBe(true);
  expect(bio > byline && bio < mainEnd, `${label}: the bio sits inside <main>, after the header`).toBe(true);

  expect(html, `${label}: no Person node`).not.toMatch(/"@type":"Person"/);
  for (const node of jsonLd(html)) {
    if (node["@type"] !== "Article" && node["@type"] !== "BlogPosting") continue;
    const author = node.author as Record<string, unknown> | undefined;
    expect(author?.["@type"], `${label}: Article author is the Organization`).toBe("Organization");
    expect(String(author?.["@id"]), `${label}: Article author @id`).toMatch(/\/#organization$/);
  }
  return { byline, bio, mainEnd };
}

// ------------------------------------------------------------ the page sets

const blogDir = join(ROOT, "app", "blog");
const postDirs = readdirSync(blogDir).filter((slug) => slug !== "topics" && existsSync(join(blogDir, slug, "page.tsx")));
const POSTS = BLOG_POSTS.map((post) => post.slug);

const vsDir = join(ROOT, "app", "vs");
/** A /vs slug whose page.tsx only redirects (it renders no page of its own). */
const isRedirectStub = (slug: string) => {
  const source = read(`app/vs/${slug}/page.tsx`);
  return /\b(?:permanentRedirect|redirect)\(/.test(source) && !/<main\b/.test(source);
};
const VS_PAGES = readdirSync(vsDir).filter((slug) => existsSync(join(vsDir, slug, "page.tsx")) && !isRedirectStub(slug));

// ------------------------------------------------------------ tests

describe("seo/author.md and lib/author.ts say the same thing", () => {
  const authorMd = read("seo/author.md");

  it("AUTHOR_BIO equals author.md's Bio section, whitespace-normalized", () => {
    const bio = mdSection(authorMd, "Bio");
    expect(bio.length).toBeGreaterThan(40);
    expect(norm(AUTHOR_BIO)).toBe(bio);
  });

  it("author.md's Byline is exactly what BlogByline renders", () => {
    expect(mdSection(authorMd, "Byline")).toBe(BYLINE_TEXT);
    expect(textOf(BYLINE_HTML)).toBe(BYLINE_TEXT);
  });

  it("states the rules: unnamed founder, Organization author, one bio", () => {
    const rules = mdSection(authorMd, "Rules");
    expect(rules).toMatch(/never name the founder/i);
    expect(rules).toMatch(/TrueCap Organization/);
    expect(rules).toMatch(/lib\/author\.ts/);
  });

  it("names no person: neither file carries the name or handle the identity sweep guards", () => {
    for (const [label, text] of [
      ["seo/author.md", authorMd],
      ["lib/author.ts", read("lib/author.ts")],
      ["AUTHOR_BIO", AUTHOR_BIO],
      ["the byline", BYLINE_TEXT],
    ] as const) {
      expect(text, label).not.toMatch(forbiddenGivenName);
      expect(text, label).not.toMatch(forbiddenHandle);
      expect(text, label).not.toMatch(/"@type":\s*"Person"/);
    }
  });
});

describe("/about renders AUTHOR_BIO", () => {
  it("prints the bio as the 'Who builds this' paragraph", () => {
    const html = renderToStaticMarkup(AboutPage());
    const match = html.match(/<h2[^>]*>Who builds this<\/h2>\s*<p[^>]*>([\s\S]*?)<\/p>/);
    expect(match, "the 'Who builds this' heading is followed by a paragraph").not.toBeNull();
    expect(textOf(match?.[1] ?? "")).toBe(norm(AUTHOR_BIO));
  });

  it("reads the bio from lib/author.ts instead of a hand-typed copy", () => {
    const sf = parse("app/about/page.tsx");
    expect(importsNamed(sf, "AUTHOR_BIO", "@/lib/author")).toBe(true);
    let rendersIdentifier = false;
    const visit = (node: ts.Node): void => {
      if (ts.isJsxExpression(node) && node.expression && ts.isIdentifier(node.expression) && node.expression.text === "AUTHOR_BIO") {
        rendersIdentifier = true;
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
    expect(rendersIdentifier, "app/about/page.tsx renders {AUTHOR_BIO}").toBe(true);
    // A pasted copy of the bio would drift the day seo/author.md is edited.
    expect(norm(read("app/about/page.tsx").replace(/&apos;/g, "'"))).not.toContain(norm(AUTHOR_BIO).slice(0, 60));
  });
});

describe("the shared components carry the byline and the bio", () => {
  it("AuthorBio renders AUTHOR_BIO with links to /about and /methodology", () => {
    const html = renderToStaticMarkup(<AuthorBio />);
    expect(html).toContain(BIO_HTML);
    expect(html).toContain('href="/about"');
    expect(html).toContain('href="/methodology"');
    expect(h2Texts(html)).toEqual(["About TrueCap"]);
  });

  it("RelatedBlogPosts, the block every post ends with, opens with the bio (also when no post is left to list)", () => {
    for (const html of [
      renderToStaticMarkup(<RelatedBlogPosts currentSlug={POSTS[0]} />),
      renderToStaticMarkup(<RelatedBlogPosts currentSlug={POSTS[0]} limit={0} />),
    ]) {
      expect(count(html, "data-author-bio")).toBe(1);
      expect(html).toContain(BIO_HTML);
    }
  });

  it("SourceFirstArticle renders the byline under its date line and the bio after the article", () => {
    const html = renderToStaticMarkup(
      <SourceFirstArticle
        article={{ slug: "x", title: "T", description: "D", publishedAt: "2026-06-01", modifiedAt: "2026-06-01", faqs: [{ question: "Q?", answer: "A." }] }}
      >
        <p>Body</p>
      </SourceFirstArticle>,
    );
    expect(count(html, BYLINE_HTML)).toBe(1);
    expect(count(html, BIO_HTML)).toBe(1);
    expect(html.indexOf("data-author-bio")).toBeGreaterThan(html.indexOf("</article>"));
    const [byline] = jsxElements(parse("components/marketing/source-first-article.tsx"), "BlogByline");
    expect(previousElementSibling(byline)?.getText() ?? "").toMatch(DATE_LINE);
  });
});

describe("every blog post in the registry renders the byline and the bio", () => {
  it("covers every post folder: the registry and app/blog/<slug>/ agree", () => {
    // 73 since the DSCR consolidation (2026-09-28) merged two posts.
    expect(POSTS.length).toBeGreaterThanOrEqual(73);
    expect([...POSTS].sort()).toEqual([...postDirs].sort());
  });

  it.each(POSTS)("/blog/%s", async (slug) => {
    const file = `app/blog/${slug}/page.tsx`;
    const sf = parse(file);
    const sourceFirst = jsxElements(sf, "SourceFirstArticle").length > 0;

    // Source: the page renders what renders them (a comment or string does not count).
    if (sourceFirst) {
      expect(importsNamed(sf, "SourceFirstArticle", "@/components/marketing/source-first-article"), file).toBe(true);
    } else {
      const bylines = jsxElements(sf, "BlogByline");
      expect(bylines.length, `${file}: renders <BlogByline /> once`).toBe(1);
      expect(importsNamed(sf, "BlogByline", "@/components/marketing/blog-byline"), file).toBe(true);
      const dateLine = previousElementSibling(bylines[0]);
      expect(dateLine?.getText() ?? "", `${file}: <BlogByline /> sits directly under the date line`).toMatch(DATE_LINE);
      expect(dateLine?.parent && tagOf(dateLine.parent), `${file}: in the post header`).toBe("header");
      expect(jsxElements(sf, "RelatedBlogPosts").length, `${file}: renders <RelatedBlogPosts />, which carries the bio`).toBe(1);
    }

    // Rendered: one byline in the header, one bio at the end of the article.
    const html = await renderPost(slug);
    const { byline, bio, mainEnd } = expectAuthorship(html, file);
    // The post's own header (the site header renders one before <main>).
    const headerEnd = html.indexOf("</header>", html.indexOf("<main"));
    expect(byline, `${file}: byline inside the post header`).toBeLessThan(headerEnd);
    expect(bio, `${file}: bio after the post header`).toBeGreaterThan(headerEnd);
    // The end of the article: after the bio, only the "Keep reading" list follows in <main>.
    const after = h2Texts(html.slice(bio, mainEnd)).filter((text) => text !== "About TrueCap" && text !== "Keep reading");
    expect(after, `${file}: no article section after the bio`).toEqual([]);

    // What the SEO loop measures (seo/ARCHITECTURE.md, Authorship): the whole
    // RelatedBlogPosts block (the bio, then "Keep reading" with the lead
    // magnet) is main content on every post, so it counts in the crawl's
    // wordCount and outbound links and in the main hash render-diff compares.
    const keepReading = html.indexOf('aria-label="Related blog posts"');
    expect(keepReading > bio && keepReading < mainEnd, `${file}: "Keep reading" sits inside <main>, after the bio`).toBe(true);
    const measured = mainTextOf(html);
    expect(measured, `${file}: the loop's main text holds the bio`).toContain(norm(AUTHOR_BIO));
    expect(measured, `${file}: the loop's main text holds "Keep reading"`).toContain("Keep reading");
  });
});

describe("every /vs/<slug> page renders the byline and the bio", () => {
  it("covers every comparison page the sitemap lists", () => {
    expect(VS_PAGES.length).toBeGreaterThanOrEqual(38);
    const listed = sitemap()
      .map((entry) => new URL(entry.url).pathname)
      .filter((path) => path.startsWith("/vs/"))
      .map((path) => path.slice("/vs/".length));
    expect(listed.length).toBeGreaterThan(0);
    for (const slug of listed) expect(VS_PAGES, `/vs/${slug} is in the sitemap`).toContain(slug);
  });

  it.each(VS_PAGES)("/vs/%s", async (slug) => {
    const file = `app/vs/${slug}/page.tsx`;
    const sf = parse(file);
    const bylines = jsxElements(sf, "BlogByline");
    expect(bylines.length, `${file}: renders <BlogByline /> once`).toBe(1);
    expect(importsNamed(sf, "BlogByline", "@/components/marketing/blog-byline"), file).toBe(true);
    expect(tagOf(previousElementSibling(bylines[0]) ?? bylines[0]), `${file}: <BlogByline /> sits directly under the H1`).toBe("h1");
    expect(jsxElements(sf, "AuthorBio").length, `${file}: renders <AuthorBio /> once`).toBe(1);
    expect(importsNamed(sf, "AuthorBio", "@/components/marketing/author-bio"), file).toBe(true);

    const html = await renderVs(slug);
    const { bio, mainEnd } = expectAuthorship(html, file);
    expect(html, `${file}: byline directly under the H1`).toContain(`</h1>${BYLINE_HTML}`);
    // The end of the page: no section heading follows the bio in <main>.
    expect(h2Texts(html.slice(bio, mainEnd)).filter((text) => text !== "About TrueCap"), `${file}: nothing after the bio but links`).toEqual([]);
    // The bio is main content here too: the SEO loop's main text holds it.
    expect(mainTextOf(html), `${file}: the loop's main text holds the bio`).toContain(norm(AUTHOR_BIO));
  });
});
