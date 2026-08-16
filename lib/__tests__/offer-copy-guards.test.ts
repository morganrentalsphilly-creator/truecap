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
  });

  it("warns that read-only deal links are bearer snapshots without expiry", () => {
    const share = read("components/investcalc/share-link-button.tsx");
    const privacy = read("app/privacy/page.tsx");
    expect(share).toContain("Anyone with the link can view the snapshot");
    expect(share).toContain("Links do not currently expire or revoke");
    expect(privacy).toMatch(/Anyone with\s+the link can view it without an account/);
    expect(privacy).toMatch(/does not\s+expire or revoke/);
  });

  it("keeps auth and homepage promises benchmark-based and non-absolute", () => {
    const auth = read("components/auth/auth-shell.tsx");
    const logo = read("components/brand/app-logo.tsx");
    const hero = read("components/marketing/marketing-hero.tsx");
    const landing = read("components/marketing/landing-sections.tsx");
    const config = read("lib/marketing-offer-config.ts");

    expect(auth).not.toMatch(/real-time data and investment trends/i);
    expect(auth).not.toMatch(/Stronger returns/i);
    expect(auth).not.toMatch(/always protected/i);
    expect(auth).toContain("HUD rent benchmarks");
    expect(`${auth}\n${logo}`).not.toMatch(/Professional real estate investment (?:calculator|analysis platform)/i);
    expect(logo).toContain("Rental acquisition decision system");
    expect(landing).not.toMatch(/know exactly what to offer/i);
    expect(config).not.toMatch(/Know exactly what a rental is worth/i);
    expect(hero).not.toMatch(/highest price you can pay/i);
  });

  it("retains the homepage process anchor targeted by the hero CTA", () => {
    expect(read("components/marketing/hero-address-form.tsx")).toContain(
      'href="#how-it-works"'
    );
    expect(read("components/marketing/landing-sections.tsx")).toContain(
      'id="how-it-works"'
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
