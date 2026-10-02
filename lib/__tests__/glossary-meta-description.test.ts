import { describe, expect, it } from "vitest";
import { generateMetadata } from "@/app/glossary/[slug]/page";
import { GLOSSARY } from "@/lib/glossary";

/**
 * A glossary term's snippet and link-preview text end on a full stop.
 *
 * The page used to cut "definition + benchmark" at the limit: 14 of the 44
 * meta descriptions ended mid-sentence with an ellipsis and 8 og:descriptions
 * were sliced mid-word at 200 characters (/glossary/dscr ended "Lender
 * definitio"). These are rules, not a snapshot of today's entries: they hold
 * for whatever lib/glossary.ts contains.
 */
const SNIPPET_MAX = 155;
const PREVIEW_MAX = 200;
const firstSentence = (text: string) => text.trim().split(/(?<=[.!?])\s+/)[0];

describe("glossary term descriptions", async () => {
  const entries = Object.values(GLOSSARY);
  const built = await Promise.all(
    entries.map(async (entry) => {
      const metadata = await generateMetadata({ params: Promise.resolve({ slug: entry.slug }) });
      return {
        entry,
        snippet: String(metadata.description ?? ""),
        preview: String((metadata.openGraph as { description?: string } | undefined)?.description ?? ""),
      };
    }),
  );

  it("covers every term", () => {
    expect(built.length).toBe(entries.length);
    expect(built.length).toBeGreaterThan(0);
    for (const { entry, snippet, preview } of built) {
      expect(snippet, entry.slug).not.toBe("");
      expect(preview, entry.slug).not.toBe("");
    }
  });

  it.each([
    ["the meta description", "snippet", SNIPPET_MAX],
    ["the og:description", "preview", PREVIEW_MAX],
  ] as const)("%s fits its limit and ends a sentence, or cuts an over-long first sentence at a word", (_label, key, max) => {
    for (const row of built) {
      const { entry } = row;
      const text = row[key];
      const definition = entry.definition.trim();
      const both = entry.benchmark ? `${definition} ${entry.benchmark.trim()}` : definition;
      expect(text.length, `${entry.slug}: ${text}`).toBeLessThanOrEqual(max);

      if (firstSentence(definition).length > max) {
        // Nothing whole fits: a word-boundary cut, marked as a cut.
        expect(text.endsWith("…"), `${entry.slug}: ${text}`).toBe(true);
        const kept = text.slice(0, -1);
        expect(definition.startsWith(kept), entry.slug).toBe(true);
        expect(definition[kept.length], `${entry.slug}: cut inside a word`).toMatch(/[\s,;:/·—-]/);
        continue;
      }
      // The source text, never reworded, ending where a sentence ends.
      expect(both.startsWith(text), `${entry.slug}: ${text}`).toBe(true);
      expect(text, entry.slug).toMatch(/[.!?]$/);
      expect(text === both || both[text.length] === " ", `${entry.slug}: stops inside a sentence`).toBe(true);
      // A benchmark is quoted whole or not at all.
      if (text.length > definition.length) expect(text, entry.slug).toBe(both);
      // And nothing that fits whole is left out.
      if (both.length <= max) expect(text, entry.slug).toBe(both);
      else if (definition.length <= max) expect(text, entry.slug).toBe(definition);
    }
  });

  it("no longer slices the DSCR preview mid-word", () => {
    const dscr = built.find((row) => row.entry.slug === "dscr");
    expect(dscr).toBeDefined();
    expect(dscr!.preview).not.toMatch(/definitio$/);
    expect(dscr!.preview).toMatch(/\.$/);
    expect(dscr!.snippet).toMatch(/\.$/);
  });
});
