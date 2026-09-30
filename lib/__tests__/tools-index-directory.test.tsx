/**
 * /tools directory (2026-09 design pass). The index renders one group per
 * registry category, but a category whose calculators are all unreleased used
 * to render its heading over an empty list (live on 2026-09-30: "Returns",
 * 0 links, because every returns calculator is in
 * UNRELEASED_UNDERWRITING_CALCULATORS). These pin the rendered page, not the
 * source, so they fail if an empty group comes back or a released calculator
 * drops out of the directory.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ToolsLandingPage from "@/app/tools/page";
import { CALCULATOR_REGISTRY, calculatorsByCategory } from "@/lib/calculator-registry";

const html = renderToStaticMarkup(ToolsLandingPage());
const main = html.slice(html.indexOf('<main id="main"'), html.indexOf("</main>"));

/** Each category group as rendered: its id and the /tools/<slug> links inside it. */
function renderedGroups(): { category: string; slugs: string[] }[] {
  const groups: { category: string; slugs: string[] }[] = [];
  const opener = /<section aria-labelledby="cat-([a-z]+)"/g;
  const starts = [...main.matchAll(opener)];
  starts.forEach((match, index) => {
    const end = main.indexOf("</section>", match.index);
    const body = main.slice(match.index, end);
    // Groups are siblings, never nested: the next group must start after this one closes.
    const next = starts[index + 1];
    if (next) expect(next.index).toBeGreaterThan(end);
    const slugs = [...body.matchAll(/<a [^>]*href="\/tools\/([^"#?]+)"/g)].map((m) => m[1]);
    groups.push({ category: match[1], slugs });
  });
  return groups;
}

describe("/tools directory", () => {
  it("renders no category group without a released calculator", () => {
    const groups = renderedGroups();
    expect(groups.length).toBeGreaterThan(0);
    for (const group of groups) {
      expect(group.slugs, `cat-${group.category} renders a heading over no calculators`).not.toEqual([]);
    }
    const emptyInRegistry = calculatorsByCategory()
      .filter((group) => group.items.length === 0)
      .map((group) => group.category);
    for (const category of emptyInRegistry) {
      expect(main).not.toContain(`id="cat-${category}"`);
    }
  });

  it("lists every released calculator once, in registry category order", () => {
    const expected = calculatorsByCategory()
      .filter((group) => group.items.length > 0)
      .map((group) => ({ category: group.category, slugs: group.items.map((tool) => tool.slug) }));
    expect(renderedGroups()).toEqual(expected);
    const rendered = renderedGroups().flatMap((group) => group.slugs);
    expect([...rendered].sort()).toEqual(CALCULATOR_REGISTRY.map((tool) => tool.slug).sort());
  });
});
