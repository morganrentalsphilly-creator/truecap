/**
 * The sign-up side panel (from 1024px, every visitor) said "Know your
 * walk-away price before you make the offer.": the investor's headline, shown
 * to an agent as well. It now names no audience: "the Buy Box" is the
 * client's for an agent and their own for an investor.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("sign-up side panel headline", () => {
  const page = read("app/auth/sign-up/page.tsx");
  const title = /panelTitle="([^"]+)"/.exec(page)?.[1] ?? "";
  const lede = /panelDescription="([^"]+)"/.exec(page)?.[1] ?? "";

  it("is one headline for every visitor, not chosen by plan", () => {
    expect(page.match(/panelTitle=/g)).toHaveLength(1);
    expect(page.match(/panelDescription=/g)).toHaveLength(1);
    expect(title).toBe("Know the highest price that still meets the Buy Box.");
  });

  it("names neither audience and whose Buy Box it is", () => {
    for (const copy of [title, lede]) {
      expect(copy).not.toMatch(/\b(?:agents?|investors?|clients?|your offer|you make the offer|walk[- ]away)\b/i);
      expect(copy).not.toMatch(/\byour (?:client's )?Buy Box\b/i);
    }
  });

  it("keeps the voice rules: no exclamation mark, no figure, no speed claim", () => {
    for (const copy of [title, lede]) {
      expect(copy).not.toMatch(/[!\d]|seconds?|minutes?|instant/i);
    }
  });
});
