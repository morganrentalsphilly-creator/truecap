/**
 * <QuoteStrip /> (2026-11 ads pass, D1): the compact strip of consented
 * quotes on /, /for-investors, /for-agents and the sign-up page. It reads
 * the published rows the /reviews flow produces and must render NOTHING when
 * there are none: no heading, no rule, no placeholder, no sample quote.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicTestimonial } from "@/lib/testimonials/rules";

const rows: PublicTestimonial[] = [];
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabaseClient: () => ({}) }));
vi.mock("@/lib/testimonials/store", () => ({
  listPublishedTestimonials: vi.fn(async (_client: unknown, limit: number) => rows.slice(0, limit)),
}));

import { QuoteStrip } from "@/components/marketing/testimonials";
import { listPublishedTestimonials } from "@/lib/testimonials/store";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const render = async (props: Parameters<typeof QuoteStrip>[0] = {}) => {
  const node = await QuoteStrip(props);
  return node ? renderToStaticMarkup(node) : "";
};

afterEach(() => {
  rows.length = 0;
  vi.mocked(listPublishedTestimonials).mockClear();
});

describe("QuoteStrip", () => {
  it("renders nothing at all with no published quotes", async () => {
    expect(await QuoteStrip({})).toBeNull();
    expect(await render({ variant: "stacked" })).toBe("");
  });

  it("renders nothing when the read fails", async () => {
    vi.mocked(listPublishedTestimonials).mockRejectedValueOnce(new Error("no table"));
    expect(await QuoteStrip({})).toBeNull();
  });

  it("shows only what the source returned, with its attribution", async () => {
    rows.push({
      id: "t1",
      quote: "FIXTURE QUOTE ONE",
      firstName: "Fixture",
      role: null,
      market: "Fixtureville",
      publishedAt: "2026-11-01T00:00:00.000Z",
    } as PublicTestimonial);
    const html = await render();
    expect(html).toContain("FIXTURE QUOTE ONE");
    expect(html).toContain("Fixture");
    expect(html).toContain("Fixtureville");
    expect(html).toContain('href="/reviews"');
    // Exactly the rows returned: one figure, nothing invented beside it.
    expect(html.match(/<figure/g)).toHaveLength(1);
    expect(vi.mocked(listPublishedTestimonials)).toHaveBeenCalledWith(expect.anything(), 2);
  });

  it("is mounted on the three landing pages and beside the sign-up form", () => {
    for (const page of [
      "app/page.tsx",
      "app/home-authed/page.tsx",
      "app/for-investors/page.tsx",
      "app/for-agents/page.tsx",
      "app/auth/sign-up/page.tsx",
    ]) {
      expect(read(page), page).toContain("<QuoteStrip");
    }
    // It carries no quote of its own: every string it prints comes from a row.
    const source = read("components/marketing/testimonials.tsx");
    const strip = source.slice(source.indexOf("export async function QuoteStrip"));
    expect(strip).toContain("if (rows.length === 0) return null;");
    expect(strip).not.toMatch(/placeholder|sample quote|lorem/i);
  });
});
