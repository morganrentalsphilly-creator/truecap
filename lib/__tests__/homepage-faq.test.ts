import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { homepageFaqItems } from "@/components/marketing/landing-sections";
import { AGENT_FAQS } from "@/lib/agent-faqs";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

// 2026-11 ads pass (C2): the homepage speaks to the investor first, so its
// FAQ is the investor set, the one /for-investors shows, under one FAQPage
// node. (It was a curated eight, seven of them agent questions.) The agent
// questions stay on /for-agents.
describe("the homepage's questions", () => {
  const items = homepageFaqItems("home");

  it("is the investor set, in order", () => {
    expect(items.map((item) => item.q)).toEqual(
      homepageFaqItems("investors").map((item) => item.q),
    );
    expect(items.length).toBeGreaterThanOrEqual(5);
    expect(items.map((item) => item.q)).toContain("Is TrueCap really free?");
    expect(items.every((item) => item.a.length > 40)).toBe(true);
  });

  it("carries no agent question, and /for-agents keeps them all", () => {
    const agentQuestions = new Set(AGENT_FAQS.map((faq) => faq.q));
    expect(items.filter((item) => agentQuestions.has(item.q))).toEqual([]);
    expect(read("app/for-agents/page.tsx")).toContain("items={AGENT_FAQS}");
  });

  it("sits under the investor heading", () => {
    const sections = read("components/marketing/landing-sections.tsx");
    const home = sections.slice(sections.indexOf('audience === "home" ? ('));
    expect(home.slice(0, home.indexOf("/>"))).toContain(
      'heading="The questions investors ask first."',
    );
  });

  it("is what both homepages render", () => {
    for (const page of ["app/page.tsx", "app/home-authed/page.tsx"]) {
      expect(read(page), page).toContain('<HomepageFaq audience="home" />');
    }
  });
});
