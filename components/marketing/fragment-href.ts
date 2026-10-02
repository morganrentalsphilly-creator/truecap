/**
 * A same-page fragment link ("#pricing", "#pro") is rendered as a plain <a>,
 * never as next/link.
 *
 * next/link scrolls on a hash-only navigation only when the hash CHANGES
 * (node_modules/next/dist/client/components/segment-cache/navigation.js:
 * `url.hash !== oldUrl.hash`). Once the address bar already carries the
 * fragment, a second click on a link to it did nothing: /for-agents' "See
 * Agent Pro pricing" and /pricing's "See Pro plans" and plan jumps scrolled
 * 0px after the first use, and after Back from sign-up (the URL still ends in
 * the fragment). The browser's own fragment navigation scrolls every time and
 * honors the same scroll padding and scroll margins.
 *
 * Shared by TrackedMarketingLink and IntentPrefetchLink; /pricing's hero
 * writes its fragment links as <a> directly. Guarded by
 * lib/__tests__/intent-prefetch-landing.test.ts.
 */
export function isFragmentHref(href: unknown): href is string {
  return typeof href === "string" && href.startsWith("#");
}
