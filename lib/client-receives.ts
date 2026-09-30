/**
 * What an agent's investor client receives from a shared deal. One list, read
 * by the homepage ("What your client receives") and /for-agents, so the two
 * cannot describe the share page differently.
 *
 * Each sentence is checked against the product, the same facts
 * lib/agent-faqs.ts cites: share links open without an account and are
 * read-only, expiring and revocable (app/s/[token]); co-branding renders the
 * logo, brand color and "Shared by" on the share page and a "Prepared by"
 * block on the PDF (lib/agent-share.ts, lib/pdf-generator.ts); the
 * rerun copies the deal into the free analyzer.
 */

import { PROPERTY_TAX_FACTS } from "@/lib/product-facts";

export type ClientReceivesItem = {
  key: "share-link" | "memo" | "labels" | "rerun";
  title: string;
  body: string;
};

export const CLIENT_RECEIVES: readonly ClientReceivesItem[] = [
  {
    key: "share-link",
    title: "A share link that opens without an account",
    body: "Read-only, expiring, and revocable from your dashboard. The exact address stays hidden unless you choose to include it. Your client needs an account only to save a private copy.",
  },
  {
    key: "memo",
    title: "The decision memo, co-branded",
    body: "With branding set up, the share page carries your logo, your brand color, and “Shared by” your name or company, with a form the client can use to message you. The PDF adds your tagline and a “Prepared by” block with your name, email, phone, and website. TrueCap's name stays on both as the methodology behind the numbers: co-branded, not white-label.",
  },
  {
    key: "labels",
    title: "Every number labeled: benchmark or entered",
    body: `Rent shows as a HUD area benchmark and the rate as a FRED benchmark until you replace them. ${PROPERTY_TAX_FACTS.notAutoFilled} ${PROPERTY_TAX_FACTS.blankFieldBehavior}`,
  },
  {
    key: "rerun",
    title: "The disclaimer, and their own rerun",
    body: "The share page states that it is a screening record, not a decision, and that every material assumption should be verified. One click copies the deal into the free analyzer so your client can change any assumption and rerun it themselves.",
  },
];
