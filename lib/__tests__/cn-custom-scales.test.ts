import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

/**
 * The design pass's type ramp adds custom `--text-*` sizes. tailwind-merge
 * must treat them as font sizes: before extendTailwindMerge learned them,
 * `cn("text-key-sm", "text-foreground")` returned only "text-foreground".
 */
describe("cn() knows the custom type ramp", () => {
  it.each(["text-3xs", "text-2xs", "text-h3-sm", "text-section-sm", "text-section", "text-key-sm", "text-key", "text-display-sm", "text-display"])(
    "keeps %s next to a color",
    (size) => {
      expect(cn(size, "text-foreground").split(" ")).toEqual([size, "text-foreground"]);
      expect(cn(size, "text-muted-foreground").split(" ")).toContain(size);
    },
  );

  it("still resolves two sizes to the later one", () => {
    expect(cn("text-key-sm sm:text-key", "text-display-sm")).toBe("sm:text-key text-display-sm");
    expect(cn("text-lg", "text-section-sm")).toBe("text-section-sm");
  });

  it("keeps a custom shadow next to a shadow color and merges two shadows", () => {
    expect(cn("shadow-md", "shadow-float-up")).toBe("shadow-float-up");
  });
});
