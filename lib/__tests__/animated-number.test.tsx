import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AnimatedNumber } from "@/components/motion/animated-number";

describe("AnimatedNumber initial output", () => {
  it.each([
    ["usd", 1250, "$1,250"],
    ["usdSigned", -1250, "-$1,250"],
    ["usdSigned", 1250, "+$1,250"],
    ["usdCents", 12.5, "$12.50"],
    ["usdPerMonth", 1250, "$1,250/mo"],
    ["ratio", 1.25, "1.25"],
    ["percent", 8.5, "8.5%"],
    ["integer", 1250, "1,250"],
  ] as const)("keeps %s visible and accessible before animation is needed", (kind, value, text) => {
    const html = renderToStaticMarkup(<AnimatedNumber value={value} kind={kind} />);
    expect(html).toContain(`<span class="sr-only">${text}</span>`);
    expect(html).toContain(`>${text}</span>`);
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain("number-flow-react");
  });
});
