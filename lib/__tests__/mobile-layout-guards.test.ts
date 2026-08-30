import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Source-level regression guards for the mobile layout/reachability fixes
 * (sitewide UI audit, Aug 2026). Each of these is a cross-file contract that
 * a single innocent-looking edit can break silently, with no type error and
 * no failing behaviour test:
 *
 *   1. Native <select>s must be 16px on phones. Under 16px, iOS Safari zooms
 *      the page in on focus and never zooms back out. `components/ui/input.tsx`
 *      already encodes `text-base … md:text-sm`; the raw <select>s bypass that
 *      primitive, so the rule has to be re-stated (and can drift) per site.
 *   2. The BRRRR / fix-and-flip collapse toggles must keep a ≥44px tap band on
 *      phones — they render publicly on every /d/<share> page.
 *   3. app/globals.css reserves footer space while a sticky bottom bar is
 *      mounted, and offsets the dashboard skip-link target past the fixed
 *      Topbar. Both rules key off attributes that live in OTHER files, so the
 *      selector and the markup have to be checked together.
 */

function read(relativePath: string): string {
  return readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8",
  );
}

/**
 * The props text of every native <select> in a file — from `<select` up to the
 * first `<option` it renders. (Scanning to the first `>` doesn't work: the
 * props contain arrow functions.)
 */
function selectOpeningTags(source: string): string[] {
  const tags: string[] = [];
  let index = source.indexOf("<select");
  while (index !== -1) {
    const optionAt = source.indexOf("<option", index);
    tags.push(source.slice(index, optionAt === -1 ? index + 800 : optionAt));
    index = source.indexOf("<select", index + 1);
  }
  return tags;
}

describe("mobile layout guards", () => {
  // app/admin/email-preview/preview-controls.tsx is intentionally excluded —
  // internal admin tool, never opened on a phone.
  const selectFiles = [
    "../../components/investcalc/operating-expenses-section.tsx",
    "../../components/investcalc/scenarios-card.tsx",
    "../../components/investcalc/templates-management-page.tsx",
    "../../components/investcalc/template-form-dialog.tsx",
    "../../components/settings/buy-boxes-card.tsx",
  ];

  it.each(selectFiles)("native <select> in %s is 16px on phones", (file) => {
    const tags = selectOpeningTags(read(file));
    expect(tags.length).toBeGreaterThan(0);
    for (const tag of tags) {
      expect(tag).toContain("text-base");
      // A bare `text-sm` would win at every width; only the md: variant is ok.
      for (const match of tag.matchAll(/(\S*)text-sm/g)) {
        expect(match[1]).toBe("md:");
      }
    }
  });

  it.each([
    "../../components/investcalc/brrrr-card.tsx",
    "../../components/investcalc/fix-flip-card.tsx",
  ])("%s collapse toggle keeps a 44px tap band on phones", (file) => {
    const source = read(file);
    const toggleAt = source.indexOf("setExpanded((e) => !e)");
    expect(toggleAt).toBeGreaterThan(-1);
    // The toggle's className sits between its onClick and its label.
    const tag = source.slice(toggleAt, source.indexOf("</button>", toggleAt));
    expect(tag).toContain("min-h-11");
    expect(tag).toContain("py-2");
  });

  it("the footer clears whatever sticky bottom bar is mounted", () => {
    const css = read("../../app/globals.css");
    // The rule and the markup it selects have to move together.
    expect(css).toContain(
      "body:has([data-sticky-bottom-bar]) [data-site-footer]",
    );
    expect(read("../../components/marketing/site-footer.tsx")).toContain(
      'data-site-footer=""',
    );
    for (const file of [
      "../../components/marketing/sticky-conversion-bar.tsx",
    ]) {
      expect(read(file)).toContain('data-sticky-bottom-bar=""');
      // …and each one must be conditionally RENDERED, not hidden by a
      // breakpoint class — that is what makes the unconditional rule above
      // safe. A `sm:hidden`/`md:hidden` on the bar itself would leave it
      // mounted-but-invisible and pad the footer for nothing.
      const barTag = read(file).slice(
        read(file).indexOf('data-sticky-bottom-bar=""'),
      );
      expect(barTag.slice(0, barTag.indexOf(">"))).not.toMatch(
        /\b(sm|md|lg):hidden\b/,
      );
    }
    // The calculator's own submit bar is matched via its existing attribute…
    const calcBar = read(
      "../../components/investcalc/sticky-calculate-bar.tsx",
    );
    expect(calcBar).toContain('data-sticky-calc-bar=""');
    // …but it is `lg:hidden`, i.e. it stays MOUNTED with display:none from
    // 1024px up, so :has() matches it in the desktop cockpit too. Its
    // footer-padding branch MUST stay inside the below-lg media query or it
    // re-grows 72px of dead footer space at desktop widths.
    expect(calcBar).toContain("lg:hidden fixed");
    expect(css).toMatch(
      /@media \(max-width: 1023\.9px\) \{\s*body:has\(\[data-sticky-calc-bar\]\) \[data-site-footer\] \{\s*padding-bottom: calc\(4\.5rem \+ env\(safe-area-inset-bottom\)\);\s*\}\s*\}/,
    );
    // And it must not ALSO appear unscoped anywhere.
    expect(css).not.toContain(
      "body:has([data-sticky-bottom-bar], [data-sticky-calc-bar])",
    );
  });

  it("dashboard deep links resolve the RENDERED deal anchor, not the first id match", () => {
    // TopDeals emits id="deal-<id>" twice (mobile <article> + desktop <tr>)
    // and both stay in the DOM at every width, so document.getElementById
    // returns whichever comes first in document order — frequently the
    // display:none copy, on which scrollIntoView/focus are silent no-ops.
    const topDeals = read("../../components/dashboard/TopDeals.tsx");
    expect(topDeals.match(/id=\{`deal-\$\{dealId\}`\}/g)?.length).toBe(2);

    const home = read("../../components/dashboard/DashboardHome.tsx");
    expect(home).toContain("pickRenderedAnchor");
    expect(home).toContain("dealAnchorSelector");
    // No getElementById lookup may survive — not in the initial resolve and
    // not in the two-rAF retry after REVEAL_DEAL_EVENT.
    expect(home).not.toMatch(/getElementById\(`deal-/);
    // Both lookups go through the shared helper.
    const scrollToDeal = home.slice(
      home.indexOf("function scrollToDeal("),
      home.indexOf("function getDecisionHighlights("),
    );
    expect(scrollToDeal.match(/findRenderedDealAnchor\(id\)/g)?.length).toBe(2);
    // The null branch (nothing laid out) is what asks TopDeals to expand.
    expect(scrollToDeal).toContain("REVEAL_DEAL_EVENT");
  });

  it("the dashboard skip-link target clears the fixed mobile Topbar", () => {
    const css = read("../../app/globals.css");
    expect(css).toMatch(
      /\.dashboard-shell #main \{\s*scroll-margin-top: 4rem;/,
    );
    // The shell's skip link must stay viewport-fixed: .dashboard-shell is not
    // positioned, so focus:absolute pins it to the document top instead.
    const shell = read("../../components/dashboard/dashboard-shell.tsx");
    const skipLinkClasses = shell.match(/className="sr-only[^"]*"/)?.[0] ?? "";
    expect(skipLinkClasses).toContain("focus:fixed");
    expect(skipLinkClasses).not.toContain("focus:absolute");
  });
});
