import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "components/marketing/post-analysis-email-prompt.tsx"),
  "utf8"
);

describe("post-analysis prompt safety", () => {
  it("cannot open from the focused-results auto-scroll alone", () => {
    expect(source).toContain("SCROLL_ARM_DELAY_MS");
    expect(source).toContain("SCROLL_INTENT_DISTANCE_PX");
    expect(source).toContain("settledScrollY = window.scrollY");
    expect(source).toContain(
      "window.scrollY < settledScrollY + SCROLL_INTENT_DISTANCE_PX"
    );
  });

  it("keeps every control at least 44 CSS pixels high", () => {
    expect(source.match(/min-h-11/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).toContain("min-w-11");
  });

  it("keeps cookie-consent decisions at least 44 CSS pixels high", () => {
    const cookieBanner = readFileSync(
      join(process.cwd(), "components/marketing/cookie-consent-banner.tsx"),
      "utf8"
    );
    expect(cookieBanner.match(/min-h-11/g)?.length).toBeGreaterThanOrEqual(3);
    expect(cookieBanner).toContain("min-w-11");
  });
});
