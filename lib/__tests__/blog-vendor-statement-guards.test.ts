import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Two rules for the comparison posts, from the 2026-10 go-to-market audit.
 *
 * 1. BiggerPockets says two things about free access to its calculators. Its
 *    rental calculator form (biggerpockets.com/analysis/rentals/new) says
 *    "Upgrade to Pro or Start a 7-day free trial to unlock your results", and
 *    the sign-up prompt on its house hacking guide says an account unlocks
 *    "5 free calculator reports". Both were on its site on 2 October 2026 and
 *    no one here has tested what a free account gets. A page that states the
 *    first has to state the second, the way /vs/biggerpockets-for-house-hacking
 *    does, and may not settle the question in a flat sentence of its own.
 *    If BiggerPockets drops one of the two statements, render both pages
 *    again, change the pages and change this rule with them.
 *
 * 2. An opinion about a competitor is either what the vendor's own page
 *    advertises, linked, or it is not on the page. The sentences below were
 *    opinions with no source and were removed or restated; they stay out.
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8").replace(/\s+/g, " ");

const BIGGERPOCKETS_PAGES = [
  "app/blog/free-biggerpockets-calculator-alternatives/page.tsx",
  "app/blog/best-free-rental-property-calculator-2026/page.tsx",
  "app/blog/dealcheck-vs-biggerpockets-vs-truecap/page.tsx",
  "app/blog/best-rental-property-calculator-2026/page.tsx",
  "app/blog/best-rental-analysis-tool-for-house-hackers/page.tsx",
  "app/vs/biggerpockets-for-house-hacking/page.tsx",
];

describe("BiggerPockets' free allowance is stated the way BiggerPockets states it", () => {
  it("gives both of the vendor's statements wherever it gives the first", () => {
    for (const file of BIGGERPOCKETS_PAGES) {
      const page = read(file);
      expect(page, file).toMatch(/results unlock with Pro or a 7-day free trial/);
      expect(page, file).toMatch(/5 free calculator reports/);
    }
  });

  it("does not settle the allowance in a sentence of our own", () => {
    for (const file of BIGGERPOCKETS_PAGES) {
      const page = read(file);
      // The flat versions these pages carried before both statements were quoted.
      expect(page, file).not.toMatch(/results as a (?:BiggerPockets )?Pro (?:membership )?feature/i);
      expect(page, file).not.toMatch(/calculators are a Pro feature/i);
      expect(page, file).not.toMatch(/don(?:'|&apos;)t state a free-report allowance/i);
      expect(page, file).not.toMatch(/Pro members only/i);
      expect(page, file).not.toMatch(/Free tier is more limited than TrueCap/i);
    }
  });

  it("does not call BiggerPockets' reports Pro-only in the posts that cite its reports page", () => {
    // These two posts mention BiggerPockets' reports or prices without
    // quoting the calculator form, so they are not in BIGGERPOCKETS_PAGES.
    // "(Pro members only)" contradicted the "5 free calculator reports"
    // prompt, and the Pro prices are cited to membership-types, which shows
    // them; the checkout page the BRRRR alternatives post linked showed
    // neither $39 nor $390 when rendered on 2 October 2026.
    const brrrr = read("app/blog/best-rental-property-calculator-for-brrrr/page.tsx");
    expect(brrrr).not.toMatch(/Pro members only/i);
    const alternatives = read("app/blog/best-dealcheck-alternatives/page.tsx");
    expect(alternatives).not.toContain("subscriptions/new?plan_id=");
    expect(alternatives).toContain("https://www.biggerpockets.com/membership-types");
  });

  it("puts the partner perks on the annual plan, where the membership page lists them", () => {
    // membership-types lists calculators, BPCON tickets and the forum badge
    // under Pro Monthly ($39) and the partner perks under Pro Annual ($390).
    const page = read("app/blog/free-biggerpockets-calculator-alternatives/page.tsx");
    expect(page).not.toMatch(/Pro also bundles/i);
    expect(page).toContain("adds partner perks on the $390/year annual plan");
  });

  it("links the vendor page behind each statement in the posts", () => {
    for (const file of BIGGERPOCKETS_PAGES.filter((path) => path.startsWith("app/blog/"))) {
      const page = read(file);
      expect(page, file).toContain("https://www.biggerpockets.com/analysis/rentals/new");
      expect(page, file).toContain(
        "https://www.biggerpockets.com/real-estate-investing/house-hacking-strategy",
      );
    }
  });
});

describe("unsourced opinions about competitors stay out of the comparison posts", () => {
  it("does not grade BiggerPockets' calculator on value", () => {
    for (const file of BIGGERPOCKETS_PAGES) {
      const page = read(file);
      expect(page, file).not.toMatch(/Calculator alone (?:isn(?:'|&apos;)t|doesn(?:'|&apos;)t)/i);
      expect(page, file).not.toMatch(/For the calculators alone, usually not/i);
      expect(page, file).not.toMatch(/can pay for itself/i);
    }
  });

  it("does not rank Hostfully, Hostaway and Guesty on qualities their pages do not state", () => {
    const post = read("app/blog/hostfully-vs-hostaway-vs-guesty/page.tsx");
    for (const retired of [
      /favors small-to-mid operators/i,
      /tighter channel management/i,
      /Easier onboarding for first-time/i,
      /cleaner UX/i,
      /not as deep as Hostaway/i,
      /level of polish/i,
      /more practical step/i,
      /significant complexity/i,
      /easiest setup/i,
      /all great tools/i,
      // A claim about who uses a plan, with no data behind it.
      /often professional STR managers/i,
      // A heading that turned each vendor's own list into a claim that it
      // beats the other two, which their pages contradict.
      /What each does better/i,
      // A denial with no page to prove it, and unsourced grades.
      /None of the three platforms underwrites/i,
      /take ownership for granted/i,
      /low-cost starts/i,
      /smaller-operator friendly/i,
      /cover most workflows/i,
      /are built for that/i,
    ]) {
      expect(post).not.toMatch(retired);
    }
    // What replaced them is each vendor's own count or plan page.
    expect(post).toContain("Hostfully advertises 150+ integrations");
    expect(post).toContain("https://www.hostfully.com/pricing/property-management-software/");
    expect(post).toContain("https://www.guesty.com/features/homeowners-portal/");
  });
});
