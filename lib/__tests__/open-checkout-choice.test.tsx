import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OpenCheckoutChoice } from "@/components/billing/open-checkout-choice";

/**
 * When a buyer asks for a plan while their own Checkout Session for another
 * plan or billing period is still open, the plan card shows two actions in
 * place of its button: resume that checkout, or start over with this plan.
 * It replaced a red toast that told them to wait for the checkout to expire.
 */

const ROOT = join(__dirname, "..", "..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

function render(props: Partial<Parameters<typeof OpenCheckoutChoice>[0]> = {}) {
  return renderToStaticMarkup(
    createElement(OpenCheckoutChoice, {
      openPlanSlug: "pro_monthly",
      requestedPlanSlug: "pro_annual",
      pending: false,
      onResume: () => {},
      onStartOver: () => {},
      ...props,
    }),
  );
}

describe("OpenCheckoutChoice", () => {
  it("names both plans and offers exactly two actions, one of them filled", () => {
    const html = render();
    expect(html).toContain('role="status"');
    expect(html).toContain("You started a Pro monthly checkout earlier and it is still open.");
    expect(html).toContain("Starting over closes it.");
    const buttons = html.match(/<button[\s\S]*?<\/button>/g) ?? [];
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toContain("Start over with Pro annual");
    expect(buttons[0]).toContain("bg-primary");
    expect(buttons[1]).toContain("Resume the Pro monthly checkout");
    expect(buttons[1]).not.toContain("bg-primary");
    // 48px marketing buttons: the same target size as the plan button they replace.
    for (const button of buttons) expect(button).toContain("min-h-12");
  });

  it("says the terms differ when the open checkout is for the same plan", () => {
    const html = render({ openPlanSlug: "pro_annual" });
    expect(html).toContain(
      "You started a Pro annual checkout earlier and it is still open, on different terms.",
    );
    expect(html).toContain("Resume the earlier checkout");
    expect(html).toContain(">Start over<");
  });

  it("disables both actions while the start-over request runs", () => {
    const buttons = render({ pending: true }).match(/<button[\s\S]*?<\/button>/g) ?? [];
    expect(buttons).toHaveLength(2);
    for (const button of buttons) expect(button).toContain("disabled");
  });

  it("states no amount: prices stay on the plan card", () => {
    expect(render()).not.toMatch(/\$\s?\d/);
    expect(read("components/billing/open-checkout-choice.tsx")).not.toMatch(/\$\d/);
  });
});

describe("the two checkout entry points use the choice", () => {
  it.each([
    "components/marketing/pricing-plan-buttons.tsx",
    "components/profile/billing-panel.tsx",
  ])("%s shows the choice for CHECKOUT_OPEN_OTHER_PLAN and starts over with startOver: true", (path) => {
    const source = read(path);
    expect(source).toContain('result.code === "CHECKOUT_OPEN_OTHER_PLAN"');
    expect(source).toContain("<OpenCheckoutChoice");
    expect(source).toContain("startOver ? { planSlug, startOver: true } : { planSlug }");
    expect(source).toContain("window.location.href = openCheckout.resumeUrl;");
    // The branch returns before any toast is raised for this result.
    const branch = source.indexOf('result.code === "CHECKOUT_OPEN_OTHER_PLAN"');
    const branchEnd = source.indexOf("return;", branch);
    expect(source.slice(branch, branchEnd)).not.toContain("toast(");
  });
});
