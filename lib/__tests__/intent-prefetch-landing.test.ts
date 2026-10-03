import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement, type FunctionComponent, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/**
 * The paid-traffic landing pages prefetch on intent, not on scroll.
 *
 * A default next/link prefetches its route as soon as it scrolls into view.
 * Before this rule a 390px visitor scrolling /for-agents pulled 24 JS chunks
 * and 27 RSC payloads for routes almost nobody opened (PR #152). Links below
 * the first screen now go through IntentPrefetchLink (hover or keyboard
 * focus); only the first screen's actions and the /pricing checkout actions
 * keep next/link's default. The sign-up links (/for-agents' close, the
 * /pricing cards for a visitor) are plain <a> elements, a full-document
 * navigation, so Back from the auth page restores the marketing page's
 * scroll (a client-side hop clamped it to the auth page's height). /analyze
 * never prefetches (its bundle stays off marketing pages).
 *
 * Two layers:
 * - Source: every <Link> (and tracked link island) either carries
 *   prefetch={false} or is on its file's first-screen allowlist, counted.
 *   IntentPrefetchLink to /analyze must carry prefetch={false} too.
 * - Rendered: next/link and IntentPrefetchLink are each replaced by an <a>
 *   that records which one it is and what the caller passed ("default": a
 *   plain Link that prefetches on scroll; "intent": IntentPrefetchLink;
 *   "off": either one with prefetch={false}). The real IntentPrefetchLink
 *   hands next/link prefetch={false} until hover, so recording next/link
 *   alone could not tell it from prefetch={false}. Inside <main>, the only
 *   "default" links are the allowlisted routes, and they sit in the hero
 *   (<section data-page-hero>) unless named as the page's conversion route.
 *   Every /analyze link is "off". This also catches a plain Link inside a
 *   shared part the page renders, and mapped hrefs the source scan cannot
 *   read. /pricing renders here only as far as its Suspense fallbacks (the
 *   plan cards and the agent line stream later), so it is held by the source
 *   layer, which also checks that its allowlisted links sit inside
 *   <PageHero> (its value stack is rendered on its own).
 */

vi.mock("next/link", async () => {
  const { createElement: h } = await import("react");
  return {
    default: ({
      href,
      prefetch,
      className,
      children,
    }: {
      href: string | { pathname?: string };
      prefetch?: boolean | null;
      className?: string;
      children?: ReactNode;
    }) =>
      h(
        "a",
        {
          href: typeof href === "string" ? href : (href.pathname ?? ""),
          className,
          "data-prefetch": prefetch === false ? "off" : "default",
        },
        children,
      ),
  };
});

// Recorded on its own (as marketing-link-prefetch.test.tsx does): the real
// component always hands next/link prefetch={false} on the server, so the
// next/link mock above would record "off" for it whether or not the caller
// wrote prefetch={false}.
vi.mock("@/components/marketing/intent-prefetch-link", async (importActual) => {
  const { createElement: h } = await import("react");
  return {
    ...(await importActual<typeof import("@/components/marketing/intent-prefetch-link")>()),
    IntentPrefetchLink: ({
      href,
      prefetch,
      className,
      children,
    }: {
      href: string | { pathname?: string };
      prefetch?: false;
      className?: string;
      children?: ReactNode;
    }) =>
      h(
        "a",
        {
          href: typeof href === "string" ? href : (href.pathname ?? ""),
          className,
          "data-prefetch": prefetch === false ? "off" : "intent",
        },
        children,
      ),
  };
});

// /for-agents redirects to /pricing unless Agent Pro is sold, and every
// persona page shows its /for-agents cue only then: render the sold state.
vi.mock("@/lib/stripe/plan-prices", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/stripe/plan-prices")>()),
  isAgentProConfigured: () => true,
}));
// No Stripe round trip from a unit test: the pages fall back to the catalog.
vi.mock("@/lib/stripe/display-prices", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/stripe/display-prices")>()),
  loadStripeDisplayPrice: async () => null,
}));

import { PricingValueStack } from "@/components/marketing/pricing-value-stack";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/** The anonymous Agent Pro sign-up the /for-agents close links (and /pricing's card). */
const AGENT_PRO_SIGNUP = `/auth/sign-up?plan=agent-pro&billing=annual&next=${encodeURIComponent("/dashboard/new")}`;

// ---------------------------------------------------------------------------
// Source layer
// ---------------------------------------------------------------------------

type Allow = [href: string | RegExp, count: number];

/**
 * Per file: the links allowed to keep next/link's default prefetch, matched
 * on the href attribute's source text, with how many of each. Everything
 * else is IntentPrefetchLink or prefetch={false}. `hero`: every allowlisted
 * link sits between <PageHero and </PageHero> (for the page the rendered
 * layer cannot reach).
 */
const SOURCE_RULES: Record<string, { allow: Allow[]; intent: boolean; hero?: true }> = {
  // The hero's jump to #pricing and the close's Agent Pro sign-up are tracked
  // islands (the source cannot tell; TrackedMarketingLink renders both the
  // same-page fragment and the /auth/ one as a plain <a>, held by the
  // rendered layer); everything else is on intent.
  "app/for-agents/page.tsx": {
    allow: [
      ['"#pricing"', 1],
      ["{agentPrimaryHref}", 1],
    ],
    intent: true,
  },
  // The hero's one next/link: the agent line under the actions (a plain
  // Link on main too, like the homepage hero's investor cue). "See Pro
  // plans" and the stage chooser's plan jumps are same-page fragments,
  // written as plain <a> elements: see "same-page fragment links" below.
  "app/pricing/page.tsx": {
    allow: [['"/for-agents"', 1]],
    intent: true,
    hero: true,
  },
  "components/marketing/pricing-value-stack.tsx": { allow: [], intent: true },
  // The plan cards' actions are the checkout: sign-up for a visitor, billing
  // for a subscriber or a recovery. The Free card's /analyze is prefetch={false}.
  // A visitor's sign-up is a plain <a> (full-document navigation), not a
  // Link: see "sign-up links are full-document navigations" below.
  "components/marketing/pricing-toggle-plans.tsx": {
    allow: [['"/profile#billing"', 2]],
    intent: false,
  },
  "components/marketing/pricing-plan-buttons.tsx": {
    allow: [['"/profile#billing"', 1]],
    intent: false,
  },
  // The hero's secondary action; the close's repeat goes on intent.
  "app/for-investors/page.tsx": { allow: [['"/pricing"', 1]], intent: true },
  "app/for-buy-and-hold/page.tsx": { allow: [['"/pricing"', 1]], intent: true },
  "app/for-house-hackers/page.tsx": { allow: [['"/pricing"', 1]], intent: true },
  // The hero's guide button; the close repeats it on intent.
  "app/for-brrrr/page.tsx": { allow: [['"/blog/brrrr-method-explained"', 1]], intent: true },
  // The hero's tool links are prefetch={false}; the close's guide is on intent.
  "app/for-flippers/page.tsx": { allow: [], intent: true },
  // Its only links are /analyze (prefetch={false}); the comparison and FAQ
  // links live in landing-sections.tsx (marketing-link-prefetch.test.tsx).
  "app/why-truecap/page.tsx": { allow: [], intent: false },
};

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** Index of the ">" that closes the JSX opening tag starting at `start`. */
function tagEnd(source: string, start: number): number {
  const stack: string[] = [];
  let quote: string | null = null;
  for (let i = start; i < source.length; i++) {
    const c = source[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (stack.at(-1) === "`") {
      if (c === "\\") i++;
      else if (c === "`") stack.pop();
      else if (c === "$" && source[i + 1] === "{") {
        stack.push("{");
        i++;
      }
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if (c === "`" && stack.length > 0) stack.push("`");
    else if (c === "{") stack.push("{");
    else if (c === "}") stack.pop();
    else if (c === ">" && stack.length === 0) return i;
  }
  return -1;
}

/** The href attribute's source text: `"/x"` or `{expr}` (braces balanced). */
function hrefSource(tag: string): string | null {
  const at = tag.search(/\shref=/);
  if (at < 0) return null;
  const value = tag.slice(at).replace(/^\s*href=/, "");
  if (value.startsWith('"')) return value.slice(0, value.indexOf('"', 1) + 1);
  let depth = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "{") depth++;
    else if (value[i] === "}" && --depth === 0) return value.slice(0, i + 1);
  }
  return null;
}

/** Every opening tag of the named JSX elements, comments stripped. */
function openingTags(
  source: string,
  names: string[],
): { name: string; tag: string; at: number }[] {
  const code = stripComments(source);
  const out: { name: string; tag: string; at: number }[] = [];
  for (const match of code.matchAll(new RegExp(`<(${names.join("|")})(?=[\\s>/])`, "g"))) {
    const end = tagEnd(code, match.index + match[0].length);
    expect(end, `unterminated <${match[1]}>`).toBeGreaterThan(-1);
    out.push({ name: match[1], tag: code.slice(match.index, end + 1), at: match.index });
  }
  return out;
}

/** Where <PageHero>…</PageHero> sits in the comment-stripped source. */
function pageHeroSpan(source: string): [number, number] {
  const code = stripComments(source);
  const start = code.search(/<PageHero\b/);
  const end = code.indexOf("</PageHero>", start);
  expect(start, "<PageHero> in the source").toBeGreaterThan(-1);
  expect(end, "</PageHero> in the source").toBeGreaterThan(start);
  return [start, end];
}

const ANALYZE_HREF = /^["`{]*\/analyze(?:[?#"`]|$)/;

describe("paid landing pages: intent-only prefetch (source)", () => {
  it.each(Object.entries(SOURCE_RULES))(
    "%s: only its first-screen links keep the default prefetch",
    (path, { allow, intent, hero }) => {
      const source = read(path);
      const links = openingTags(source, ["Link", "TrackedMarketingLink"]);
      const eager = links.filter(({ tag }) => !/\sprefetch=\{false\}/.test(tag));
      const tally = new Map<string, number>();
      const offenders: string[] = [];
      const inHero = hero ? pageHeroSpan(source) : null;
      for (const { tag, at } of eager) {
        const href = hrefSource(tag) ?? "(no href)";
        const rule = allow.find(([m]) => (typeof m === "string" ? m === href : m.test(href)));
        if (!rule) {
          offenders.push(`${href}: ${tag.replace(/\s+/g, " ")}`);
          continue;
        }
        // A swap (the hero's link on intent, a later link to the same route
        // eager) keeps the tally but moves the eager one out of the hero.
        if (inHero) {
          expect(
            at > inHero[0] && at < inHero[1],
            `${path}: default-prefetch ${href} sits outside <PageHero>`,
          ).toBe(true);
        }
        const key = String(rule[0]);
        tally.set(key, (tally.get(key) ?? 0) + 1);
      }
      expect(
        offenders,
        `${path}: links below the first screen use IntentPrefetchLink (or prefetch={false})`,
      ).toEqual([]);
      // Exactly the allowlisted first-screen links: a second default link to
      // an allowed route, or a stale allowlist entry, both fail.
      expect(Object.fromEntries(tally)).toEqual(
        Object.fromEntries(allow.map(([m, count]) => [String(m), count])),
      );

      // /analyze never prefetches, through either component.
      for (const { name, tag } of openingTags(source, ["Link", "IntentPrefetchLink"])) {
        const href = hrefSource(tag);
        if (href && ANALYZE_HREF.test(href)) {
          expect(tag, `${path}: <${name}> to /analyze needs prefetch={false}`).toMatch(
            /\sprefetch=\{false\}/,
          );
        }
      }

      if (intent) {
        expect(source).toContain('from "@/components/marketing/intent-prefetch-link"');
        expect(source).toMatch(/<IntentPrefetchLink\b/);
      }
    },
  );

  it("sign-up links are full-document navigations", () => {
    // A client-side hop into /auth/sign-up made Back restore the marketing
    // page's scroll while the short auth page was still mounted: /for-agents
    // reopened at 483px (1095 wide) instead of the pricing close it left, and
    // /pricing at its hero. A plain <a> gives Back the browser's own restore.
    const buttons = read("components/marketing/pricing-plan-buttons.tsx");
    const signUpHref = /^\{`\/auth\/sign-up\?/;
    const anchors = openingTags(buttons, ["a"]).filter(({ tag }) =>
      signUpHref.test(hrefSource(tag) ?? ""),
    );
    expect(anchors, "the /pricing cards' visitor sign-up is an <a>").toHaveLength(1);
    expect(
      openingTags(buttons, ["Link"]).filter(({ tag }) => signUpHref.test(hrefSource(tag) ?? "")),
      "no next/link to /auth/sign-up on the /pricing cards",
    ).toEqual([]);
    // /for-agents' close goes through TrackedMarketingLink, which renders an
    // /auth/ href as an <a> (the rendered layer checks the close's link).
    const tracked = read("components/marketing/tracked-marketing-link.tsx");
    expect(tracked).toMatch(/href\.startsWith\("\/auth\/"\)/);
  });

  it("same-page fragment links on /pricing are plain anchors, not next/link", () => {
    // next/link scrolls on a hash-only navigation only when the hash changes,
    // so with the fragment already in the URL "See Pro plans" and the stage
    // chooser's plan names scrolled 0px on a second click (and after Back
    // from sign-up). A native <a> scrolls every time.
    const page = read("app/pricing/page.tsx");
    const isFragment = (href: string | null) =>
      href !== null && (/^"#[\w-]+"$/.test(href) || href === "{stage.href}");
    const fragmentAnchors = openingTags(page, ["a"])
      .map(({ tag }) => hrefSource(tag))
      .filter(isFragment);
    expect(fragmentAnchors.sort()).toEqual(['"#pro"', "{stage.href}"]);
    expect(
      openingTags(page, ["Link", "IntentPrefetchLink", "TrackedMarketingLink"])
        .map(({ tag }) => hrefSource(tag))
        .filter(isFragment),
      "no next/link (or link island) to a same-page fragment on /pricing",
    ).toEqual([]);
    // Every stage the chooser lists jumps to a fragment, so the mapped
    // {stage.href} anchor is never a route.
    const stageHrefs = [...stripComments(page).matchAll(/^\s+href: ("[^"]*"),$/gm)].map((m) => m[1]);
    expect(stageHrefs).toEqual(['"#agent-pro"', '"#plans"', '"#pro"']);
  });
});

// ---------------------------------------------------------------------------
// Rendered layer
// ---------------------------------------------------------------------------

type Anchor = { href: string; prefetch: string };

function anchors(html: string): Anchor[] {
  return [...html.matchAll(/<a\b([^>]*)>/g)].map(([, attrs]) => ({
    href: (/\shref="([^"]*)"/.exec(attrs)?.[1] ?? "").replace(/&amp;/g, "&"),
    prefetch: /\sdata-prefetch="([^"]*)"/.exec(attrs)?.[1] ?? "(external)",
  }));
}

function mainOf(html: string): string {
  const start = html.indexOf("<main");
  const end = html.indexOf("</main>", start);
  expect(start, "<main> rendered").toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return html.slice(start, end);
}

/**
 * Where the hero's markup starts and ends: <section data-page-hero=""> to its
 * own </section> (nested sections counted).
 */
function heroSpan(main: string): [number, number] {
  const start = main.indexOf('<section data-page-hero=""');
  expect(start, "<section data-page-hero> rendered in <main>").toBeGreaterThan(-1);
  const tags = /<section\b|<\/section>/g;
  tags.lastIndex = start;
  let depth = 0;
  for (let m = tags.exec(main); m; m = tags.exec(main)) {
    depth += m[0] === "</section>" ? -1 : 1;
    if (depth === 0) return [start, m.index + m[0].length];
  }
  throw new Error("unterminated <section data-page-hero>");
}

/**
 * Per page: the routes the hero may prefetch on scroll (href → count); the
 * page's conversion route, which may prefetch on scroll wherever it sits
 * (default none); a few below-the-fold links that must be on intent, so
 * an empty render, a dropped section or a switch to prefetch={false} (no
 * hover prefetch at all) can't pass; and the links that must render as a
 * plain <a>, which a switch back to next/link fails.
 */
const RENDERED: Record<
  string,
  {
    eager: Record<string, number>;
    conversion?: Record<string, number>;
    intent: string[];
    /** Rendered as a plain <a> (a full-document navigation), not next/link. */
    document?: string[];
    /** Rendered in the hero as a plain <a>: a same-page fragment jump. */
    heroDocument?: string[];
  }
> = {
  // Nothing prefetches on scroll. The hero's #pricing jump is a same-page
  // fragment, which TrackedMarketingLink renders as a plain <a> (next/link
  // would not scroll on a second click); it repeats under the roster through
  // IntentPrefetchLink, which is replaced here by the recording mock and
  // whose own fragment handling is held by "same-page fragment links render
  // as plain anchors" below. The close's Agent Pro sign-up is a plain <a>
  // too, so Back from sign-up returns to the close.
  "app/for-agents/page.tsx": {
    eager: {},
    heroDocument: ["#pricing"],
    document: [AGENT_PRO_SIGNUP],
    intent: [
      "#pricing",
      "/sample-decision-memo",
      "/methodology",
      "/reviews",
      "/blog/what-is-a-good-cap-rate",
      "/embed",
      "/vs/dealcheck",
      "/pricing#plans",
      "/for-buy-and-hold",
      "/for-house-hackers",
      "/blog/brrrr-method-explained",
      "/blog/70-percent-rule-house-flipping",
    ],
  },
  "app/for-investors/page.tsx": {
    eager: { "/pricing": 1 },
    intent: ["/for-buy-and-hold", "/for-house-hackers", "/blog/brrrr-method-explained", "/pricing", "/methodology", "/for-agents"],
  },
  "app/for-buy-and-hold/page.tsx": {
    eager: { "/pricing": 1 },
    intent: ["/blog/cap-rate-vs-cash-on-cash-vs-dscr", "/blog/rental-property-tax-deductions", "/pricing", "/for-house-hackers", "/for-agents"],
  },
  "app/for-house-hackers/page.tsx": {
    eager: { "/pricing": 1 },
    intent: ["/blog/house-hacking-explained", "/blog/single-family-vs-multi-family-rental", "/pricing", "/for-buy-and-hold", "/for-agents"],
  },
  "app/for-brrrr/page.tsx": {
    eager: { "/blog/brrrr-method-explained": 1 },
    intent: ["/blog/brrrr-method-explained", "/for-agents"],
  },
  "app/for-flippers/page.tsx": {
    eager: {},
    intent: ["/blog/70-percent-rule-house-flipping", "/for-agents"],
  },
  // The comparison's and the FAQ's links come from landing-sections.tsx.
  "app/why-truecap/page.tsx": { eager: {}, intent: [] },
};

async function renderPage(path: string): Promise<string> {
  const mod = (await import(/* @vite-ignore */ `@/${path}`)) as {
    default: () => ReactElement | Promise<ReactElement>;
  };
  return renderToStaticMarkup(await mod.default());
}

function eagerTally(html: string): Record<string, number> {
  const tally: Record<string, number> = {};
  for (const a of anchors(html)) {
    if (a.prefetch === "default") tally[a.href] = (tally[a.href] ?? 0) + 1;
  }
  return tally;
}

describe("paid landing pages: intent-only prefetch (rendered)", () => {
  it.each(Object.entries(RENDERED))(
    "%s prefetches on scroll only its first-screen routes",
    async (path, { eager, conversion = {}, intent, document = [], heroDocument = [] }) => {
      const html = await renderPage(path);
      const main = mainOf(html);
      const inMain = anchors(main);
      expect(inMain.length, `${path}: links rendered in <main>`).toBeGreaterThan(0);

      // The hero's links keep the default; below it, only the conversion
      // route does. Swapping which of two same-route links is eager fails.
      const [heroStart, heroEnd] = heroSpan(main);
      expect(
        eagerTally(main.slice(heroStart, heroEnd)),
        `${path}: default-prefetch links in the hero`,
      ).toEqual(eager);
      expect(
        eagerTally(main.slice(0, heroStart) + main.slice(heroEnd)),
        `${path}: default-prefetch links in <main> outside the hero`,
      ).toEqual(conversion);

      for (const href of intent) {
        expect(
          inMain.some((a) => a.href === href && a.prefetch === "intent"),
          `${path}: ${href} prefetches on intent`,
        ).toBe(true);
      }

      // Neither mocked component rendered these: no data-prefetch at all.
      for (const href of document) {
        const matches = inMain.filter((a) => a.href === href);
        expect(matches.length, `${path}: ${href} rendered in <main>`).toBeGreaterThan(0);
        for (const a of matches) {
          expect(a.prefetch, `${path}: ${href} is a plain <a>`).toBe("(external)");
        }
      }

      // The hero's same-page jumps: plain <a> elements, never next/link.
      const inHero = anchors(main.slice(heroStart, heroEnd));
      for (const href of heroDocument) {
        const matches = inHero.filter((a) => a.href === href);
        expect(matches.length, `${path}: ${href} rendered in the hero`).toBeGreaterThan(0);
        for (const a of matches) {
          expect(a.prefetch, `${path}: the hero's ${href} is a plain <a>`).toBe("(external)");
        }
      }

      // /analyze never prefetches anywhere on the page, header and footer included.
      for (const a of anchors(html).filter((a) => /^\/analyze(?:[?#]|$)/.test(a.href))) {
        expect(a.prefetch, `${path}: ${a.href}`).toBe("off");
      }
    },
  );

  it("same-page fragment links render as plain anchors through both link components", async () => {
    // The real components, not the recording mock above. The next/link mock
    // stamps data-prefetch on everything it renders, so an <a> without it
    // did not go through next/link.
    const { IntentPrefetchLink: RealIntentPrefetchLink } = await vi.importActual<
      typeof import("@/components/marketing/intent-prefetch-link")
    >("@/components/marketing/intent-prefetch-link");
    const tracked = await import("@/components/marketing/tracked-marketing-link");
    // The label goes in as createElement's child argument (the lint rule),
    // which the component's required `children` prop type does not see.
    type TrackedProps = Parameters<typeof tracked.TrackedMarketingLink>[0];
    const TrackedMarketingLink = tracked.TrackedMarketingLink as FunctionComponent<
      Omit<TrackedProps, "children">
    >;

    const intentFragment = renderToStaticMarkup(
      createElement(RealIntentPrefetchLink, { href: "#pricing", className: "x", scroll: false }, "Jump"),
    );
    expect(intentFragment).toBe('<a href="#pricing" class="x">Jump</a>');
    const trackedFragment = renderToStaticMarkup(
      createElement(
        TrackedMarketingLink,
        { href: "#pricing", event: "agent_pro_cta_clicked", className: "x" },
        "Jump",
      ),
    );
    expect(trackedFragment).toBe('<a href="#pricing" class="x">Jump</a>');

    // A route still goes through next/link: off until intent for the intent
    // link, the default for the tracked one. A path that carries a fragment
    // ("/pricing#plans") is a route, not a same-page jump.
    for (const href of ["/methodology", "/pricing#plans"]) {
      expect(
        anchors(renderToStaticMarkup(createElement(RealIntentPrefetchLink, { href }, "Go"))),
      ).toEqual([{ href, prefetch: "off" }]);
      expect(
        anchors(
          renderToStaticMarkup(
            createElement(TrackedMarketingLink, { href, event: "agent_pro_cta_clicked" }, "Go"),
          ),
        ),
      ).toEqual([{ href, prefetch: "default" }]);
    }
  });

  it("/pricing's value stack links /for-agents on intent", () => {
    const html = renderToStaticMarkup(createElement(PricingValueStack, { agentProConfigured: true }));
    expect(anchors(html)).toEqual([{ href: "/for-agents", prefetch: "intent" }]);
  });
});
