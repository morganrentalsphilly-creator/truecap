"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { resendConfirmationAction, signInAction } from "@/app/actions/auth";
import { internalNextPathOrNull, loginSchema, safeInternalNextPath, type LoginInput } from "@/lib/auth-schema";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { CaptchaWidget, captchaEnabled } from "@/components/auth/captcha-widget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  // Turnstile could not run (blocked/timed out). Stop waiting for a token —
  // a captcha the user cannot solve must not be a permanent lockout. Supabase
  // still enforces server-side, so this only changes the failure MODE from a
  // dead button to a real error message.
  const [captchaUnavailable, setCaptchaUnavailable] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // When a sign-in fails because the email isn't confirmed, surface a
  // one-click "Resend confirmation" affordance. We stash the email
  // they tried so the resend goes to the right address.
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
  });

  // Thread ?next through the sign-up cross-link so a gated action's return
  // address (e.g. the calculator's pending save) survives the login → sign-up
  // hop. Same internal-paths-only validation as the post-auth redirect below.
  const safeNextPath = internalNextPathOrNull(searchParams.get("next"));

  useEffect(() => {
    if (searchParams.get("error") === "auth") {
      // Differentiate the common failure modes so users know whether to
      // request a new email vs. retry signing in. The callback route
      // surfaces a specific `reason` query param when it can.
      const reason = searchParams.get("reason") ?? "";
      const isMissing = reason === "missing_token";
      const isExpired = /expire|otp|token/i.test(reason);
      toast({
        title: isMissing
          ? "Link is missing required info"
          : isExpired
            ? "Link expired or already used"
            : "Link invalid or expired",
        description: isMissing
          ? "Open the link directly from the email, or request a new one."
          : "Reset and confirmation links work once and expire after a short time. Request a new email below.",
        variant: "destructive",
      });
      return;
    }

    if (searchParams.get("registered") === "1") {
      toast({
        title: "Registration successful",
        description: "A confirmation email has been sent. Please verify your email and sign in.",
      });
    }
  }, [searchParams, toast]);

  async function onSubmit(values: LoginInput) {
    setIsSubmitting(true);
    try {
      const result = await signInAction({ ...values, captchaToken: captchaToken ?? undefined });

      if (!result.ok) {
        // Auth action maps the Supabase "email not confirmed" code to a
        // specific message — detect that and offer to resend.
        const isUnconfirmed = /confirm your email/i.test(result.message);
        if (isUnconfirmed) {
          setUnconfirmedEmail(values.email.trim());
        } else {
          setUnconfirmedEmail(null);
        }
        toast({
          title: "Sign in failed",
          description: result.message,
          variant: "destructive",
        });
        return;
      }

      setUnconfirmedEmail(null);
      toast({
        title: "Welcome back",
        description: "You are signed in.",
      });
      // Honor ?next so a gated action (Save, a Pro CTA, the share viewer) returns
      // the user to where they were instead of dumping them on the homepage.
      // Only internal paths are allowed. safeInternalNextPath is the single
      // validator (shape + dot-segment normalization + re-check of the value it
      // returns), so `?next=/%5Cevil.com`, `?next=/..//evil.com` and friends fall
      // back to "/" instead of handing the browser a hard navigation off-site
      // right after a password entry. Never re-implement that check here.
      router.push(safeInternalNextPath(searchParams.get("next")));
      router.refresh();
    } catch {
      // The action REJECTED rather than returning {ok:false}: a network blip
      // at submit time, a cold-start 500, or a tab one deploy behind main
      // (Next throws on an unrecognized Server Action). Without this catch the
      // finally still frees the form, but the user got no signal — so tell
      // them it's retryable. Mirrors the guard in investcalc-page.tsx.
      toast({
        title: "Sign in failed",
        description: "Something interrupted the request. Check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      // ALWAYS re-enable the form. The bug this replaces left the button and
      // both inputs disabled forever whenever the await threw.
      setIsSubmitting(false);
    }
  }

  async function handleResendConfirmation() {
    if (!unconfirmedEmail || isResending) return;
    setIsResending(true);
    try {
      // Keep the caller's return path on the resent link too — the resent
      // confirmation email should land the user where they were headed
      // (?next), matching the original sign-up email.
      const result = await resendConfirmationAction(
        // Carry the captcha token — Supabase enforces captcha on resend too,
        // and without it the send is rejected while the UI claims success.
        { email: unconfirmedEmail, captchaToken: captchaToken ?? undefined },
        safeNextPath ?? undefined
      );
      if (!result.ok) {
        toast({
          title: "Couldn't resend",
          description: result.message,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Confirmation email sent",
        description: `Check the inbox for ${unconfirmedEmail} (and your spam folder).`,
      });
    } catch {
      toast({
        title: "Couldn't resend",
        description: "Something interrupted the request. Check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Google OAuth — appears above the email form because (a) it's
          the lowest-friction option (zero typing on mobile), and (b)
          users with a Google account who arrive via paid traffic will
          recognize and trust this faster than entering credentials. */}
      <GoogleAuthButton disabled={isSubmitting} />

      <div className="relative" role="separator" aria-label="or sign in with email">
        <div aria-hidden className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-card px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            or
          </span>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-xs font-semibold text-foreground">Email</FormLabel>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    disabled={isSubmitting}
                    className="h-12 rounded-xl border-border bg-background pl-11 text-base sm:text-sm shadow-sm placeholder:text-muted-foreground/70"
                    {...field}
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <FormLabel className="text-xs font-semibold text-foreground">Password</FormLabel>
                <Link
                  href="/auth/forgot-password"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center px-2 text-xs font-medium text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <FormControl>
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    disabled={isSubmitting}
                    className="h-12 rounded-xl border-border bg-background px-11 text-base sm:text-sm shadow-sm placeholder:text-muted-foreground/70"
                    {...field}
                  />
                </FormControl>
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {unconfirmedEmail ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <p className="font-semibold">
              Your email <span className="font-mono">{unconfirmedEmail}</span> isn&apos;t confirmed yet.
            </p>
            <p className="mt-0.5 leading-relaxed text-amber-800">
              Check your inbox + spam folder, or resend the confirmation link.
            </p>
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={isResending}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-amber-200 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-900 hover:bg-amber-300 disabled:opacity-50"
            >
              {isResending ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  Sending…
                </>
              ) : (
                "Resend confirmation"
              )}
            </button>
          </div>
        ) : null}

        <CaptchaWidget onToken={setCaptchaToken} onUnavailable={() => setCaptchaUnavailable(true)} />

        <Button
          type="submit"
          className="h-12 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.22)] hover:bg-primary/95"
          disabled={isSubmitting || (captchaEnabled && !captchaUnavailable && !captchaToken)}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link
            href={
              safeNextPath
                ? `/auth/sign-up?next=${encodeURIComponent(safeNextPath)}`
                : "/auth/sign-up"
            }
            className="inline-flex min-h-11 min-w-11 items-center justify-center px-2 font-medium text-primary hover:underline"
          >
            Sign up
          </Link>
        </p>
        </form>
      </Form>
    </div>
  );
}
