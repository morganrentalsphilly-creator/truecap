import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Children, isValidElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/pricing" }));

import { AuthorBio } from "@/components/marketing/author-bio";
import { FaqSection } from "@/components/marketing/faq-section";
import { HomepageFaq, VsCompetitors } from "@/components/marketing/landing-sections";
import { currentFor, isUnderLearn, MarketingNav } from "@/components/marketing/marketing-nav";
import { ActionRow, CloseSection, Note, PageHero, RuledList, StepList } from "@/components/marketing/page-parts";
import { PlanCard } from "@/components/marketing/plan-card";
import { ComparisonFaq } from "@/components/marketing/comparison-faq";
import { RelatedContent } from "@/components/marketing/related-content";
import { Section } from "@/components/marketing/section";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

/**
 * The shared-component fixes from the 2026-09-30 rendered visual review of 15
 * pages (design pass rollout, unit shared-visual). Each assertion fails on the
 * markup it replaced.
 */
describe("one rule between a page hero and the section after it", () => {
  it("marks both heroes and lets a ruled section give way to the hero's rule", () => {
    expect(renderToStaticMarkup(<PageHero title="T" />)).toMatch(/^<section data-page-hero=""/);
    expect(read("components/marketing/marketing-hero.tsx")).toContain('<section data-page-hero="" className="truecap-marketing-shell border-b border-border');

    const ruled = renderToStaticMarkup(<Section>x</Section>);
    // As the hero's sibling, and as the first child of a display:contents
    // wrapper after it (the homepage's marketing tail).
    expect(ruled).toContain("border-t border-border [[data-page-hero]+&amp;]:border-t-0 [[data-page-hero]+*&gt;&amp;:first-child]:border-t-0");
    // The heavy rule and rule="none" are left alone.
    expect(renderToStaticMarkup(<Section rule="heavy">x</Section>)).not.toContain("data-page-hero");
    expect(renderToStaticMarkup(<Section rule="none">x</Section>)).not.toContain("border-t");
  });
});

describe("page parts", () => {
  const NOTE_OPEN = '<aside class="max-w-[68ch] border-t border-border pt-3 [:has(&gt;details:last-child)+&amp;]:border-t-0';

  it("sets a Note on the 1px rule, not the heavy rule that opens a section", () => {
    const html = renderToStaticMarkup(<Note title="Boundary.">Body</Note>);
    expect(html).toContain(`${NOTE_OPEN}">`);
    expect(html).not.toContain("border-t-2");
    expect(html).toContain('<div class="text-pretty text-base leading-relaxed text-muted-foreground mt-1">Body</div>');
  });

  it("sets a Note's title as a paragraph by default and as a heading on request, with the same classes", () => {
    expect(renderToStaticMarkup(<Note title="Boundary.">Body</Note>)).toContain('<p class="text-base font-semibold">Boundary.</p>');
    const heading = renderToStaticMarkup(<Note title="Quick answer" titleAs="h2">Body</Note>);
    expect(heading).toContain('<h2 class="text-base font-semibold">Quick answer</h2>');
    expect(heading).not.toContain("<p ");
    // Only the title's element differs.
    expect(heading.replace(/<(\/?)h2/g, "<$1p")).toBe(renderToStaticMarkup(<Note title="Quick answer">Body</Note>));
    // The 13 comparison posts whose note opens the post ("Quick answer",
    // "TL;DR") were headings before the article frame; they are again.
    const posts = readdirSync(join(process.cwd(), "app/blog"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `app/blog/${entry.name}/page.tsx`)
      .filter((path) => existsSync(join(process.cwd(), path)));
    const mounts = posts.flatMap((path) => read(path).match(/<Note title="(?:Quick answer|TL;DR)"[^>]*>/g) ?? []);
    expect(mounts.length).toBeGreaterThanOrEqual(13);
    for (const mount of mounts) expect(mount).toContain(' titleAs="h2"');
  });

  it("keeps a heading-titled opening Note outside ArticleBody", () => {
    // Inside .prose, app/globals.css sets every h2 at section size with a
    // 64px top margin ("&.prose :where(h2)"), so a Note whose title is an h2
    // must sit outside the article body: every <ArticleBody opened before
    // the Note is closed before it.
    const posts = readdirSync(join(process.cwd(), "app/blog"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `app/blog/${entry.name}/page.tsx`)
      .filter((path) => existsSync(join(process.cwd(), path)));
    let checked = 0;
    for (const path of posts) {
      const source = read(path);
      for (const mount of source.matchAll(/<Note title="(?:Quick answer|TL;DR)"[^>]*>/g)) {
        const before = source.slice(0, mount.index);
        const opened = before.match(/<ArticleBody\b/g)?.length ?? 0;
        const closed = before.match(/<\/ArticleBody>/g)?.length ?? 0;
        expect(opened, `${path}: the opening Note sits inside ArticleBody`).toBe(closed);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(13);
  });

  it("drops the Note's rule straight after FAQ rows, which already close on the same rule (every /vs page)", () => {
    const html = renderToStaticMarkup(
      <ComparisonFaq competitorName="X" reviewedDate="2026-09-30" items={[{ question: "Q?", answer: "A." }]} />,
    );
    // The hook only works if the Note is the rows' next sibling and the rows
    // end on a <details>: pin that structure, not just the class.
    expect(html).toMatch(/<details class="group border-b border-border">(?:(?!<details)[\s\S])*<\/details><\/div><aside class="max-w-\[68ch\] border-t border-border pt-3 \[:has\(&gt;details:last-child\)\+&amp;\]:border-t-0 mt-10">/);
  });

  it("sets a text-only hero in one column, an aside on the 5/7 grid, and a phone capture in a fixed right column", () => {
    const aside = <span>Shot</span>;
    expect(renderToStaticMarkup(<PageHero title="T" />)).not.toContain("lg:grid-cols-");
    expect(renderToStaticMarkup(<PageHero title="T" aside={aside} />)).toContain(
      "xl:gap-x-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start",
    );
    const shot = renderToStaticMarkup(<PageHero title="T" aside={aside} asideWidth="shot" />);
    expect(shot).toContain("xl:gap-x-16 lg:grid-cols-[minmax(0,1fr)_19.125rem] lg:items-start");
    expect(shot).not.toContain("5fr");
  });

  it("balances ruled-list terms and FAQ questions, and sets details and answers pretty", () => {
    const list = renderToStaticMarkup(<RuledList items={[{ term: "Term", detail: "Detail" }]} />);
    expect(list).toContain('<dt class="text-balance text-lg font-semibold">Term</dt>');
    expect(list).toContain('<dd class="mt-1 max-w-[64ch] text-pretty text-base leading-relaxed text-muted-foreground">Detail</dd>');

    const faq = renderToStaticMarkup(<FaqSection heading="Q" items={[{ q: "Why would I need this?", a: "Because." }]} structuredData={false} />);
    expect(faq).toContain('<span class="text-balance text-lg font-semibold">Why would I need this?</span>');
    expect(faq).toContain('class="max-w-[64ch] text-pretty pb-5 text-base leading-relaxed text-muted-foreground">Because.</p>');
  });

  it("sets each step's numeral on the first line's baseline", () => {
    const html = renderToStaticMarkup(<StepList steps={["One", "Two"]} />);
    expect(count(html, '<li class="flex items-baseline gap-4 border-b border-rule-soft py-4">')).toBe(2);
    expect(html).toContain('<span class="min-w-0 text-pretty text-lg leading-relaxed">One</span>');
  });
});

describe("the close", () => {
  const buttons = (
    <ActionRow>
      <a href="/analyze">Analyze</a>
    </ActionRow>
  );

  it("stacks a button close in one reading column: heading, lede, then the actions and the cue", () => {
    for (const actions of [buttons, <a key="one" href="/analyze">Open TrueCap</a>]) {
      const html = renderToStaticMarkup(
        <CloseSection heading="H" headingId="h" lede="Lede" actions={actions}>
          <p>Cue</p>
        </CloseSection>,
      );
      // No grid at all: a button row never sits alone at the foot of an
      // empty column, and the heading never floats below the heavy rule.
      expect(html).not.toContain("grid-cols");
      expect(html).not.toContain("items-end");
      expect(html).toMatch(
        /<div data-close-layout="stack" class="max-w-\[68ch\]"><h2 id="h" class="font-display[^"]*">H<\/h2><p class="mt-4 max-w-\[56ch\] text-pretty text-lg leading-relaxed text-muted-foreground">Lede<\/p><div class="mt-6 sm:mt-7">(?:<div class="flex|<a href)[\s\S]*<p>Cue<\/p><\/div><\/div>/,
      );
    }
  });

  it("keeps a close that carries a block (the /for-agents price table) on the hero's 5/7 grid, from the top", () => {
    const html = renderToStaticMarkup(
      <CloseSection
        heading="Agent Pro"
        headingId="h"
        actions={
          <>
            <dl className="border-t-2 border-foreground" />
            {buttons}
          </>
        }
      />,
    );
    expect(html).toContain(
      'data-close-layout="split" class="grid gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start xl:gap-x-16"',
    );
    expect(html).not.toContain("items-end");
    expect(renderToStaticMarkup(<CloseSection heading="H" headingId="h" actions={buttons} layout="split" />)).toContain(
      'data-close-layout="split"',
    );
    expect(renderToStaticMarkup(<CloseSection heading="H" headingId="h" actions={<>{buttons}</>} layout="stack" />)).toContain(
      'data-close-layout="stack"',
    );
  });

  it("keeps /for-agents' price-table close on the split: its actions stay a fragment (or name the layout)", () => {
    // The layout is inferred from a fragment of actions; wrapping the table
    // and buttons in a component or a <div> would stack the price table
    // under the lede. Pinned on the page's own source, from <CloseSection to
    // its closing tag.
    const source = read("app/for-agents/page.tsx");
    const start = source.search(/<CloseSection\s+heading="Agent Pro"/);
    expect(start).toBeGreaterThan(-1);
    const close = source.slice(start, source.indexOf("</CloseSection>", start));
    expect(close).toMatch(/layout="split"|actions=\{\s*<>/);
    expect(close).not.toMatch(/layout="stack"/);
  });

  it("gives the site footer's top margin back from its bottom padding", () => {
    const html = renderToStaticMarkup(<CloseSection heading="H" headingId="h" actions={buttons} />);
    expect(html).toMatch(/<section class="bg-background border-t-2 border-foreground"[^>]*><div class="[^"]*py-18 sm:py-24 pb-6 sm:pb-12">/);
    // Pinned so a change to the footer's margin revisits the close's padding.
    expect(read("components/marketing/site-footer.tsx")).toContain('className="mt-12 border-t border-border bg-background"');
  });
});

describe("the plan card lines up with its row", () => {
  const minimal = { name: "Free", audience: "A", price: "$0", answers: [{ term: "One" }], action: <span>Go</span> };

  it("is a subgrid of five bands, whichever optional parts it carries", () => {
    const html = renderToStaticMarkup(<PlanCard {...minimal} />);
    expect(html).toMatch(/^<article class="row-span-5 grid min-w-0 grid-rows-subgrid gap-y-0 rounded-lg border border-border bg-card /);
    expect(html).not.toContain("min-h-[2.75rem]");
    const bands = (element: ReactElement<{ children?: React.ReactNode }>) =>
      Children.toArray(element.props.children).filter(isValidElement);
    // Every band has content in every card: a band empty in all cards of a
    // row would keep the parent's row gap around it.
    expect(bands(PlanCard(minimal))).toHaveLength(5);
    expect(
      bands(
        PlanCard({
          ...minimal,
          tag: "Recommended",
          lead: "Lead",
          period: "/mo",
          priceNote: "Note",
          answersCaption: "Caption",
          note: "Plus",
          footnote: "Fine print",
        }),
      ),
    ).toHaveLength(5);
  });

  it("keeps the approved homepage's space between a price note and the answers, and sets its labels at 600", () => {
    // The homepage passes no caption: 28px under the note plus band 4's 8px,
    // the 36px the old 44px note reserve left under a one-line note.
    const plain = renderToStaticMarkup(<PlanCard {...minimal} priceNote="No card." />);
    expect(plain).toContain('<div class="flex flex-col pt-4 pb-7">');
    expect(plain).toContain('<div class="pt-2"><dl class="border-t border-border');
    // With a caption, the caption sits against the list it opens.
    const captioned = renderToStaticMarkup(<PlanCard {...minimal} tag="Recommended" answersCaption="Everything in Free, plus" />);
    expect(captioned).toContain('<div class="flex flex-col pt-4">');
    expect(captioned).toContain('<p class="mt-auto pt-3 text-sm font-semibold text-muted-foreground">Everything in Free, plus</p>');
    expect(captioned).toContain('<span class="rounded-sm border border-border px-1.5 py-0.5 text-sm font-semibold">Recommended</span>');
    expect(captioned).not.toContain("font-medium text-muted-foreground");
  });
});

describe("FAQ lists run the container's width on every page", () => {
  it("sets /why-truecap's two lists and /for-investors' list on the split", () => {
    const split = "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] xl:gap-x-16";
    const both = renderToStaticMarkup(<HomepageFaq structuredData={false} />);
    expect(count(both, split)).toBe(2);
    expect(both).not.toContain('class="max-w-3xl"');
    // Still one contact line, closing the second list.
    expect(count(both, "mailto:hello@usetruecap.com")).toBe(1);
    const investors = renderToStaticMarkup(<HomepageFaq structuredData={false} audience="investors" />);
    expect(count(investors, split)).toBe(1);
    expect(investors).not.toContain('class="max-w-3xl"');
  });
});

describe("the /why-truecap comparison", () => {
  const html = renderToStaticMarkup(<VsCompetitors />);

  it("sets the fair comparison as its own section under an H2, not a fourth column name", () => {
    expect(html).toContain('<h2 id="why-truecap-fair-heading" class="font-display text-balance text-section-sm sm:text-section max-w-3xl">A deliberately fair comparison</h2>');
    expect(html).not.toMatch(/<h3[^>]*>\s*A deliberately fair comparison/);
    expect(count(html, "<section")).toBe(2);
  });

  it("opens each block on one heavy rule at every width", () => {
    expect(count(html, "border-t-2 border-foreground")).toBe(2);
    expect(html).not.toMatch(/(?:lg|md):border-t-2/);
    expect(count(html, "border-t border-border pt-5 first:border-t-0")).toBe(3);
  });

  it("shares the rows of the two fair-comparison lists so their rules line up", () => {
    expect(count(html, "md:row-span-6 md:grid md:grid-rows-subgrid")).toBe(2);
    expect(count(html, "md:row-span-4 md:grid md:grid-rows-subgrid")).toBe(2);
    expect(html).toContain("md:grid-cols-2 md:gap-y-0");
  });

  it("gives BiggerPockets its own line under both lists, not TrueCap's fine print", () => {
    const trueCapList = html.indexOf("TrueCap may fit better if you want");
    const bp = html.indexOf("BiggerPockets may fit better");
    expect(bp).toBeGreaterThan(html.indexOf("</ul>", trueCapList));
    expect(html.lastIndexOf("<aside", bp)).toBeGreaterThan(trueCapList);
  });
});

describe("end matter keeps one rule per boundary", () => {
  it("drops the bio's top rule after a FAQ, whose last row closes on the same rule, and nowhere else", () => {
    const html = renderToStaticMarkup(<AuthorBio />);
    expect(html).toMatch(/^<section aria-labelledby="about-truecap-heading" data-author-bio="" class="mt-12 border-t border-border pt-6 /);
    expect(html).toContain("[[data-faq-section]+&amp;]:border-t-0");
    expect(html).toContain("[:has(&gt;[data-faq-section]:last-child)+&amp;]:border-t-0");
    // A Sources list ends on an inset soft row rule, not a section rule: the
    // bio keeps its own rule after it.
    expect(html).not.toContain("data-post-sources");
    const faq = renderToStaticMarkup(<FaqSection variant="inline" heading="Q" items={[{ q: "Q?", a: "A." }]} structuredData={false} />);
    expect(faq).toMatch(/^<section data-faq-section=""/);
  });

  it("lets the capture block's rule give way to the reading list's closing rule, and balances the titles", () => {
    const source = read("components/marketing/related-blog-posts.tsx");
    expect(source).toMatch(/<div className="mt-12 \[&>section:first-child\]:border-t-0">\s*<LeadMagnetInline/);
    expect(source).toContain('<h3 className="text-balance text-lg font-semibold">');
  });

  it("sets the blocks after an article on one gap and one heading voice", () => {
    // The display H3 step of "Sources", "About TrueCap" and "Keep reading".
    const h3Step = "font-display text-balance text-h3-sm sm:text-2xl";
    expect(renderToStaticMarkup(<AuthorBio />)).toContain(`class="${h3Step}">About TrueCap</h2>`);
    const related = renderToStaticMarkup(<RelatedContent kind="blog" slug="what-is-a-good-cap-rate" title="What is a good cap rate?" />);
    expect(related).toContain(`<p class="${h3Step}">Related</p><ul class="mt-3 grid`);
    const reading = read("components/marketing/related-blog-posts.tsx");
    expect(reading).toContain('className="mt-12 border-t border-border pt-6"');
    expect(reading).toContain(`<h2 className="${h3Step}">`);
  });
});

describe("the header marks the current page", () => {
  it("marks exactly the link to the page, never a link into another page's section", () => {
    expect(currentFor("/pricing", "/pricing")).toBe("page");
    expect(currentFor("/pricing", "/pricing#plans")).toBeUndefined();
    expect(currentFor("/pricing/x", "/pricing")).toBeUndefined();
    expect(currentFor(null, "/pricing")).toBeUndefined();
    expect(isUnderLearn("/blog/what-is-a-good-cap-rate")).toBe(true);
    expect(isUnderLearn("/tools")).toBe(true);
    expect(isUnderLearn("/toolsets")).toBe(false);
    expect(isUnderLearn("/pricing")).toBe(false);
    expect(isUnderLearn(null)).toBe(false);
  });

  it("renders every link at rest on the server, so hydration matches through the proxy's rewrites", () => {
    const html = renderToStaticMarkup(<MarketingNav />);
    expect(html).not.toContain("aria-current");
    // The state, once applied, is styled from the attribute itself.
    expect(count(html, "aria-[current=page]:text-primary")).toBe(4);
    const source = read("components/marketing/marketing-nav.tsx");
    expect(count(source, "aria-current={currentFor(pathname,")).toBe(10);
    expect(source).not.toMatch(/text-xs\b/);
  });
});
