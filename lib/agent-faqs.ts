/**
 * The agent FAQ set — the objections a real estate agent raises before paying
 * for an analysis tool, answered from what the code actually does. Rendered
 * on /for-agents (as "Honest answers for agents") and on the homepage FAQ.
 *
 * Every answer is checked against a runtime fact; the source is noted so a
 * product change can find the sentence it invalidates:
 *   - share links need no account and are read-only, expiring, revocable, and
 *     hide the exact address unless included (app/s/[token], share-link-button)
 *   - co-branding renders logo, brand color and "Shared by" on the share page,
 *     and a "Prepared by" block on the PDF; TrueCap's name stays
 *     (lib/agent-share.ts, shared-deal-shell.tsx, lib/pdf-generator.ts);
 *     `custom_branding` is a Pro AND Agent Pro feature (entitlements-catalog)
 *   - rosters cap at 100 clients (app/actions/agent-clients.ts MAX_CLIENTS);
 *     an account keeps at most 12 Buy Boxes, client-scoped ones included
 *     (app/actions/user-buy-boxes.ts MAX_BUY_BOXES)
 *   - a saved deal is assigned to ONE client and screened against that
 *     client's Buy Box (lib/buy-box.ts); multi-client matching is not released
 *     (lib/feature-flags.ts agent_client_matching)
 *   - the no-card trial grants Pro deal analyses and a comparison, never the
 *     client roster (lib/entitlements.ts evaluationFeatures, lib/product-access)
 *   - no native app: a responsive web app with a manifest (app/manifest.ts)
 *
 * Vocabulary: the number is the Offer Ceiling (customer-facing-decision-
 * vocabulary guard); no "walk-away price" here.
 */

import {
  PRODUCT_EVALUATION_COMPARISON_LIMIT,
  PRODUCT_EVALUATION_DAYS,
  PRODUCT_EVALUATION_DEAL_LIMIT,
} from "@/lib/product-access";

export type MarketingFaq = { q: string; a: string };

export const AGENT_FAQS: readonly MarketingFaq[] = [
  {
    q: "My investor clients run their own numbers. Why would I need this?",
    a: "They will, and they should. Agent Pro is for screening and presenting against their criteria, so what you send already fits. The client gets the whole model with every assumption labeled, and can rerun it with their own numbers in the free analyzer.",
  },
  {
    q: "Am I giving investment advice?",
    a: "No. TrueCap applies published formulas to labeled inputs. You supply the property facts; the client sees the sources, can change every assumption, and makes the decision. Every share page and report carries the not-investment-advice disclaimer.",
  },
  {
    q: "Do my clients need a TrueCap account to view what I send?",
    a: "No. A share link opens without signing in. It is read-only, it expires, you can revoke it, and it hides the exact address unless you choose to include it. A client only needs an account to save a private copy.",
  },
  {
    q: "What does the client see? Is it my branding or TrueCap's?",
    a: "Co-branded, not white-label. With branding set up (included in Pro and Agent Pro), the share page carries your logo, your brand color, and “Shared by” your name or company, plus a form the client can use to message you. The PDF adds your tagline and a “Prepared by” block with your name, email, phone, and website. TrueCap's name stays on the page and in the report as the methodology behind the numbers.",
  },
  {
    q: "Can I keep different criteria for different investor clients?",
    a: "Yes. Your roster holds up to 100 clients, and a Buy Box can be assigned to one client so that client's deals are screened against their targets, not yours. An account keeps up to 12 Buy Boxes in total, your own and your clients' combined.",
  },
  {
    q: "Can I run one listing against several clients at once?",
    a: "Not yet. A saved deal is assigned to one client and screened against that client's Buy Box; to check the same listing for another client, reassign it or save it again. Each client's roster card shows how many of their assigned deals meet their criteria.",
  },
  {
    q: "Where do the starting numbers come from?",
    a: "Rent starts from HUD Fair Market Rent and the rate from a FRED 30-year benchmark, both labeled. Property tax is your local input: until you enter the bill or a reviewed rate, the model labels its 1.1% assumption as a default to replace. Replace every starting value with the client's financing and property facts before you send.",
  },
  {
    q: "I only get a few investor clients a year. Is it worth it?",
    a: `Start free. The first decision needs no account, and a free account gets a ${PRODUCT_EVALUATION_DAYS}-day trial with ${PRODUCT_EVALUATION_DEAL_LIMIT} Pro deals and ${PRODUCT_EVALUATION_COMPARISON_LIMIT} comparison, no card. Subscribe to Agent Pro when a client is worth a roster entry, monthly or annually, and cancel from your profile when the season ends.`,
  },
  {
    q: "My brokerage already gives me tools.",
    a: "Brokerage stacks are CRM, transaction management, and e-signature. None of them screen a listing against a client's Buy Box or compute the client's Offer Ceiling, the highest price that still meets that client's targets.",
  },
  {
    q: "Will clients trust software numbers?",
    a: "The output shows which criterion the decision hinges on (the biggest gap or the tightest margin against the client's targets) and what has to be true for the deal to work, so it starts the conversation rather than ending it. Every source is labeled and every assumption is theirs to change.",
  },
  {
    q: "Does it work on my phone at a showing?",
    a: "Yes. TrueCap is a responsive web app you can add to your phone's home screen; there is no native iOS or Android app. Share links and reports open on any phone.",
  },
  {
    q: "What does the Agent Pro trial include, and do I need a card?",
    a: `Creating an account never asks for a card. The ${PRODUCT_EVALUATION_DAYS}-day trial covers ${PRODUCT_EVALUATION_DEAL_LIMIT} complete Pro deals and ${PRODUCT_EVALUATION_COMPARISON_LIMIT} comparison, enough to see the memo and the Offer Ceiling on your own listings. Client rosters and client Buy Boxes are part of the Agent Pro subscription, not the trial; checkout shows the exact charge before you confirm.`,
  },
  {
    q: "Can I cancel?",
    a: "Yes. Cancel from your profile in one click. Agent Pro stays active until the end of the period you've paid for, then the account downgrades to Free and your saved work stays readable.",
  },
];
