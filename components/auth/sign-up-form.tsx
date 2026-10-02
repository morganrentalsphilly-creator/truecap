"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics/site-events";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { resendConfirmationAction, signUpAction } from "@/app/actions/auth";
import { trackConversion } from "@/lib/analytics/track-conversion";
import { trackEvent } from "@/lib/analytics";
import {
  internalNextPathOrNull,
  safeInternalNextPath,
  PASSWORD_POLICY_TEXT,
  signUpSchema,
  type SignUpInput,
} from "@/lib/auth-schema";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import {
  CaptchaWidget,
  captchaEnabled,
} from "@/components/auth/captcha-widget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { hasPendingSaveIntent } from "@/lib/save-intent";
import {
  PRODUCT_EVALUATION_COMPARISON_LIMIT,
  PRODUCT_EVALUATION_DAYS,
  PRODUCT_EVALUATION_DEAL_LIMIT,
} from "@/lib/product-access";
import {
  formatPublicUsd,
  PUBLIC_AGENT_PRO_ANNUAL_USD,
  PUBLIC_AGENT_PRO_MONTHLY_USD,
  PUBLIC_PRO_ANNUAL_USD,
  PUBLIC_PRO_MONTHLY_USD,
} from "@/lib/public-pricing";

interface SignUpFormProps {
  agentProConfigured?: boolean;
}

export function SignUpForm({ agentProConfigured = false }: SignUpFormProps) {
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
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hasPendingDeal, setHasPendingDeal] = useState(false);
  // Inline, announced failure state (2026-09 audit: a rejected sign-up used
  // to be a single toast that TOAST_LIMIT could drop, with the fields never
  // marked invalid).
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Email-confirmation flow: with confirmation ON there is no session after
  // sign-up, so pushing to ?next (often a signed-in route) bounced a brand-new
  // account to the login form. Hold a "check your email" state instead.
  const [confirmationSentTo, setConfirmationSentTo] = useState<string | null>(
    null,
  );
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    setHasPendingDeal(hasPendingSaveIntent());
  }, []);

  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onTouched",
  });

  // Thread ?next through the "Sign in" cross-link so a gated action's return
  // address (e.g. the calculator's pending save) survives the sign-up → login
  // hop. Same internal-paths-only validation as the post-auth redirect below.
  const safeNextPath = internalNextPathOrNull(searchParams.get("next"));
  // Only claim a plan was reviewed when the visitor arrived from a plan CTA.
  const reviewedPlanFromQuery =
    searchParams.get("plan") !== null || searchParams.get("billing") !== null;
  const selectedPlan =
    agentProConfigured && searchParams.get("plan") === "agent-pro"
      ? "agent-pro"
      : "investor-pro";
  const selectedBilling =
    searchParams.get("billing") === "annual" ? "annual" : "monthly";
  const selectedPlanName =
    selectedPlan === "agent-pro" ? "Agent Pro" : "Pro";
  const selectedPrice =
    selectedPlan === "agent-pro"
      ? selectedBilling === "annual"
        ? PUBLIC_AGENT_PRO_ANNUAL_USD
        : PUBLIC_AGENT_PRO_MONTHLY_USD
      : selectedBilling === "annual"
        ? PUBLIC_PRO_ANNUAL_USD
        : PUBLIC_PRO_MONTHLY_USD;
  const selectedPriceSuffix = selectedBilling === "annual" ? "/year" : "/month";

  async function onSubmit(values: SignUpInput) {
    trackEvent("signup_started", { method: "email" });
    track("signup_started", { method: "email" });
    setIsSubmitting(true);
    try {
      // Pass the validated ?next so the confirmation EMAIL's link also
      // returns here (the action threads it into emailRedirectTo). Without
      // it, an email-confirmation signup dropped the return path — a started
      // Pro checkout or pending save never resumed after the confirm hop.
      const result = await signUpAction(
        { ...values, captchaToken: captchaToken ?? undefined },
        safeNextPath ?? undefined,
      );

      if (!result.ok) {
        // A server-side password policy (Supabase) can be stricter than the
        // form's own rule; pin that message to the field it is about.
        if (/password/i.test(result.message)) {
          form.setError("password", { message: result.message });
        }
        setSubmitError(result.message);
        return;
      }
      setSubmitError(null);

      // Fire the Google Ads conversion event before navigating away. Safe
      // to call from anywhere; no-ops if gtag isn't loaded or the
      // conversion label hasn't been wired up in lib/analytics yet.
      trackConversion("signup");
      // The analytics wrapper attaches only the session's coarse first-touch
      // referral taxonomy. The signup method is intentionally not used as a
      // substitute for acquisition attribution.
      trackEvent("account_created");
      trackEvent("product_evaluation_started");
      track("signup_completed", { method: "email" });
      track("trial_started", { method: "email" });
      // Conversion-friendly post-signup flow:
      //  - If Supabase auto-signed the user in (email confirmation OFF):
      //    send them straight to the calculator so they get to value
      //    in 0 extra clicks.
      //  - Otherwise (the typical case — email confirmation ON): still
      //    send them to / so they can use the free calculator while they
      //    confirm their email. The toast handles the "check your email"
      //    messaging. Old flow pushed to /auth/login which forced 3+
      //    extra clicks before any value.
      if (result.needsEmailConfirmation) {
        // No session yet: show the sent state in place (with resend) instead
        // of navigating to a route that would bounce to the login form.
        setConfirmationSentTo(values.email.trim());
        return;
      }
      toast({
        title: "Welcome to TrueCap",
        description: "You're signed in. Run your first deal below.",
      });
      form.reset();
      // Honor ?next (internal paths only) so a gated action returns the user to
      // where they were instead of the homepage. The shared validator rejects the
      // whole open-redirect family (`/\evil.com`, `/..//evil.com`, `/%2F%2F…`),
      // falling back to "/" — don't add a local check alongside it.
      router.push(safeInternalNextPath(searchParams.get("next")));
      router.refresh();
    } catch {
      // A thrown action (network blip, cold-start 500, stale-deploy Server
      // Action) would otherwise leave the form disabled forever with no
      // signal — this is the top of the acquisition funnel. Make it retryable.
      toast({
        title: "Sign up failed",
        description:
          "Something interrupted the request. Check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendConfirmation() {
    if (!confirmationSentTo) return;
    setIsResending(true);
    try {
      const result = await resendConfirmationAction(
        { email: confirmationSentTo, captchaToken: captchaToken ?? undefined },
        safeNextPath ?? undefined,
      );
      toast(
        result.ok
          ? {
              title: "Confirmation email sent",
              description: `Check ${confirmationSentTo} — and the spam folder.`,
            }
          : {
              title: "Couldn't resend",
              description: result.message,
              variant: "destructive",
            },
      );
    } catch {
      toast({
        title: "Couldn't resend",
        description:
          "Something interrupted the request. Check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  }

  if (confirmationSentTo) {
    return (
      <div role="status" className="space-y-5">
        <h2 className="text-xl font-semibold text-foreground">
          Confirm your email to finish
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          We sent a confirmation link to{" "}
          <strong className="text-foreground">{confirmationSentTo}</strong>.
          Open it to activate your account
          {hasPendingDeal ? " — your analysis will be saved automatically" : ""}
          . Check the spam folder if it hasn&apos;t arrived in a minute.
        </p>
        <Button
          type="button"
          variant="outline"
          size="cta"
          className="w-full"
          onClick={handleResendConfirmation}
          disabled={isResending}
        >
          {isResending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Sending…
            </>
          ) : (
            "Resend the confirmation email"
          )}
        </Button>
        <p className="text-sm text-muted-foreground">
          Meanwhile, you can{" "}
          <Link
            href="/analyze"
            prefetch={false}
            className="tc-link inline-flex min-h-11 items-center font-medium"
          >
            run a free analysis
          </Link>{" "}
          without waiting.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section
        aria-labelledby="evaluation-summary-title"
        className="border-y border-border py-4"
      >
        <h2
          id="evaluation-summary-title"
          className="text-lg font-semibold text-foreground"
        >
          Your {PRODUCT_EVALUATION_DAYS}-day free trial
        </h2>
        <p className="mt-1 text-sm text-foreground">$0 today · no card</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Complete {PRODUCT_EVALUATION_DEAL_LIMIT} Pro deal analyses and{" "}
          {PRODUCT_EVALUATION_COMPARISON_LIMIT} full comparison.{" "}
          {/* An agent who arrives from an Agent Pro CTA is told, before the
              account exists, what the trial leaves out: the same sentence
              /for-agents puts beside that CTA (lib/entitlements.ts: the
              trial never grants custom_branding or client_buy_box). */}
          {selectedPlan === "agent-pro"
            ? "Co-branding, the client roster and client Buy Boxes are part of the Agent Pro subscription, not the trial. "
            : null}
          {
            "Nothing auto-renews and no subscription starts when you create the account."
          }
        </p>
        {reviewedPlanFromQuery ? (
          <dl className="mt-3 grid grid-cols-2 gap-x-6 border-t border-rule-soft pt-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Plan you reviewed</dt>
              <dd className="mt-0.5 font-semibold text-foreground">
                {selectedPlanName} · {selectedBilling}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                Only if you subscribe later
              </dt>
              <dd className="mt-0.5 font-semibold text-foreground">
                {formatPublicUsd(selectedPrice)}
                {selectedPriceSuffix}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Pro is {formatPublicUsd(PUBLIC_PRO_MONTHLY_USD)}/month or{" "}
            {formatPublicUsd(PUBLIC_PRO_ANNUAL_USD)}/year — only if you
            subscribe after the trial.
          </p>
        )}
      </section>
      {hasPendingDeal ? (
        <div
          role="status"
          className="bg-band px-4 py-3 text-sm text-foreground"
        >
          <p className="font-semibold">
            Your underwriting is waiting on this device.
          </p>
          <p className="mt-1 text-muted-foreground">
            Finish creating your account and we&apos;ll save that exact deal
            automatically.
          </p>
        </div>
      ) : null}
      {/* Google OAuth — the highest-leverage friction-reducer for cold
          paid traffic. One tap, no password to invent, no confirmation
          email round-trip. Email/password stays below as the fallback. */}
      <GoogleAuthButton
        disabled={isSubmitting}
        label="Create account with Google"
      />

      <div
        className="flex items-center gap-3"
        role="separator"
        aria-label="or sign up with email"
      >
        <span aria-hidden className="h-px flex-1 bg-border" />
        <span className="text-sm text-muted-foreground">or</span>
        <span aria-hidden className="h-px flex-1 bg-border" />
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-5"
          noValidate
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    required
                    aria-required="true"
                    placeholder="you@example.com"
                    disabled={isSubmitting}
                    className="h-12 px-4 text-base lg:text-base"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      aria-required="true"
                      placeholder="Create a password"
                      disabled={isSubmitting}
                      className="h-12 pl-4 pr-12 text-base lg:text-base"
                      {...field}
                    />
                  </FormControl>
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-0.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                {/* No hand-set id here and no aria-describedby on the field:
                    FormControl names this description and, when there is
                    one, the error under it. A hand-set aria-describedby on
                    the input replaced that list, so a rejected password was
                    never part of the field's description. */}
                <FormDescription>
                  {PASSWORD_POLICY_TEXT}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm password</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      aria-required="true"
                      placeholder="Confirm your password"
                      disabled={isSubmitting}
                      className="h-12 pl-4 pr-12 text-base lg:text-base"
                      {...field}
                    />
                  </FormControl>
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    className="absolute right-0.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirmation password"
                        : "Show confirmation password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {submitError ? (
            <div
              role="alert"
              className="rounded-md border border-destructive px-4 py-3 text-sm text-foreground"
            >
              <p className="font-semibold text-destructive-text">Sign up failed</p>
              <p className="mt-0.5 leading-relaxed">{submitError}</p>
              {/already exists|signing in/i.test(submitError) ? (
                <Link
                  href={
                    safeNextPath
                      ? `/auth/login?next=${encodeURIComponent(safeNextPath)}`
                      : "/auth/login"
                  }
                  className="tc-link mt-1 inline-flex min-h-11 items-center font-semibold"
                >
                  Sign in instead
                </Link>
              ) : null}
            </div>
          ) : null}

          <CaptchaWidget
            onToken={setCaptchaToken}
            onUnavailable={() => setCaptchaUnavailable(true)}
          />

          <p className="text-sm leading-relaxed text-muted-foreground">
            By creating an account, you agree to the{" "}
            <Link
              href="/terms"
              className="tc-link font-medium"
            >
              Terms
            </Link>{" "}
            and acknowledge the{" "}
            <Link
              href="/privacy"
              className="tc-link font-medium"
            >
              Privacy Policy
            </Link>
            . No card is requested and no subscription starts today.
          </p>

          <Button
            type="submit"
            size="cta"
            className="w-full"
            disabled={
              isSubmitting ||
              (captchaEnabled && !captchaUnavailable && !captchaToken)
            }
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating account...
              </>
            ) : hasPendingDeal ? (
              "Create account and save this analysis"
            ) : (
              "Create account — $0 today"
            )}
          </Button>

          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href={
                safeNextPath
                  ? `/auth/login?next=${encodeURIComponent(safeNextPath)}`
                  : "/auth/login"
              }
              className="tc-link inline-flex min-h-11 min-w-11 items-center justify-center px-2 font-medium"
            >
              Sign in
            </Link>
          </p>
        </form>
      </Form>
    </div>
  );
}
