/**
 * Not-found page for shared-deal links only.
 *
 * The route deliberately renders the SAME outcome for a revoked link, an
 * expired link, a malformed token, a rate-limited request, and a token that
 * never existed — see the header comment in ./page.tsx. That uniformity is a
 * security property: anything that distinguished those cases would be an
 * oracle letting someone probe which tokens are real.
 *
 * This page does not weaken that. It says nothing about WHY the link did not
 * resolve, and every visitor sees identical copy. What it changes is who the
 * page is written for. The generic site 404 apologises for a missing page and
 * offers a search box and six content links, which is the wrong recovery path
 * here: a person following a share link was sent it by someone else, cannot
 * search their way to a private deal, and needs to be told to go back to the
 * sender — not to read the blog.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { LinkIcon, ArrowUpRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Share link unavailable",
  robots: { index: false, follow: false },
};

export default function ShareLinkNotFound() {
  return (
    <main
      id="main"
      className="min-h-screen bg-background flex flex-col items-center px-4 pt-16 pb-12 sm:pt-24"
    >
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-[var(--brand-blue-light)] text-primary">
          <LinkIcon className="size-6" />
        </div>
        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          TrueCap
        </div>
        <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">
          This share link isn&apos;t available
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          Shared analyses can be turned off by their owner at any time, and
          links can be mistyped or cut short when they&apos;re copied between
          apps. Ask whoever sent it for a fresh link — they can create one in a
          couple of seconds.
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          Nothing you did caused this, and the deal itself is unaffected.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5 sm:w-auto"
          >
            Analyze a property free
            <ArrowUpRight className="size-4" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-border px-6 text-sm font-semibold text-foreground transition hover:bg-muted sm:w-auto"
          >
            See what TrueCap does
          </Link>
        </div>
      </div>
    </main>
  );
}
