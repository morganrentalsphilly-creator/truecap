import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

/**
 * docs/STRIPE-PRODUCTION-CHECKLIST.md read as the launch checklist while it
 * named 7 of the webhook handler's event types and a success URL the code no
 * longer uses (go-to-market audit, P2-133). The document now says what it
 * covers and lists every event type the handler dispatches; these cases keep
 * the two statements that can be checked against code true.
 */
describe("Stripe production checklist", () => {
  const doc = read("docs/STRIPE-PRODUCTION-CHECKLIST.md");
  const handler = read("app/api/stripe/webhooks/route.ts");
  const dispatched = [...new Set([...handler.matchAll(/^\s*case "([a-z_]+(?:\.[a-z_]+)+)":/gm)].map((m) => m[1]))].sort();

  it("lists every event type the webhook handler dispatches, and no other", () => {
    expect(dispatched.length).toBeGreaterThanOrEqual(31);
    const section = doc.slice(doc.indexOf("Event types the webhook handler dispatches"), doc.indexOf("## Safety rules"));
    const listed = [...new Set([...section.matchAll(/`([a-z_]+(?:\.[a-z_]+)+)`/g)].map((m) => m[1]))].sort();
    expect(listed).toEqual(dispatched);
    expect(doc).toContain(`dispatches ${dispatched.length} event types`);
  });

  it("gives the success URL the checkout action really sets", () => {
    const billing = read("app/actions/billing.ts");
    const successUrl = billing.match(/success_url: `\$\{siteUrl\}([^`]+)`/)?.[1];
    expect(successUrl).toBe("/api/billing/return?session_id={CHECKOUT_SESSION_ID}");
    expect(doc).toContain(`\`${successUrl}\``);
    // The Session id is not in the landing URL any more.
    expect(doc).not.toContain("billing=success&session_id");
    expect(read("lib/stripe/checkout-return-cookie.ts")).toContain('CHECKOUT_RETURN_LANDING_PATH = "/dashboard/new?billing=success"');
    expect(doc).toContain("`/dashboard/new?billing=success`");
  });

  it("says it is not a launch checklist", () => {
    expect(doc).toContain("It is not a launch checklist");
    expect(doc).toMatch(/shared with a second product/);
    expect(doc).toMatch(/no Stripe test mode for this project/);
  });
});
