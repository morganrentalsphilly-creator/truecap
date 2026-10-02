/**
 * The two Open Graph fields every page shares.
 *
 * Next merges metadata by top-level key, not deeply: a page that sets its own
 * `openGraph` (for its title, description and url) replaces the root layout's
 * object wholesale, so og:site_name and og:locale are lost unless the page
 * carries them itself. Spread this first in a page-level object:
 *
 *   openGraph: { ...OPEN_GRAPH_BASE, title, description, url, type: "website" }
 *
 * It holds no image on purpose. A page with its own opengraph-image.tsx sets
 * no `images`, and Next then serves that file as og:image and twitter:image;
 * a page without one names its image itself.
 * lib/__tests__/public-metadata-contract.test.ts holds both halves.
 */
export const OPEN_GRAPH_BASE = {
  siteName: "TrueCap",
  locale: "en_US",
} as const;
