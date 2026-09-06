"use client";

/**
 * One-tap Google OAuth button for the auth pages.
 *
 * Why this exists: cold paid traffic abandons email/password signups at
 * 30-60%. A "Continue with Google" option typically lifts signup
 * conversion 20-40% on similar SMB tools because (a) zero typing on
 * mobile, (b) zero password to remember, (c) Google handles email
 * verification implicitly so we skip the confirm-email step entirely.
 *
 * Flow:
 *   1. User clicks the button.
 *   2. `supabase.auth.signInWithOAuth({ provider: 'google', ... })`
 *      sends them to Google's consent screen.
 *   3. Google redirects back to https://<our-domain>/auth/callback?code=...
 *      The existing /auth/callback route handler (already wired) calls
 *      `exchangeCodeForSession(code)` and drops them on the `next` path.
 *
 * Setup required (Supabase dashboard + Google Cloud Console):
 *   See: docs/google-oauth-setup.md
 *
 * If Supabase isn't configured for Google yet, the button still renders
 * but the API call surfaces a clear error toast so users aren't left
 * staring at a spinner.
 */

import { useState } from "react";
import { track } from "@/lib/analytics/site-events";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { safeInternalNextPath } from "@/lib/auth-schema";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { friendlyToastError } from "@/lib/friendly-error";
import { useToast } from "@/hooks/use-toast";

type Props = {
  /**
   * Label override. Defaults to "Continue with Google" — the
   * conventional phrasing that works for both sign-in AND sign-up
   * without needing to know which flow the user is in.
   */
  label?: string;
  /**
   * Disable the button while a sibling form is mid-submit so users
   * can't kick off two parallel auth flows.
   */
  disabled?: boolean;
  /** Runs synchronously before leaving for OAuth (e.g. persist save intent). */
  onBeforeStart?: () => void;
};

export function GoogleAuthButton({ label = "Continue with Google", disabled = false, onBeforeStart }: Props) {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  async function handleClick() {
    if (isPending || disabled) return;
    onBeforeStart?.();
    setIsPending(true);

    // Preserve any ?next= param the user arrived with so post-auth they
    // land back on the page they were trying to reach (pricing checkout,
    // a deal they were viewing, etc). Sanitize to same-origin paths only
    // — never accept an absolute URL from the query string.
    // (One shared validator: a prefix check would let `/\evil.com` through and
    // a bare origin comparison would let `/..//evil.com` through — both resolve
    // to an off-site origin once the browser re-resolves them.)
    const next = safeInternalNextPath(searchParams.get("next"));

    // window.location.origin is only available in the browser, but this
    // is a "use client" component called from an onClick — we're safe.
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

    try {
      const supabase = createBrowserSupabaseClient();
      track("signup_started", { method: "google" });
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          // Force account chooser so users on shared devices can switch
          // Google accounts cleanly instead of being silently logged
          // into whichever account Google last used.
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (error) {
        // Most common failure: Google provider isn't enabled in the
        // Supabase project yet. friendlyToastError maps that class to
        // plain English and captures the raw message to Sentry, so the
        // setup gap stays visible without piping SDK jargon to users.
        toast({
          title: "Google sign-in unavailable",
          description: friendlyToastError(error, {
            feature: "google-auth",
            fallback: "Google sign-in isn't available right now — use your email and password instead.",
          }),
          variant: "destructive",
        });
        setIsPending(false);
        return;
      }

      // On success Supabase navigates the page to Google — we won't
      // reach this branch. Leave the spinner spinning until that nav
      // happens so the button stays in a "working" state.
    } catch (err) {
      // Network failures fall here. Reset spinner + show a toast.
      toast({
        title: "Google sign-in failed",
        description: friendlyToastError(err, {
          feature: "google-auth",
          fallback: "Something went wrong. Try email + password instead.",
        }),
        variant: "destructive",
      });
      setIsPending(false);
    }
  }

  const isDisabled = disabled || isPending;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      aria-label={label}
      className="group inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Redirecting to Google…
        </>
      ) : (
        <>
          {/* Inline SVG for the official Google "G" mark. Inlining
              avoids an extra network hop and keeps the button rendering
              consistent even if a CDN icon fails to load. */}
          <svg
            viewBox="0 0 18 18"
            xmlns="http://www.w3.org/2000/svg"
            className="size-[18px]"
            aria-hidden="true"
          >
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
            />
            <path
              fill="#FBBC05"
              d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.04l3.007-2.333z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
            />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}
