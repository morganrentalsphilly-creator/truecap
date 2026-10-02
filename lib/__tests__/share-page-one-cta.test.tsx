import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/**
 * The share page a client opens (/s/[token], legacy /d/[encoded]) and the
 * agent's lead form on it. 2026-10 go-to-market audit, rows P1-45, P2-62,
 * P2-136, P2-137 and P1-67.
 *
 * What these guards hold:
 *   - the page asks for TrueCap once, under the site's primary label
 *     "Analyze a deal free", below the Disclaimer; no second upsell, no
 *     statement that the Offer Ceiling is paid for the person reading
 *   - no eyebrow above the page heading and no arrow suffix
 *   - the tab title carries the brand once
 *   - the lead form's confirmation reports the save, says TrueCap emails the
 *     agent only when the server reports that lead notifications are live
 *     (as the rule, never that this message was sent), never promises a
 *     reply, and shows the agent's own contact details
 *   - the agent's leads card sits above the deal sections on the dashboard
 *     and counts every lead, not the rows it fetched
 *
 * No browser test opens a share page (the isolated build has no database),
 * so the rendered checks here are the closest thing to one.
 */

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/app/actions/capture-deal-lead", () => ({
  captureDealLeadAction: vi.fn(),
}));

import { ReadOnlyAnalysisView } from "@/components/investcalc/read-only-analysis-view";
import {
  AgentContactLine,
  LeadCaptureConfirmation,
  LeadCaptureForm,
  agentContactLinks,
} from "@/components/investcalc/lead-capture-form";
import { calculateAnalysis } from "@/lib/calc-analysis";
import { buildPublicShareAnalysisPayload } from "@/lib/public-share-analysis-result";
import { SAMPLE_DEAL_VALUES } from "@/lib/sample-deal";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/** Source without comments, whitespace collapsed, so a sentence that wraps
 *  across JSX lines reads as one string and a comment that describes the old
 *  copy is not mistaken for it. */
const code = (path: string) =>
  read(path)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1")
    .replace(/\s+/g, " ");

const SHELL = "components/investcalc/shared-deal-shell.tsx";
const VIEW = "components/investcalc/read-only-analysis-view.tsx";
const FORM = "components/investcalc/lead-capture-form.tsx";

const CTA = "Analyze a deal free";
const RETIRED_CTA_LABELS = [
  "Try TrueCap free",
  "Analyze this property in TrueCap",
  "Start free at usetruecap.com",
  "Run your own free analysis",
  "Analyzed with TrueCap",
];

const result = calculateAnalysis(SAMPLE_DEAL_VALUES);

function renderView({
  paid,
  recorded,
}: {
  paid: boolean;
  recorded: boolean;
}) {
  return renderToStaticMarkup(
    <ReadOnlyAnalysisView
      values={SAMPLE_DEAL_VALUES}
      analysis={buildPublicShareAnalysisPayload(result, paid)}
      comps={null}
      addressIncluded={false}
      recordedResult={recorded}
      leadForm={<div data-test-lead-form="">agent form</div>}
    />,
  );
}

const count = (haystack: string, needle: string) =>
  haystack.split(needle).length - 1;

describe("the share page asks for TrueCap once", () => {
  const shell = code(SHELL);
  const view = code(VIEW);

  it("uses the primary label once and none of the retired ones", () => {
    expect(count(view, CTA)).toBe(1);
    expect(shell).not.toContain(CTA);
    for (const label of RETIRED_CTA_LABELS) {
      expect(view, label).not.toContain(label);
      expect(shell, label).not.toContain(label);
    }
  });

  it("has one link to the analyzer, and it is not prefetched", () => {
    const links = [...view.matchAll(/<Link\b([^>]*)>/g)].map((m) => m[1]);
    const analyzer = links.filter((attrs) => /href="\/analyze/.test(attrs));
    expect(analyzer).toHaveLength(1);
    expect(analyzer[0]).toContain("prefetch={false}");
    expect(analyzer[0]).toContain("utm_medium=share_link");
    // The link that promised "this property" and opened an empty analyzer is
    // gone; only the rerun button, which carries the deal, names the property.
    expect(view).not.toContain("utm_medium=pro_gate");
    expect(view).toContain("onClick={runWithAssumptions}");
    expect(shell).not.toMatch(/href="\/analyze/);
  });

  it("does not tell a visitor the Offer Ceiling is a paid tool", () => {
    for (const source of [shell, view]) {
      expect(source).not.toMatch(/\bpaid tools?\b/i);
      expect(source).not.toMatch(/\bScreening\s+Index\b/i);
    }
    // The one statement, and the code path that makes it true for a visitor.
    expect(view).toContain(
      "Your first complete decision needs no account or card.",
    );
    expect(read("app/actions/offer-ceiling.ts")).toContain(
      "activeAnonymousDecisionGrantMatches",
    );
  });

  it("carries no arrow suffix and no eyebrow above the page heading", () => {
    for (const path of [SHELL, VIEW, FORM]) {
      const source = code(path);
      expect(source, path).not.toContain("→");
      expect(source, path).not.toMatch(/\bArrow(?:UpRight|Right)\b/);
    }
    expect(shell).not.toMatch(/uppercase/);
    expect(shell).not.toMatch(/>\s*Shared analysis\s*</);
    // The decision heading opens its section; nothing sits above it.
    expect(view).not.toMatch(/>\s*Decision\s*<\/p>\s*<h2/);
    expect(view).not.toMatch(/>\s*Frozen strategy analysis\s*<\/p>/);
  });

  it("keeps the rerun button, the copy action and the agent's band colour", () => {
    expect(view).toContain("Run this property with your assumptions");
    expect(view).toContain("Run these assumptions with a property you choose");
    expect(view).toContain("Copy this analysis to your account");
    expect(shell).toContain(
      'style={{ background: agent.primaryColor ?? "var(--primary)" }}',
    );
  });

  it.each([
    { paid: false, recorded: false, name: "an unpaid owner's share" },
    { paid: true, recorded: false, name: "a paid owner's share" },
    { paid: false, recorded: true, name: "a recorded share" },
  ])("renders one call to action on $name", ({ paid, recorded }) => {
    const html = renderView({ paid, recorded });
    expect(count(html, CTA)).toBe(1);
    expect(count(html, 'href="/analyze')).toBe(1);
    expect(html).not.toContain("→");
    for (const label of RETIRED_CTA_LABELS) {
      expect(html, label).not.toContain(label);
    }
    expect(html).not.toMatch(/paid tools?/i);
  });

  it("puts the agent's form above the Disclaimer and TrueCap's block below it", () => {
    const html = renderView({ paid: false, recorded: false });
    const form = html.indexOf("data-test-lead-form");
    const disclaimer = html.indexOf("data-disclaimer");
    const cta = html.indexOf(CTA);
    expect(form).toBeGreaterThan(-1);
    expect(disclaimer).toBeGreaterThan(form);
    expect(cta).toBeGreaterThan(disclaimer);
    expect(count(html, "data-disclaimer")).toBe(1);
    // The shell hands the form to the view rather than mounting it after the
    // view, which is where it used to land below the promo.
    expect(shell).toMatch(/leadForm=\{ agent && leadCapture \? \( <LeadCaptureForm/);
  });
});

describe("share page titles carry the brand once", () => {
  it.each(["app/s/[token]/page.tsx", "app/d/[encoded]/page.tsx"])(
    "%s",
    (path) => {
      const source = read(path);
      const title = source.match(/const title = "([^"]+)";/)?.[1] ?? "";
      expect(title).not.toBe("");
      // app/layout.tsx appends " | TrueCap" to a page title.
      expect(read("app/layout.tsx")).toContain('template: "%s | TrueCap"');
      expect(title).not.toMatch(/TrueCap/);
      expect(source).toContain("const socialTitle = `${title} | TrueCap`;");
      expect(count(source, "title: socialTitle,")).toBe(2);
    },
  );
});

describe("the lead form says what happens to the message", () => {
  const contact = {
    name: "Dana Reyes",
    email: "dana@example.com",
    phone: "(555) 010-0199",
    website: "https://www.example.com/team",
  };

  it("does not say the agent was emailed, or will reply, while notifications are off", () => {
    const html = renderToStaticMarkup(
      <LeadCaptureConfirmation
        agentName="Reyes Realty"
        agentEmailed={false}
        contact={contact}
      />,
    );
    expect(html).toContain("Your message is saved for Reyes Realty.");
    expect(html).toContain("TrueCap has not emailed them.");
    expect(html).not.toMatch(/was sent|emails them/);
    expect(html).not.toMatch(/expect a reply|will be in touch|will follow up/i);
    expect(html).toContain("To reach them sooner, contact Dana Reyes directly:");
    expect(html).toContain('href="tel:5550100199"');
    expect(html).toContain('href="mailto:dana@example.com"');
    expect(html).toContain('href="https://www.example.com/team"');
  });

  it("says TrueCap emails the agent only when the server reports the mode is live, as the rule and never as the result of this send", () => {
    const html = renderToStaticMarkup(
      <LeadCaptureConfirmation
        agentName="Reyes Realty"
        agentEmailed
        contact={null}
      />,
    );
    // The action returns ok once the row is saved, whether or not the owner
    // email went out, so the headline reports the save in both modes.
    expect(html).toContain("Your message is saved for Reyes Realty.");
    expect(html).toContain(
      "TrueCap emails them a notice when a new message arrives",
    );
    expect(html).not.toMatch(/was sent/);
    expect(code(FORM)).not.toMatch(/was sent/);
    expect(html).not.toContain("has not emailed");
    expect(html).not.toMatch(/expect a reply|will be in touch|will follow up/i);
    expect(html).not.toContain("data-agent-contact");
  });

  it("defaults to the not-emailed copy and promises no follow-up before sending", () => {
    const form = code(FORM);
    expect(form).toContain("agentEmailed = false,");
    expect(form).not.toMatch(/expect a reply|will be in touch|will follow up/i);
    const html = renderToStaticMarkup(
      <LeadCaptureForm
        ownerId="11111111-1111-4111-8111-111111111111"
        shareSurface="opaque_share"
        valuesHash="abc"
        agentName="Reyes Realty"
        contact={contact}
      />,
    );
    expect(html).toContain("It is saved to their TrueCap dashboard");
    expect(html).toContain("Or reach Dana Reyes directly:");
    expect(html).not.toMatch(/will follow up/i);
  });

  it("reads the mode with the same test the action uses to send", () => {
    const test =
      '(process.env.LEAD_NOTIFICATIONS_MODE ?? "off").trim().toLowerCase() === "live"';
    expect(code(SHELL)).toContain(test);
    expect(code("app/actions/capture-deal-lead.ts")).toContain(test);
    expect(code(SHELL)).toContain("agentEmailed={leadNotificationsLive()}");
    // The form is a client component: it must be told, not read the server's
    // environment itself.
    expect(code(FORM)).not.toContain("process.env");
  });

  it("links only a usable phone, email and http(s) website", () => {
    expect(agentContactLinks(null)).toEqual([]);
    expect(
      agentContactLinks({
        phone: "12",
        email: "not an email",
        website: "javascript:alert(1)",
      }),
    ).toEqual([]);
    expect(
      agentContactLinks({ website: "data:text/html,<script>1</script>" }),
    ).toEqual([]);
    expect(agentContactLinks({ website: "example.com" })).toEqual([]);
    expect(agentContactLinks(contact).map((link) => link.href)).toEqual([
      "tel:5550100199",
      "mailto:dana@example.com",
      "https://www.example.com/team",
    ]);
    expect(agentContactLinks({ phone: "+1 555 010 0199" })[0]?.href).toBe(
      "tel:+15550100199",
    );
    expect(
      renderToStaticMarkup(
        <AgentContactLine agentName="Reyes Realty" contact={{}} lead="Or reach" />,
      ),
    ).toBe("");
  });

  it("passes the agent's contact details from the share shell", () => {
    const shell = code(SHELL);
    for (const field of [
      "name: agent.contactName",
      "email: agent.contactEmail",
      "phone: agent.contactPhone",
      "website: agent.contactWebsite",
    ]) {
      expect(shell, field).toContain(field);
    }
  });

  it("tells the agent, where they enter them, that those details show on share pages", () => {
    // The settings form is the only place an agent learns where a saved phone,
    // email or website appears. It named the PDF alone until the share pages
    // began printing them next to the message form.
    const form = code("components/settings/branding-form.tsx");
    expect(form).toContain(
      "your phone, email and website appear with the message form on your shared deal pages",
    );
  });
});

describe("the agent's leads card on the dashboard", () => {
  it("is mounted above the deal sections, once", () => {
    const home = code("components/dashboard/DashboardHome.tsx");
    const slot = home.indexOf("{leadsSlot}");
    expect(slot).toBeGreaterThan(-1);
    expect(home.indexOf("{leadsSlot}", slot + 1)).toBe(-1);
    expect(home.indexOf('aria-label="Decision center"')).toBeGreaterThan(slot);
    expect(home.indexOf("<main")).toBeLessThan(slot);
  });

  it("counts every lead rather than the rows it fetched", () => {
    const card = code("components/dashboard/DealLeadsCard.tsx");
    expect(card).toContain('count: "exact"');
    expect(card).toMatch(/>\s*\{total\}\s*</);
    expect(card).not.toMatch(/>\s*\{leads\.length\}\s*</);
    expect(card).toContain("Showing the latest {leads.length} of {total}.");
    // Leads past the first screenful stay reachable without client code.
    expect(card).toContain("<details");
  });

  it("names the count's unit in text a screen reader gets, and calls a row a lead", () => {
    const card = code("components/dashboard/DealLeadsCard.tsx");
    // A span has no role, so an aria-label on it is not announced: the unit
    // is visually hidden text beside the number.
    expect(card).not.toMatch(/aria-label=/);
    expect(card).toMatch(
      /\{total\} <span className="sr-only"> \{" "\} \{total === 1 \? "lead" : "leads"\} <\/span>/,
    );
    // The message field is optional, so a row is a lead, not a message.
    expect(card).not.toMatch(/"messages?"/);
    expect(card).toContain('{earlier.length === 1 ? "lead" : "leads"}');
  });
});
