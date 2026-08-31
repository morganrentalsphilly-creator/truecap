import { describe, expect, it } from "vitest";

import robots from "@/app/robots";
import { getSiteUrl } from "@/lib/site-url";

const REQUIRED_PRIVATE_PREFIXES = [
  "/api/",
  "/admin/",
  "/auth/",
  "/dashboard/",
  "/profile/",
  "/settings/",
  "/d/",
  "/s/",
  "/portal/",
  "/embed/brand/",
  "/home-authed",
] as const;

describe("robots discovery policy", () => {
  it("protects every private route family for default and named crawlers", () => {
    const rules = robots().rules;
    const normalized = Array.isArray(rules) ? rules : [rules];
    expect(normalized.length).toBeGreaterThanOrEqual(2);

    for (const rule of normalized) {
      const disallow = Array.isArray(rule.disallow)
        ? rule.disallow
        : rule.disallow
          ? [rule.disallow]
          : [];
      for (const prefix of REQUIRED_PRIVATE_PREFIXES) {
        expect(
          disallow,
          `${String(rule.userAgent)} can crawl ${prefix}`,
        ).toContain(prefix);
      }
      expect(disallow).not.toContain("/");
    }
  });

  it("keeps public and AI discovery open", () => {
    const rules = robots().rules;
    const normalized = Array.isArray(rules) ? rules : [rules];
    const aiRule = normalized.find((rule) => Array.isArray(rule.userAgent));
    expect(aiRule).toBeDefined();
    expect(aiRule?.allow).toEqual(
      expect.arrayContaining(["/", "/llms.txt", "/llms-full.txt"]),
    );
    expect(robots().sitemap).toEqual([`${getSiteUrl()}/sitemap.xml`]);
  });
});
