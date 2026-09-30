import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { ProductShot } from "@/components/marketing/product-shot";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/**
 * The shared chrome the 2026-09 design-pass census found unconverted
 * (DESIGN.md "Chrome", "Typography"). Each assertion fails on the markup it
 * replaced.
 */
describe("shared chrome on the design system", () => {
  it("renders a screenshot as a document in a figure by default, never in a fake browser frame", () => {
    const html = renderToStaticMarkup(
      <ProductShot shot="verdict" alt="The sample deal's decision" caption="The sample deal" />,
    );
    expect(html).toMatch(/^<figure class="min-w-0"><div class="overflow-hidden border border-border bg-card"><img /);
    expect(html).toContain('<figcaption class="mt-2.5 text-sm text-muted-foreground">The sample deal</figcaption>');
    // The old default drew a chrome bar of three round dots over the shot.
    expect(html).not.toContain("rounded-full");
    expect(html).not.toContain('aria-hidden="true"');
    expect(read("components/marketing/product-shot.tsx")).not.toContain('"browser"');
  });

  it("keeps the header's auth placeholder static and its signed-in upsell on paper", () => {
    const header = read("components/investcalc/header.tsx");
    expect(header).not.toContain("animate-pulse");
    expect(header).toContain('<div className="h-10 w-10" aria-hidden />');
    expect(header).not.toMatch(/<(?:Zap|Crown)\b/);
    expect(header).not.toMatch(/text-(?:2xs|3xs|xs)\b|uppercase|tracking-wider|font-bold/);
    const stripStart = header.indexOf('data-analyzer-announcement-bar=""');
    const stripEnd = header.indexOf("<header", stripStart);
    expect(stripStart).toBeGreaterThan(-1);
    expect(stripEnd).toBeGreaterThan(stripStart);
    const strip = header.slice(stripStart, stripEnd);
    expect(strip).toMatch(/^data-analyzer-announcement-bar=""\s+className="border-b border-border bg-background"/);
    // Copy stays as written: the closing clause shows from sm, as it did on
    // the blue band, and the row grows (min-h-9) rather than hiding it.
    expect(strip).toMatch(/<span className="hidden text-muted-foreground sm:inline">\s*\{" "\}for deeper scenarios with transparent, editable assumptions\./);
    expect(strip).toContain('"flex min-h-9 items-center gap-3"');
    // The strip is the first thing in the sticky wrapper, so the 44px
    // dismiss target may only overflow downward, never above the viewport.
    expect(strip).toMatch(/className="relative -mb-2 -mr-3 inline-flex size-11 /);
    expect(strip).not.toMatch(/-my-\d|-mt-\d/);
  });

  it("gives the user menu no orange badge, a 4px trigger and 14px text", () => {
    const menu = read("components/auth/user-menu.tsx");
    expect(menu).not.toMatch(/brand-orange|Crown/);
    expect(menu).toContain('"h-10 px-2 sm:px-3 rounded-md border border-transparent hover:border-border"');
    expect(menu).not.toMatch(/text-(?:2xs|3xs|xs)\b/);
    // Signal Blue means "act here": the initials sit on the band in ink,
    // not on a blue wash (DESIGN.md color).
    expect(menu.match(/<AvatarFallback className="bg-band text-foreground /g)).toHaveLength(2);
    expect(menu).not.toMatch(/bg-primary\/10|text-primary\b/);
  });

  it("sets toasts on opaque raised paper with the one float shadow and named transitions", () => {
    const toast = read("components/ui/toast.tsx");
    expect(toast).toContain("rounded-2xl border border-border bg-card");
    expect(toast).toContain("shadow-md transition-transform");
    // A title-only toast is ~50px of padding box; min-h-16 keeps the 44px
    // close target at top-2 and its focus outline inside overflow-hidden.
    expect(toast).toContain("'group pointer-events-auto relative flex min-h-16 w-full items-start");
    expect(toast).not.toMatch(/backdrop-blur|transition-all|shadow-\[|rgba\(|bg-card\/|border-border\//);
    expect(toast).not.toMatch(/font-bold|rounded-full|focus:outline-none|focus:ring-/);
    // ToastAction and ToastClose: 44px targets at the control radius.
    expect(toast).toMatch(/'inline-flex min-h-11 shrink-0 items-center justify-center rounded-md/);
    expect(toast).toMatch(/'absolute right-2 top-2 inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors/);
    const toaster = read("components/ui/toaster.tsx");
    expect(toaster).not.toMatch(/rounded-full|bg-primary\/10/);
    // Every variant sits on the same paper, so each has its own glyph and a
    // failure never differs from a caution by icon color alone.
    expect(toaster).toMatch(/variant === 'destructive'\s*\?\s*XCircle\s*:\s*variant === 'warning'\s*\?\s*AlertTriangle/);
  });

  it("puts tooltips on popover paper with a matching arrow, at 14px, with the float radius", () => {
    const tooltip = read("components/ui/tooltip.tsx");
    expect(tooltip).toContain("'bg-popover text-popover-foreground border border-border shadow-md");
    // Tooltip bodies are running text: pretty, not balanced (DESIGN.md).
    expect(tooltip).toMatch(/rounded-2xl px-3 py-1\.5 text-sm text-pretty'/);
    expect(tooltip).not.toContain("text-balance");
    expect(tooltip).toContain('<TooltipPrimitive.Arrow className="bg-popover fill-popover');
    expect(tooltip).not.toMatch(/bg-foreground|fill-foreground|text-background/);
    const glossaryTip = read("components/investcalc/glossary-tip.tsx");
    expect(glossaryTip).not.toMatch(/text-xs|bg-popover|shadow-md/);
  });

  it("sets labels at 600", () => {
    const label = read("components/ui/label.tsx");
    expect(label).toContain("text-sm leading-none font-semibold");
    expect(label).not.toContain("font-medium");
  });
});
