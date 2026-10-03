/**
 * What an agent's investor client receives from a shared deal. One list, read
 * by the homepage ("What your client receives") and /for-agents, so the two
 * cannot describe the share page differently.
 *
 * Each sentence describes what the share page and the PDF render today, the
 * same facts lib/agent-faqs.ts cites:
 *   - share links open without an account and are read-only, revocable and
 *     expire after 180 days (app/s/[token]; public_shares.expires_at default)
 *   - co-branding renders the logo, brand color and "Shared by" on the share
 *     page and a "Prepared by" block on the PDF (lib/agent-share.ts,
 *     components/investcalc/shared-deal-shell.tsx, lib/pdf-generator.ts). The
 *     share page's message form prints the agent's saved phone, email and
 *     website as links (AgentContactLine in
 *     components/investcalc/lead-capture-form.tsx); the PDF block prints the
 *     same fields
 *   - the share page always shows four metrics and three drivers. The
 *     decision at asking and the Offer Ceiling need an adopted target (a Buy
 *     Box, starter criteria or selected targets): a share that captured none
 *     reads "Preliminary underwriting" and Offer Ceiling "Unavailable", so
 *     the copy states the two conditionally. With a target, a paid owner's
 *     link shows the exact Offer Ceiling with its targets
 *     (lib/offer-ceiling-server.ts, a free owner's shows a range). A paid
 *     owner's link adds the sensitivity grid, whose base column is the rent,
 *     vacancy and rate used
 *     (components/investcalc/read-only-analysis-view.tsx). It does NOT show
 *     where an input came from (HUD, FRED, default or entered), and it does
 *     not list tax, insurance, down payment or reserves. Do not promise
 *     either until the share page renders them.
 *   - the PDF's "Property & Inputs" page lists the inputs (pageInputs in
 *     lib/pdf-generator.ts); its per-input source table is off
 *     (lib/report-data-builder.ts sets inputConfidence to null)
 *   - the rerun writes the deal's values, without their source labels, to the
 *     analyzer's draft and opens /analyze (runWithAssumptions). With the
 *     address hidden (the Share dialog's default, except for a Client link,
 *     where the agent chooses) the address is dropped, and
 *     the analyzer needs one before it runs.
 */

export type ClientReceivesItem = {
  key: "share-link" | "memo" | "numbers" | "rerun";
  title: string;
  body: string;
};

export const CLIENT_RECEIVES: readonly ClientReceivesItem[] = [
  {
    key: "share-link",
    title: "A share link that opens without an account",
    body: "Read-only and revocable from your dashboard; it expires after 180 days. The exact address stays hidden unless you choose to include it. Your client needs an account only to save a private copy.",
  },
  {
    key: "memo",
    title: "The decision memo, co-branded",
    body: "With branding set up, the share page carries your logo, your brand color, and “Shared by” your name or company, with a form the client can use to message you and the phone, email and website you saved. The PDF adds your tagline and a “Prepared by” block with the same contact details. TrueCap's name stays on both as the methodology behind the numbers: co-branded, not white-label.",
  },
  {
    key: "numbers",
    title: "The numbers behind the decision",
    body: "Shared from a Pro or Agent Pro account, the page shows cash flow, cash-on-cash, cap rate and DSCR, the three inputs that move cash flow most, and a sensitivity grid with the rent, vacancy and rate you used. When the deal was screened against a Buy Box or targets you chose, it also shows whether the deal meets the targets at asking and the Offer Ceiling with those targets. The PDF lists the inputs, including property tax, insurance and financing.",
  },
  {
    key: "rerun",
    title: "The disclaimer, and their own rerun",
    body: "The share page states that it is a screening record, not a decision, and that every material assumption should be verified. One click copies the deal's numbers into the free analyzer, where your client can change any assumption and rerun it; when the address is hidden, they enter the property address themselves. The numbers arrive as entered values, without source labels.",
  },
];
