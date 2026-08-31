import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { consumeAnalyzerHandoff } from "@/lib/analyzer-handoff";
import { stageAnalyzerHandoffForClick } from "@/lib/analyzer-handoff-navigation";

const ROOT = join(__dirname, "..", "..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

function sourceFiles(directory: string): string[] {
  return readdirSync(join(ROOT, directory), { withFileTypes: true }).flatMap(
    (entry) => {
      const relative = join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(relative);
      return /\.[tj]sx?$/.test(entry.name) ? [relative] : [];
    },
  );
}

describe("private analyzer handoff consumers", () => {
  it("routes every rendered buildAnalyzerHandoffUrl consumer through the safe link", () => {
    const consumers = [
      ...sourceFiles("app"),
      ...sourceFiles("components"),
    ].filter((path) => read(path).includes("buildAnalyzerHandoffUrl"));

    expect(consumers.length).toBeGreaterThan(20);
    for (const path of consumers) {
      const source = read(path);
      if (path.endsWith("components/marketing/seo-analyzer-cta.tsx")) {
        expect(source, path).toContain("<TrackedContentCtaLink");
        expect(source, path).toContain("handoffHref={href}");
      } else {
        expect(source, path).toContain("<AnalyzerHandoffLink");
        expect(source, path).toContain("handoffHref=");
      }
      expect(source, path).not.toContain("href={handoffHref}");
      expect(source, path).not.toContain("href={openUrl(row)}");
    }
  });

  it("renders only the scrubbed href and stages after preserved click handlers", () => {
    const link = read("components/analyzer-handoff-link.tsx");
    const navigation = read("lib/analyzer-handoff-navigation.ts");
    const tracked = read("components/analytics/tracked-content-cta-link.tsx");

    expect(link).toContain("scrubAnalyzerHandoffHref(handoffHref)");
    expect(link).toContain("href={renderedHref}");
    expect(link).not.toContain("href={handoffHref}");
    expect(link.indexOf("onClick?.(event)")).toBeLessThan(
      link.indexOf("stageAnalyzerHandoffForClick("),
    );
    expect(navigation).toContain("stageAnalyzerHandoffHref(");
    expect(navigation).toContain('normalizedTarget === "_top"');
    expect(navigation).toContain(
      "topWindow.location.origin !== currentWindow.location.origin",
    );
    expect(tracked).toContain("<AnalyzerHandoffLink");
    expect(tracked).toContain("handoffHref={handoffHref}");
  });

  it("preserves _top widgets and requires same-tab batch-triage handoff", () => {
    const toolConsumers = sourceFiles("components/tools").filter((path) =>
      read(path).includes("buildAnalyzerHandoffUrl"),
    );
    expect(toolConsumers).toHaveLength(19);
    for (const path of toolConsumers) {
      const source = read(path);
      expect(source, path).toContain('target="_top"');
      expect(source, path).toContain("handoffHref={handoffHref}");
    }

    const batch = read("components/investcalc/batch-triage-client.tsx");
    expect(batch.match(/handoffHref=\{openUrl\(row\)\}/g)).toHaveLength(2);
    expect(batch).not.toContain('target="_blank"');
    expect(batch).not.toContain('rel="noopener"');
    expect(batch).toContain('trackEvent("shortlist_item_promoted"');

    const values = new Map<string, string>();
    const storage = {
      get length() {
        return values.size;
      },
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      key: (index: number) => [...values.keys()][index] ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    } satisfies Storage;
    expect(
      stageAnalyzerHandoffForClick(
        "/?price=325000&address=123%20Main%20St",
        undefined,
        {
          button: 0,
          altKey: false,
          ctrlKey: false,
          metaKey: false,
          shiftKey: false,
          defaultPrevented: false,
        },
        {
          location: { origin: "https://usetruecap.com" },
          sessionStorage: storage,
          top: null,
        } as NonNullable<Parameters<typeof stageAnalyzerHandoffForClick>[3]>,
      ),
    ).toBe(true);
    expect(consumeAnalyzerHandoff("", storage)).toEqual({
      purchasePrice: 325000,
      address: "123 Main St",
    });
  });
});
