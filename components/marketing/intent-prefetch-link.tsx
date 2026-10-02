"use client";

/**
 * A next/link that prefetches on intent (pointer hover or keyboard focus)
 * instead of on visibility. Use it for links far down a marketing page — the
 * footer sitemap, section links, plan cards — that most visitors scroll past
 * without opening.
 *
 * Why: a default <Link> prefetches its route's RSC payload and JS as soon as
 * it scrolls into view. On 2026-09-30, a 390px visitor scrolling the homepage
 * pulled 36 route chunks (370 KB gzipped) and 45 RSC payloads (266 KB) for
 * 23 routes, almost all of them footer links, and nearly all of it unused.
 *
 * Why not plain prefetch={false}: in Next 16's App Router that turns
 * prefetching off completely: viewport, hover and touch
 * (node_modules/next/dist/client/app-dir/link.js returns early from its
 * onMouseEnter/onTouchStart handlers when prefetch is false). A desktop
 * visitor clicking a footer link would then wait on the server. This follows
 * the hover pattern in Next's prefetching guide
 * (node_modules/next/dist/docs/01-app/02-guides/prefetching.md): prefetch
 * starts as false and becomes null (the default, "auto") on the first hover
 * or focus, so the route loads while the pointer travels to the click.
 *
 * Phones have no hover, so a tapped link fetches its route when it
 * navigates, which is the intended trade. Touch is deliberately not a
 * trigger: touchstart fires whenever a scroll gesture starts on a link,
 * which would bring the scroll-time prefetch back. A tap also fires the
 * emulated mouseenter and a focus event, after the click's own fetch has
 * started, so intent comes only from a non-touch pointer or from keyboard
 * (:focus-visible) focus. Measured: onMouseEnter/onFocus added a duplicate
 * ~18 KB prefetch to every phone tap.
 *
 * Pass prefetch={false} to never prefetch, even on intent. The footer does
 * this for /analyze, whose bundle stays off marketing pages
 * (docs/site-overhaul.md, Phase 7).
 *
 * A same-page fragment href ("#pricing") has no route to prefetch and is
 * rendered as a plain <a>: next/link does not scroll when the URL already
 * carries that fragment, so the link did nothing on a second click
 * (fragment-href.ts).
 */

import Link from "next/link";
import { useState, type ComponentProps } from "react";
import { isFragmentHref } from "@/components/marketing/fragment-href";

type Props = Omit<ComponentProps<typeof Link>, "prefetch"> & {
  prefetch?: false;
};

/** What <Link prefetch> gets: off until intent, then Next's default (null). */
export function intentPrefetchValue(
  prefetch: false | undefined,
  intent: boolean,
): false | null {
  return prefetch === false || !intent ? false : null;
}

/** Keyboard focus, not the focus a click or tap gives a link. */
function isKeyboardFocus(element: Element) {
  try {
    return element.matches(":focus-visible");
  } catch {
    return true; // No :focus-visible support: treat any focus as intent.
  }
}

/**
 * The plain <a> for a same-page fragment: the anchor's own attributes and
 * handlers, without the props only next/link understands.
 */
function FragmentAnchor({
  as: _as,
  replace: _replace,
  scroll: _scroll,
  shallow: _shallow,
  passHref: _passHref,
  locale: _locale,
  legacyBehavior: _legacyBehavior,
  onNavigate: _onNavigate,
  transitionTypes: _transitionTypes,
  unstable_dynamicOnHover: _dynamicOnHover,
  ...anchorProps
}: Omit<Props, "href" | "prefetch"> & { href: string }) {
  return <a {...anchorProps} />;
}

export function IntentPrefetchLink({
  prefetch,
  onPointerEnter,
  onFocus,
  ...props
}: Props) {
  const [intent, setIntent] = useState(false);
  if (isFragmentHref(props.href)) {
    return (
      <FragmentAnchor
        {...props}
        href={props.href}
        onPointerEnter={onPointerEnter}
        onFocus={onFocus}
      />
    );
  }
  return (
    <Link
      {...props}
      prefetch={intentPrefetchValue(prefetch, intent)}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") setIntent(true);
        onPointerEnter?.(event);
      }}
      onFocus={(event) => {
        if (isKeyboardFocus(event.currentTarget)) setIntent(true);
        onFocus?.(event);
      }}
    />
  );
}
