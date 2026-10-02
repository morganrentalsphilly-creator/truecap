/**
 * Small truths the 2026-10 go-to-market audit's third wave settled in files
 * no single work package owned. Source guards: each rule reads the file the
 * way a reader of the page would meet it, and each one failed against the
 * text it replaced.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PRODUCT_EVALUATION_COMPARISON_LIMIT,
  PRODUCT_EVALUATION_DAYS,
  PRODUCT_EVALUATION_DEAL_LIMIT,
} from "@/lib/product-access";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("hand-written meta descriptions fit a search result (P2-92)", () => {
  // Three descriptions ran to 162-164 characters and were cut mid-clause in
  // results. The glossary's are built and held by glossary-meta-description.
  it.each([
    ["app/for-agents/page.tsx", "PAGE_DESCRIPTION"],
    ["app/for-investors/page.tsx", "PAGE_DESCRIPTION"],
    ["app/blog/exit-cap-rate-rental-property/page.tsx", "DESCRIPTION"],
  ])("%s keeps %s to 155 characters", (file, name) => {
    const match = read(file).match(new RegExp(`const ${name} =\\s*"([^"]+)";`));
    expect(match, `${file} no longer declares ${name} as one string`).not.toBeNull();
    const description = match![1];
    expect(description.length).toBeGreaterThan(70);
    expect(description.length).toBeLessThanOrEqual(155);
  });
});

describe("the verdict-engine post does not call the engine open (P2-18)", () => {
  // "The whole engine is open" named a file a reader cannot follow: the post
  // links no repository, and it must not start to (the audit's P1-53).
  it("names the file without an 'open' claim or a repository link", () => {
    const post = read("app/blog/how-truecap-verdict-engine-works/page.tsx");
    expect(post).toContain("<code>lib/verdict.ts</code>");
    expect(post).not.toMatch(/engine is open|open[- ]source/i);
    expect(post).not.toMatch(/github\.com|gitlab\.com/i);
  });
});

describe("the trial's numbers are read from lib/product-access (P2-14)", () => {
  it("the two server-action messages and the sign-up description type no trial number", () => {
    const evaluation = read("app/actions/product-evaluation.ts");
    expect(evaluation).toContain("`Your ${PRODUCT_EVALUATION_DAYS}-day free trial has ended.`");
    expect(evaluation).not.toMatch(/\b\d+-day free trial\b/);

    const anonymous = read("app/actions/anonymous-decision.ts");
    expect(anonymous).toContain(
      "Create a free account for ${PRODUCT_EVALUATION_DEAL_LIMIT} complete Pro deals and ${PRODUCT_EVALUATION_COMPARISON_LIMIT} comparison, no card.",
    );
    expect(anonymous).not.toMatch(/\b(?:two|three|four|five)\b complete Pro deals|\bone comparison\b/i);

    const signUp = read("app/auth/sign-up/page.tsx");
    expect(signUp).toContain("${PRODUCT_EVALUATION_DAYS}-day free Pro evaluation");
    expect(signUp).not.toMatch(/\b\d+-day free\b/);
  });

  it("the constants are the numbers those sentences printed before", () => {
    // The change is to where the number comes from, not to the number. If a
    // limit changes on purpose, this line changes with it.
    expect([PRODUCT_EVALUATION_DAYS, PRODUCT_EVALUATION_DEAL_LIMIT, PRODUCT_EVALUATION_COMPARISON_LIMIT]).toEqual([21, 3, 1]);
  });
});

describe("a post's reference to the blog names its type (P2-99)", () => {
  // Ten posts point isPartOf at /blog#blog, a node only /blog declares. The
  // reference now says what it points at.
  it("every isPartOf that points at /blog#blog is typed Blog", () => {
    const root = join(process.cwd(), "app/blog");
    const posts = readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `app/blog/${entry.name}/page.tsx`);
    let references = 0;
    for (const file of posts) {
      let source: string;
      try {
        source = read(file);
      } catch {
        continue; // a folder without a page (topics has its own index)
      }
      for (const line of source.split("\n")) {
        if (!/isPartOf:.*\/blog#blog/.test(line)) continue;
        references += 1;
        expect(line.trim(), file).toBe('isPartOf: { "@type": "Blog", "@id": `${siteUrl}/blog#blog` },');
      }
    }
    expect(references).toBeGreaterThanOrEqual(10);
  });
});
