"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics/site-events";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Check, ChevronDown, Circle, Eye, EyeOff, Loader2 } from "lucide-react";
import { resendConfirmationAction, signUpAction } from "@/app/actions/auth";
import { trackConversion } from "@/lib/analytics/track-conversion";
import { trackEvent } from "@/lib/analytics";
import {
  internalNextPathOrNull,
  safeInternalNextPath,
  PASSWORD_RULES,
  signUpSchema,
  type SignUpInput,
} from "@/lib/auth-schema";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import {
  CaptchaWidget,
  captchaEnabled,
  type CaptchaWidgetHandle,
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
import { cn } from "@/lib/utils";

/**
 * What the form says when Create account is pressed before the human check
 * has a token (2026-11 ads pass, B4). The button is never greyed out waiting
 * for it: a disabled button with no reason reads as a broken page.
 */
const HUMAN_CHECK_PENDING_MESSAGE =
  "We're still checking that you're human. It takes a few seconds. Try again.";
const HUMAN_CHECK_INTERACTIVE_MESSAGE =
  "Complete the human check above, then create your account.";

interface SignUpFormProps {
  agentProConfigured?: boolean;
}

export function SignUpForm({ agentProConfigured = false }: SignUpFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  // A Turnstile token works once. Every server call below that carries it is
  // followed by captchaRef.current?.reset(), which clears the token (a submit
  // without one is answered with a message, resend is disabled) and asks the
  // mounted widget for a new one. The
  // form and the confirmation panel each mount a widget on this ref; only one
  // of the two is on screen at a time.
  const captchaRef = useRef<CaptchaWidgetHandle>(null);
  // Turnstile could not run (blocked/timed out). Stop waiting for a token —
  // a captcha the user cannot solve must not be a permanent lockout. Supabase
  // still enforces server-side, so this only changes the failure MODE from a
  // dead button to a real error message.
  const [captchaUnavailable, setCaptchaUnavailable] = useState(false);
  // Turnstile is showing a challenge the visitor has to answer (the widget is
  // otherwise invisible: components/auth/captcha-widget.tsx).
  const [captchaInteractive, setCaptchaInteractive] = useState(false);
  // Set when Create account was pressed without a token; cleared when one
  // arrives.
  const [humanCheckMessage, setHumanCheckMessage] = useState<string | null>(
    null,
  );
  const [showPassword, setShowPassword] = useState(false);
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
    },
    mode: "onTouched",
  });
  // The live checklist under the password field reads the field as typed.
  const passwordValue = useWatch({ control: form.control, name: "password" }) ?? "";
  // The token arrived: the "still checking" message has nothing left to say.
  useEffect(() => {
    if (captchaToken) setHumanCheckMessage(null);
  }, [captchaToken]);

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
    // The fields are valid (the resolver ran). Without a token the request
    // would only be rejected by Supabase's captcha check, so say what is
    // missing here, next to the button, and send nothing. If Turnstile could
    // not run at all (captchaUnavailable) the request goes out as before and
    // the server's own message is shown.
    if (captchaEnabled && !captchaUnavailable && !captchaToken) {
      setSubmitError(null);
      setHumanCheckMessage(
        captchaInteractive
          ? HUMAN_CHECK_INTERACTIVE_MESSAGE
          : HUMAN_CHECK_PENDING_MESSAGE,
      );
      return;
    }
    setHumanCheckMessage(null);
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
        selectedPlan === "agent-pro" ? "agent" : undefined,
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
      // The token went with the request and is spent whatever the outcome.
      // Cleared here so neither a retry nor the confirmation panel's resend
      // can send it again.
      captchaRef.current?.reset();
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
      // Spent with the resend; the next one needs a new token.
      captchaRef.current?.reset();
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
        {/* The form's widget unmounted with the form, and its token was spent
            by the sign-up call. This one issues the token the resend sends. */}
        <CaptchaWidget
          ref={captchaRef}
          onToken={setCaptchaToken}
          onUnavailable={() => setCaptchaUnavailable(true)}
        />
        <Button
          type="button"
          variant="outline"
          size="cta"
          className="w-full"
          onClick={handleResendConfirmation}
          disabled={
            isResending ||
            (captchaEnabled && !captchaUnavailable && !captchaToken)
          }
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
                {/* The policy as a checklist that ticks as the visitor types
                    (the rows are lib/auth-schema.ts PASSWORD_RULES, the ones
                    the schema enforces). A <p> of rows, so FormControl still
                    names it as the field's description. */}
                <FormDescription className="grid gap-1" data-password-checklist="">
                  {PASSWORD_RULES.map((rule) => {
                    const met = rule.test(passwordValue);
                    return (
                      <span
                        key={rule.key}
                        data-met={met ? "true" : "false"}
                        // Ink, not green: the Sign Rule keeps green for a
                        // number's sign. The mark and the weight carry it.
                        className={cn(
                          "flex items-center gap-2",
                          met ? "font-medium text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {met ? (
                          <Check className="size-4 shrink-0" aria-hidden />
                        ) : (
                          <Circle className="size-4 shrink-0 scale-[0.4]" aria-hidden />
                        )}
                        <span>
                          {rule.label}
                          <span className="sr-only">
                            {met ? " (met)" : " (not met yet)"}
                          </span>
                        </span>
                      </span>
                    );
                  })}
                </FormDescription>
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

          {/* Invisible unless a challenge needs the visitor (B5). */}
          <CaptchaWidget
            ref={captchaRef}
            onToken={setCaptchaToken}
            onUnavailable={() => setCaptchaUnavailable(true)}
            onInteractiveChange={setCaptchaInteractive}
          />
          {humanCheckMessage ? (
            <p
              role="alert"
              data-human-check-message=""
              className="rounded-md border border-destructive px-4 py-3 text-sm leading-relaxed text-foreground"
            >
              {humanCheckMessage}
            </p>
          ) : null}

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

          {/* Never greyed out for a missing field or token (B4): pressing it
              shows what is missing, next to the field or just above. Only an
              in-flight request disables it. */}
          <Button
            type="submit"
            size="cta"
            className="w-full"
            disabled={isSubmitting}
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

          {hasPendingDeal ? (
            <p role="status" className="text-sm leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">
                Your underwriting is waiting on this device.
              </span>{" "}
              Finish creating your account and we&apos;ll save that exact deal
              automatically.
            </p>
          ) : null}

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

      {/* The trial's terms, one tap away (B1): they used to sit above the
          buttons and pushed Google to 674px on a phone. */}
      <details
        data-trial-details=""
        className="tc-accordion group border-y border-border"
      >
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-2 text-base font-semibold text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
          <span id="evaluation-summary-title">What the trial includes</span>
          <ChevronDown
            aria-hidden
            className="size-4 shrink-0 transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="pb-4">
          <p className="text-sm font-semibold text-foreground">
            Your {PRODUCT_EVALUATION_DAYS}-day free trial
          </p>
          <p className="mt-1 text-sm text-foreground">$0 today · no card</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {/* What the trial counts (lib/evaluation-resource-key.ts): one
                analysis per distinct set of inputs. Running the same inputs
                again reuses its ledger row; any changed input is a new row. */}
            Complete {PRODUCT_EVALUATION_DEAL_LIMIT} Pro analyses and{" "}
            {PRODUCT_EVALUATION_COMPARISON_LIMIT} full comparison. Revisions to the same property do not use another trial analysis.{" "}
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
          ) : null}
        </div>
      </details>
    </div>
  );
}
