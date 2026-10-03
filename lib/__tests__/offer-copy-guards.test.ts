import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const tracked = (globs: string[]) =>
  execFileSync("git", ["ls-files", ...globs], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  })
    .split("\n")
    .filter(Boolean);

describe("public Pro calls to action", () => {
  it("does not promise a first-time-only trial where eligibility is unknown", () => {
    const files = [
      ...tracked(["app/vs/*/page.tsx"]),
      "app/for-flippers/page.tsx",
      "app/for-brrrr/page.tsx",
      "app/for-buy-and-hold/page.tsx",
      "app/for-house-hackers/page.tsx",
      "components/marketing/landing-sections.tsx",
      "components/marketing/faq-section.tsx",
    ];

    expect(files.length).toBeGreaterThan(40);
    for (const file of files) {
      const source = read(file);
      expect(source, file).not.toContain("TRIAL_LABEL");
      expect(source, file).not.toMatch(/Start (?:a|your) .*free trial/i);
    }
  });

  it("keeps eligibility-unknown in-product gates trial-neutral", () => {
    const files = [
      "components/investcalc/header.tsx",
      "components/investcalc/pro-inline-gate.tsx",
      "components/investcalc/strategy-outcome-card.tsx",
      "components/investcalc/pdf-purchase-dialog.tsx",
    ];

    for (const file of files) {
      expect(read(file), file).not.toContain("TRIAL_LABEL");
    }
  });
});

describe("free and paid offer boundary", () => {
  it("does not restore the corrected persona-page contradictions", () => {
    const personaCopy = [
      "app/for-flippers/page.tsx",
      "app/for-brrrr/page.tsx",
      "app/for-buy-and-hold/page.tsx",
      "app/for-house-hackers/page.tsx",
    ]
      .map(read)
      .join("\n");

    expect(personaCopy).not.toMatch(/Run a free flip analysis/i);
    expect(personaCopy).not.toMatch(/Run a free BRRRR analysis/i);
    expect(personaCopy).not.toMatch(/Free covers the offer/i);
    expect(personaCopy).not.toMatch(/Free analyzer is enough to pick the property/i);
  });

  it("keeps signup and onboarding promises within Free entitlements", () => {
    const signup = read("components/marketing/signup-prompt-card.tsx");
    const onboarding = read("components/marketing/onboarding-tour.tsx");

    expect(signup).not.toMatch(/we&apos;ll remember this deal/i);
    expect(signup).not.toContain('sub="Compare across analyses"');
    expect(signup).not.toContain('label="PDF export"');
    expect(onboarding).not.toMatch(/full underwrite appears/i);
    expect(onboarding).not.toMatch(/come back, edit it, compare.*export a PDF/i);
  });
});

describe("offer trust language", () => {
  it("keeps Agent Pro roster copy aligned with the enforced 100-client cap", () => {
    const agentPage = read("app/for-agents/page.tsx");
    const actions = read("app/actions/agent-clients.ts");

    expect(agentPage).toContain("up to 100 clients");
    expect(agentPage).not.toMatch(/no software-enforced roster cap/i);
    expect(actions).toContain("const MAX_CLIENTS = 100");
  });

  it("states the 12-Buy-Box account cap wherever Agent Pro ties a Buy Box to each client", () => {
    // An account holds 12 Buy Boxes, client-scoped ones included, while the
    // roster holds 100 clients. The homepage card ("A Buy Box per client /
    // Up to 100 clients"), /pricing's value stack ("Up to 100 clients, each
    // with a Buy Box") and the catalog label ("buy boxes per buyer") promised
    // more than the product holds.
    expect(read("app/actions/user-buy-boxes.ts")).toContain("const MAX_BUY_BOXES = 12");

    const home = read("components/marketing/landing-sections.tsx");
    // The homepage Agent Pro PlanCard: its data attribute to its action.
    const agentCardAt = home.indexOf("data-homepage-agent-pro");
    const agentActionAt = home.indexOf("See TrueCap for agents", agentCardAt);
    expect(agentCardAt).toBeGreaterThan(-1);
    expect(agentActionAt).toBeGreaterThan(agentCardAt);
    const agentCard = home.slice(agentCardAt, agentActionAt);
    expect(agentCard).toContain("up to 12 Buy Boxes per account");
    expect(agentCard).not.toContain("A Buy Box per client");
    // Every row sells something only Agent Pro has: co-branding is in Pro too.
    expect(agentCard).not.toContain('term: "A co-branded memo"');
    expect(agentCard).toContain('term: "Client-report share links"');

    const stack = read("components/marketing/pricing-value-stack.tsx");
    expect(stack).toContain("(up to 12 per account)");
    expect(stack).not.toMatch(/each with a Buy Box/i);

    const catalog = read("lib/entitlements-catalog.ts");
    expect(catalog).toContain("Buy Boxes assigned to clients (up to 12 per account)");
    expect(catalog).not.toMatch(/buy boxes per buyer/i);

    const agentPage = read("app/for-agents/page.tsx");
    expect(agentPage).toContain("An account keeps up to 12 Buy Boxes in total");

    // /vs/dealcheck's "Investor clients (agents)" row said "a client roster
    // with a Buy Box per client" and stated neither limit anywhere on the page.
    const vsDealcheck = read("app/vs/dealcheck/page.tsx");
    expect(vsDealcheck).toContain("(up to 100 clients)");
    expect(vsDealcheck).toContain("(up to 12 per account)");
    expect(vsDealcheck).not.toMatch(/a Buy Box per client/i);
  });

  it("discloses every live data processor and optional third-party client data", () => {
    const privacy = read("app/privacy/page.tsx");
    for (const disclosure of [
      "Agent workspace data",
      "PostHog",
      "Sentry",
      "Resend",
      "RentCast",
      "Google Places",
      "full property address",
      "account ID and email",
    ]) {
      expect(privacy).toContain(disclosure);
    }
    expect(privacy).not.toContain("Collected via Vercel Analytics and Google Analytics.");
    expect(privacy).not.toContain("we send only the property address / county");

    // Audit row P2-120: the policy names what the code loads and nothing it
    // does not. Cloudflare Turnstile runs on the three auth forms, Google Tag
    // Manager and the Ads tag load after Accept, and the cookies are named.
    const flat = privacy.replace(/\s+/g, " ");
    for (const disclosure of [
      "<strong>Cloudflare</strong> — Turnstile",
      "Google Tag Manager",
      "<code>_gcl_au</code>",
      "<code>{FIRST_TOUCH_COOKIE}</code>",
      "<code>{ANONYMOUS_DECISION_GRANT_COOKIE}</code>",
      "<code>{CHECKOUT_RETURN_COOKIE}</code>",
      "<code>truecap_compare_ids</code>",
      "<strong>Deal documents</strong>",
    ]) {
      expect(flat).toContain(disclosure);
    }
    for (const form of ["login-form", "sign-up-form", "forgot-password-form"]) {
      expect(read(`components/auth/${form}.tsx`), form).toContain("CaptchaWidget");
    }
    const google = read("components/analytics/google-measurement.tsx");
    expect(google).toContain("https://www.googletagmanager.com/gtm.js");
    expect(read("app/actions/compare.ts")).toContain(
      'const COMPARE_COOKIE = "truecap_compare_ids";',
    );
    expect(read("components/investcalc/deal-documents-card.tsx")).toContain(
      'const BUCKET = "deal-documents";',
    );
    // Not in use, so not listed as if they were: Google Analytics (the GTM
    // container carries no Analytics tag and no gtag config names a G- id),
    // the newsletter (cancelled), and PostHog, which stays named but is
    // marked as not connected.
    expect(flat).not.toMatch(/Places address suggestions, Analytics/);
    expect(flat).not.toMatch(/newsletter/i);
    expect(flat).not.toMatch(/through Google and PostHog/);
    expect(flat).toContain("<strong>PostHog</strong> — product analytics. Not in use today");
    expect(google).not.toMatch(/gtag\('config', 'G-/);
  });

  it("describes only new signed-in deal links as revocable", () => {
    const share = read("components/investcalc/share-link-button.tsx");
    const privacy = read("app/privacy/page.tsx");
    expect(share).toContain("Anyone who receives");
    expect(share).toContain("opaque, expiring link");
    expect(share).toContain("The exact address stays hidden by default");
    expect(privacy).toMatch(/Anyone with\s+the link can view it without an\s+account/);
    expect(privacy).toMatch(/must be signed in to create a new deal share link/);
    expect(privacy).toMatch(/associated with your account/);
    expect(privacy).toMatch(/Historical opaque links created without account ownership remain\s+viewable until they expire but cannot be managed or revoked/);
    expect(privacy).toMatch(/expires after 180 days by default/);
  });

  it("keeps auth and homepage promises benchmark-based and non-absolute", () => {
    const auth = read("components/auth/auth-shell.tsx");
    const logo = read("components/brand/app-logo.tsx");
    const hero = read("components/marketing/marketing-hero.tsx");
    // FaqSection moved to its own module; its rows still render on "/".
    const landing = `${read("components/marketing/landing-sections.tsx")}\n${read("components/marketing/faq-section.tsx")}`;
    const config = read("lib/marketing-offer-config.ts");

    expect(auth).not.toMatch(/real-time data and investment trends/i);
    expect(auth).not.toMatch(/Stronger returns/i);
    expect(auth).not.toMatch(/always protected/i);
    // Assert the CONTRACT (named, labeled benchmarks + manual property tax),
    // not one exact phrasing — the copy legitimately became more precise.
    expect(auth).toMatch(/HUD rent[^.]*benchmarks/i);
    expect(auth).toMatch(/labeled and editable/i);
    expect(auth).toMatch(/[Pp]roperty tax stays a manual/);
    expect(`${auth}\n${logo}`).not.toMatch(/Professional real estate investment (?:calculator|analysis platform)/i);
    expect(logo).toContain("Rental property underwriting");
    expect(landing).not.toMatch(/know exactly what to offer/i);
    expect(config).not.toMatch(/Know exactly what a rental is worth/i);
    expect(hero).not.toMatch(/highest price you can pay/i);
  });

  it("routes the secondary hero CTA to a genuine sample decision", () => {
    // The hero's secondary action runs the real sample in the analyzer; the
    // written memo stays one click away in the footer.
    expect(read("components/marketing/hero-address-form.tsx")).toContain(
      'href="/analyze?sample=1"'
    );
    expect(read("components/marketing/site-footer.tsx")).toContain(
      'href: "/sample-decision-memo"'
    );
    expect(read("app/sample-decision-memo/page.tsx")).toContain(
      "calculateSampleDealOutcome"
    );
  });

  it("does not put stale prices or outcome guarantees in automated lifecycle copy", () => {
    const files = tracked([
      "emails/daily-campaign-content/*.json",
      "emails/lifecycle-content/*.json",
    ]);
    const source = files.map(read).join("\n");

    expect(source).not.toMatch(/\$29\.99|\$300\/yr|\$25\/mo/i);
    expect(source).not.toMatch(/pays for itself|hourly math that always works/i);
    expect(source).not.toMatch(/price everyone pays|auto-pulls ARV comps/i);
    expect(source).not.toMatch(/math matches what a lender(?:'|&apos;)s underwriter/i);
    expect(source).not.toMatch(/pass\/failed against YOUR buy box/i);
  });
});
