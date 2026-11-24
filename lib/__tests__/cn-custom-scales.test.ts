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

/**
 * DESIGN.md names elevation and radius by role. The aliases in
 * app/globals.css (`--shadow-rest`, `--radius-object` and their siblings)
 * are sizes, not colors: tailwind-merge has to know them, or `shadow-rest`
 * reads as a shadow color and stacks on the size class it should replace.
 */
describe("cn() knows the role names for elevation and radius", () => {
  it("merges a role shadow with a size shadow, and one role shadow with another", () => {
    expect(cn("shadow-sm", "shadow-rest")).toBe("shadow-rest");
    expect(cn("shadow-float", "shadow-float-up")).toBe("shadow-float-up");
    expect(cn("shadow-rest", "shadow-panel")).toBe("shadow-panel");
  });

  it("merges a role radius with a size radius and keeps it next to a border color", () => {
    expect(cn("rounded-lg", "rounded-object")).toBe("rounded-object");
    expect(cn("rounded-object", "border-border").split(" ")).toEqual(["rounded-object", "border-border"]);
  });

  it.each(["rounded-tag", "rounded-control", "rounded-object", "rounded-float"])("treats %s as a radius", (radius) => {
    expect(cn("rounded-md", radius)).toBe(radius);
  });

  it.each(["shadow-rest", "shadow-float", "shadow-panel"])("treats %s as a shadow size", (shadow) => {
    expect(cn("shadow-lg", shadow)).toBe(shadow);
    // A shadow color is a different group and stays.
    expect(cn(shadow, "shadow-primary/20").split(" ")).toEqual([shadow, "shadow-primary/20"]);
  });
});
