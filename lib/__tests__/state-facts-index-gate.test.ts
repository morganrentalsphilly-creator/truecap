/**
 * F8 state fact gate: a /states page is indexable only on its sourced facts
 * (content/seo/state-facts.json via lib/seo/state-facts.ts). Every committed
 * state has facts, so the rest of the suite never reaches the
 * `stateFactsFor(slug) === null` branch of isStateIndexable. This file removes
 * one state's facts from the dataset the loader imports and checks that the
 * state drops out everywhere indexability is read: the page's robots tag, the
 * indexable-slug helper, the sitemap and llms.txt. It fails if the fact gate
 * is removed.
 */

import { describe, expect, it, vi } from "vitest";

const DROPPED = "ohio";

vi.mock("@/content/seo/state-facts.json", async (importOriginal) => {
  const original = (await importOriginal()) as { default: { states: Record<string, unknown> } };
  const states = { ...original.default.states };
  delete states[DROPPED];
  return { default: { states } };
});

describe("state indexability without sourced facts", () => {
  it("the loader no longer has the dropped state's facts (the mock took)", async () => {
    const { stateFactsFor } = await import("@/lib/seo/state-facts");
    expect(stateFactsFor(DROPPED)).toBeNull();
    expect(stateFactsFor("texas")).not.toBeNull();
  });

  it("is not indexable, though it still has HUD cities and the other states stay indexable", async () => {
    const { getIndexableStateSlugs, getStateHudCities, isStateIndexable, estimateStatePageWords } = await import(
      "@/lib/markets/indexability"
    );
    const { STATES } = await import("@/lib/states");
    expect(getStateHudCities(STATES[DROPPED]!.name).length).toBeGreaterThan(0);
    expect(estimateStatePageWords(DROPPED)).toBe(0);
    expect(isStateIndexable(DROPPED)).toBe(false);
    expect(getIndexableStateSlugs()).not.toContain(DROPPED);
    expect(getIndexableStateSlugs()).toHaveLength(Object.keys(STATES).length - 1);
  });

  it("renders noindex, follow and leaves the sitemap and llms.txt", async () => {
    const { generateMetadata } = await import("@/app/states/[slug]/page");
    const { NOINDEX_FOLLOW } = await import("@/lib/markets/indexability");
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: DROPPED }) });
    expect(metadata.robots).toEqual(NOINDEX_FOLLOW);
    const indexed = await generateMetadata({ params: Promise.resolve({ slug: "texas" }) });
    expect(indexed.robots).toBeUndefined();

    const { default: sitemap } = await import("@/app/sitemap");
    const paths = sitemap().map((entry) => new URL(entry.url).pathname);
    expect(paths).not.toContain(`/states/${DROPPED}`);
    expect(paths).toContain("/states/texas");

    const { GET } = await import("@/app/llms.txt/route");
    const llms = await (await GET()).text();
    expect(llms).not.toContain(`/states/${DROPPED})`);
    expect(llms).toContain("/states/texas)");
  });
});
