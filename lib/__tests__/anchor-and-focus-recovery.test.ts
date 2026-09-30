import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

/** Source minus block and line comments — what the user can actually read. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
}

/**
 * Three small defects that share one shape: the app moved the viewport or the
 * focus ring somewhere the user did not expect, and said nothing about it.
 */

describe("fragment links clear the sticky header", () => {
  const css = read("app/globals.css");

  /**
   * rem value of the bare `#main { scroll-margin-top }` rule that applies at a
   * given viewport width. Only the UNQUALIFIED selector — the
   * `body:not(...):has(...) #main` and `.dashboard-shell #main` variants are
   * different rules with their own specificity and are checked separately.
   */
  function marginAt(width: number): number | null {
    const bare = /(^|[\n{])\s*#main\s*\{\s*scroll-margin-top:\s*([\d.]+)rem/g;
    let best: { min: number; rem: number } | null = null;
    let m: RegExpExecArray | null;
    while ((m = bare.exec(css)) != null) {
      const rem = Number(m[2]);
      // Nearest enclosing @media (min-width: Npx) before this rule, if any.
      // Include the delimiter group 1 matched: when it is the media block's own
      // "{", slicing to m.index drops that brace and the depth count reads 0 for
      // every rule, so everything collapsed to the last one.
      const before = css.slice(0, m.index + m[1].length);
      const opened = before.lastIndexOf("@media");
      let min = 0;
      if (opened !== -1) {
        // Only count it if that @media block has not already closed.
        const between = before.slice(opened);
        const depth = (between.match(/\{/g) ?? []).length - (between.match(/\}/g) ?? []).length;
        const q = /@media\s*\(min-width:\s*(\d+)px\)/.exec(between);
        if (depth > 0 && q) min = Number(q[1]);
      }
      if (width >= min && (best == null || min >= best.min)) best = { min, rem };
    }
    return best ? best.rem : null;
  }

  /** rem of the page-level scroll padding (every page but the dashboard). */
  function paddingTop(): number {
    const m = /html:not\(:has\(\.dashboard-shell\)\)\s*\{\s*scroll-padding-top:\s*([\d.]+)rem/.exec(css);
    return m ? Number(m[1]) : 0;
  }
  /** px a fragment target or a focused element lands below the viewport top. */
  function offsetAt(width: number): number {
    return (paddingTop() + (marginAt(width) ?? 0)) * 16;
  }

  it("clears the header at every width — MEASURED, not assumed", () => {
    // Re-measured 2026-09-30 on a production build (design pass): the flat
    // marketing nav is gone, so the sticky header is ONE row everywhere:
    //   320-639px -> 57px
    //   640px up  -> 65px
    // The offset is now the html scroll padding (which also keeps keyboard
    // focus clear of the header, WCAG 2.4.11) plus #main's own margin.
    // Require HEADROOM, not a bare clearance: clearing by 1-2px passes a >=
    // assertion while the heading sits flush against the bar.
    const HEADROOM = 6;
    expect(offsetAt(375), "375px: 57px header + headroom").toBeGreaterThanOrEqual(57 + HEADROOM);
    expect(offsetAt(768), "768px: 65px header + headroom").toBeGreaterThanOrEqual(65 + HEADROOM);
    expect(offsetAt(1280), "1280px: 65px header + headroom").toBeGreaterThanOrEqual(65 + HEADROOM);
  });

  it("does not over-scroll on phones or desktop", () => {
    // A generous offset dumps blank space above the heading. Stay under ~1.5x
    // the header at each width.
    expect(offsetAt(375)).toBeLessThanOrEqual(90);
    expect(offsetAt(1280)).toBeLessThanOrEqual(100);
  });

  it("keeps focus and fragment targets clear of the header outside the dashboard", () => {
    // components/investcalc/header.tsx wraps the header in `sticky top-0 z-50`.
    // Fragment navigation and focus scrolling know nothing about that bar
    // unless the scroll padding says so; the dashboard has its own Topbar.
    expect(paddingTop()).toBeGreaterThan(0);
    const base = /(?:^|\n)\s*#main\s*\{[^}]*scroll-margin-top:/.exec(css);
    expect(base, "no unscoped #main scroll-margin rule in globals.css").not.toBeNull();
  });

  it("keeps focus clear of the fixed bottom bars and the cookie banner", () => {
    expect(css).toMatch(/html:has\(\[data-sticky-bottom-bar\]\)\s*\{\s*scroll-padding-bottom:/);
    expect(css).toMatch(/html:has\(\[data-cookie-consent-banner\]\)\s*\{\s*scroll-padding-bottom:/);
    expect(read("components/marketing/cookie-consent-banner.tsx")).toContain('data-cookie-consent-banner=""');
  });

  it("keeps the dashboard override more specific than the base rule", () => {
    // .dashboard-shell #main (0,1,1,1) must still beat #main (0,1,0,0), or the
    // dashboard Topbar case silently regresses to the marketing offset.
    const baseAt = css.search(/(?:^|\n)\s*#main\s*\{/);
    const shellAt = css.indexOf(".dashboard-shell #main");
    expect(baseAt).toBeGreaterThan(-1);
    expect(shellAt).toBeGreaterThan(-1);
    expect(css).toContain(".dashboard-shell #main");
  });

  it("accounts for the upgrade bar that only signed-in free users see", () => {
    expect(css).toContain("[data-analyzer-announcement-bar]");
    // The marker has to exist on the element, or the :has() never matches.
    expect(read("components/investcalc/header.tsx"))
      .toContain("data-analyzer-announcement-bar");
  });

  it("still has something to point at", () => {
    // If #main is renamed, every rule above goes quietly inert.
    expect(read("components/investcalc/investcalc-page.tsx")).toContain('id="main"');
  });
});

describe("the share dialog returns focus to its trigger", () => {
  const source = read("components/investcalc/share-link-button.tsx");

  it("holds the trigger itself, because there is no DialogTrigger", () => {
    // The dialog is controlled so the auth choices can live inside it, which
    // means Radix has no trigger in context and its default close-focus lands
    // on <body>: a keyboard user is dropped at the top of the document.
    // Match the JSX/import, not the word — the component's own comment says
    // "is NOT a DialogTrigger", and an earlier version of this test matched
    // that comment and reported a false failure.
    expect(source).not.toMatch(/<DialogTrigger[\s/>]/);
    expect(source).not.toMatch(/^\s*DialogTrigger,$/m);
    expect(source).toContain("const triggerRef = useRef<HTMLButtonElement>(null)");
    expect(source).toContain("ref={triggerRef}");
  });

  it("takes over close-focus rather than letting it fall through", () => {
    expect(source).toContain("onCloseAutoFocus");
    // preventDefault is load-bearing: without it Radix's own restore runs too.
    const handler = source.slice(source.indexOf("onCloseAutoFocus"));
    expect(handler.slice(0, 400)).toContain("event.preventDefault()");
    expect(handler.slice(0, 400)).toContain("triggerRef.current?.focus()");
  });
});

describe("a dead share link explains itself", () => {
  const path = "app/s/[token]/not-found.tsx";

  it("has its own not-found page", () => {
    expect(existsSync(join(root, path)), `${path} is missing`).toBe(true);
  });

  it("reveals nothing about WHY the token failed", () => {
    // page.tsx renders the same 404 for revoked / expired / malformed /
    // rate-limited / never-existed, on purpose: anything that distinguished
    // them is an oracle for probing which tokens are real. Copy must not
    // reintroduce that distinction.
    // Strip comments first. The file's own header comment DESCRIBES the
    // security property ("no oracle distinguishing never existed from
    // revoked"), and scanning it verbatim flagged the explanation as the leak.
    const body = stripComments(read(path)).toLowerCase();
    const oracles = ["has been revoked", "was revoked", "has expired", "is expired",
                     "never existed", "does not exist", "invalid token", "rate limit"];
    const leaked = oracles.filter((phrase) => body.includes(phrase));
    expect(leaked, `share 404 copy distinguishes failure causes: ${leaked.join(", ")}`)
      .toEqual([]);
  });

  it("sends the visitor back to the sender, not to the blog", () => {
    // The generic site 404 offers a search box and six content links, which is
    // the wrong recovery path: you cannot search your way to a private deal.
    const body = read(path);
    expect(body).toMatch(/fresh link|whoever sent/i);
  });
});
