import { CANONICAL_SITE_URL } from "@/lib/site-url";

const EMBED_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Build the one canonical, privacy-safe attribution URL used by the
 * "Underwrite a full property in TrueCap" call to action inside the iframe.
 * No partner identity, referrer, property data, or user input is accepted. */
export function buildEmbedAttributionHref(input: {
  siteUrl: string;
  toolPath: `/tools/${string}`;
  calculatorSlug: string;
}): string {
  if (!EMBED_SLUG.test(input.calculatorSlug)) {
    throw new Error("Invalid embed calculator slug");
  }
  if (input.toolPath !== `/tools/${input.calculatorSlug}`) {
    throw new Error("Embed attribution path must match its calculator slug");
  }

  const url = new URL(input.toolPath, input.siteUrl);
  const loopback =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "[::1]";
  if (url.protocol !== "https:" && !loopback) {
    throw new Error("Embed attribution requires HTTPS");
  }
  url.searchParams.set("utm_source", "embed");
  url.searchParams.set("utm_medium", "referral");
  url.searchParams.set("utm_campaign", input.calculatorSlug);
  return url.toString();
}

/** The "Powered by TrueCap" brand link: the calculator's own public tool page
 * on the canonical origin, bare (no query string).
 *
 * It is built from CANONICAL_SITE_URL, not getSiteUrl(), on purpose. The
 * snippet copy of this link is pasted onto partner pages once and never
 * updated, so it has to name the indexed URL itself — not a preview host, and
 * not a UTM variant that relies on the page's canonical tag to consolidate.
 * The in-iframe footer uses the same builder so the credit reads and resolves
 * the same everywhere. */
export function buildEmbedPoweredByHref(calculatorSlug: string): string {
  if (!EMBED_SLUG.test(calculatorSlug)) {
    throw new Error("Invalid embed calculator slug");
  }
  return new URL(`/tools/${calculatorSlug}`, CANONICAL_SITE_URL).toString();
}

export function embedFrameTitle(calculatorTitle: string): string {
  return `${calculatorTitle} by TrueCap`;
}
