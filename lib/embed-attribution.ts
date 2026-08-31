const EMBED_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Build the one canonical, privacy-safe attribution URL used both inside an
 * iframe and in the copy-paste partner caption. No partner identity, referrer,
 * property data, or user input is accepted. */
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

export function embedFrameTitle(calculatorTitle: string): string {
  return `${calculatorTitle} by TrueCap`;
}
