import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import { SiteFooter } from "@/components/marketing/site-footer";

/**
 * The footer links Sign in, Create account and Forgot password from every
 * page, and robots.txt disallows /auth/. A crawler that may not fetch a page
 * never reads its noindex, so a sitewide followed link could get the bare
 * URL indexed without a snippet (go-to-market audit, P2-94). The links stay
 * and carry rel="nofollow"; nothing else in the footer does.
 */
describe("footer links to robots-blocked pages", () => {
  const html = renderToStaticMarkup(<SiteFooter />);
  const anchors = [...html.matchAll(/<a\b([^>]*)>/g)]
    .map((m) => ({ href: m[1].match(/\bhref="([^"]*)"/)?.[1] ?? "", rel: m[1].match(/\brel="([^"]*)"/)?.[1] ?? null }))
    .filter((a) => a.href.startsWith("/"));

  const rules = robots().rules;
  const wildcard = (Array.isArray(rules) ? rules : [rules]).find((rule) => rule.userAgent === "*");
  const disallowed = ([] as string[]).concat(wildcard?.disallow ?? []);
  const blocked = (href: string) => disallowed.some((prefix) => href.startsWith(prefix));

  it("keeps the three account links in the footer", () => {
    expect(anchors.map((a) => a.href)).toEqual(
      expect.arrayContaining(["/auth/login", "/auth/sign-up", "/auth/forgot-password"]),
    );
  });

  it("marks every link to a disallowed path nofollow, and no other link", () => {
    expect(disallowed).toContain("/auth/");
    const blockedLinks = anchors.filter((a) => blocked(a.href));
    expect(blockedLinks.map((a) => a.href).sort()).toEqual(["/auth/forgot-password", "/auth/login", "/auth/sign-up"]);
    for (const link of blockedLinks) expect(link.rel, link.href).toBe("nofollow");
    for (const link of anchors.filter((a) => !blocked(a.href))) expect(link.rel, link.href).toBeNull();
  });

  it("drops them with the rest of the account column for a signed-in page", () => {
    const signedIn = renderToStaticMarkup(<SiteFooter hideAccountLinks />);
    expect(signedIn).not.toContain('href="/auth/');
    expect(signedIn).not.toContain('rel="nofollow"');
  });
});
