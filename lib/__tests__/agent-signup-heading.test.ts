/**
 * The sign-up page's heading for an agent (?plan=agent-pro).
 *
 * An agent who pressed an Agent Pro CTA used to land under "You're one step
 * away from your full deal decision." and "Pro evaluation": the investor's
 * words. The page now shows an agent heading and lede, and the rule for them
 * is narrow: every sentence is one /for-agents or the agent FAQ already
 * prints, and none of them says what the trial includes (the form prints
 * that, with the sentence that the roster is not part of the trial). These
 * cases hold the copy to its sources, so a change on /for-agents or in the
 * FAQ reddens here instead of leaving the sign-up page saying something the
 * pitch no longer says.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AGENT_FAQS } from "@/lib/agent-faqs";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const page = read("app/auth/sign-up/page.tsx");
const constant = (name: string) => {
  const match = new RegExp(`const ${name} =\\s*"([^"]+)";`).exec(page);
  expect(match, `${name} not found in app/auth/sign-up/page.tsx`).not.toBeNull();
  return match![1]!;
};

describe("sign-up heading for an agent", () => {
  it("the heading is the /for-agents H1", () => {
    expect(read("app/for-agents/page.tsx")).toContain(`title="${constant("AGENT_HEADING")}"`);
  });

  it("every part of the lede is already printed by the agent FAQ or the /for-agents hero note", () => {
    const lede = constant("AGENT_LEDE");
    const faqText = AGENT_FAQS.map((faq) => faq.a).join("\n");
    const forAgents = read("app/for-agents/page.tsx");
    const parts = ["Creating an account never asks for a card.", "Agent Pro is a separate plan for client workflows", "checkout shows the exact charge before you confirm."];
    expect(lede).toBe(`${parts[0]} ${parts[1]}; ${parts[2]}`);
    expect(faqText).toContain(parts[0]);
    expect(forAgents).toContain(parts[1]);
    expect(faqText).toContain(parts[2]);
  });

  it("says nothing about what the trial includes", () => {
    const copy = `${constant("AGENT_HEADING")} ${constant("AGENT_LEDE")}`;
    expect(copy).not.toMatch(/trial|evaluation|\d|days?\b|deals? analys|comparison|roster|co-brand/i);
  });

  it("shows only when Agent Pro is on sale and asked for, the form's own test", () => {
    const flat = page.replace(/\s+/g, " ");
    expect(flat).toContain('agentProConfigured && (Array.isArray(planParam) ? planParam[0] : planParam) === "agent-pro"');
    expect(read("components/auth/sign-up-form.tsx").replace(/\s+/g, " ")).toContain(
      'agentProConfigured && searchParams.get("plan") === "agent-pro"',
    );
    // Copy only: the page still hands the form the same flag and nothing else.
    expect(page).toContain("<SignUpForm agentProConfigured={agentProConfigured} />");
    expect(page).not.toMatch(/redirect\(|"use server"|cookies\(|headers\(/);
  });

  it("keeps the investor heading for everyone else", () => {
    expect(page).toContain(`: "You're one step away from your full deal decision."`);
  });
});
