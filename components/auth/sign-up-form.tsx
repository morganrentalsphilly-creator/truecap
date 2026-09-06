"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics/site-events";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { signUpAction } from "@/app/actions/auth";
import { trackConversion } from "@/lib/analytics/track-conversion";
import { trackEvent } from "@/lib/analytics";
import {
  internalNextPathOrNull,
  safeInternalNextPath,
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { hasPendingSaveIntent } from "@/lib/save-intent";
import { PRODUCT_EVALUATION_DAYS } from "@/lib/product-access";
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
  const selectedPlan =
    agentProConfigured && searchParams.get("plan") === "agent-pro"
      ? "agent-pro"
      : "investor-pro";
  const selectedBilling =
    searchParams.get("billing") === "annual" ? "annual" : "monthly";
  const selectedPlanName =
    selectedPlan === "agent-pro" ? "Agent Pro" : "Investor Pro";
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
        toast({
          title: "Sign up failed",
          description: result.message,
          variant: "destructive",
        });
        return;
      }

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
        toast({
          title: "Account created — confirm your email",
          description:
            "We sent a confirmation link. You can start using the free calculator right now while you wait.",
        });
      } else {
        toast({
          title: "Welcome to TrueCap",
          description: "You're signed in. Run your first deal below.",
        });
      }
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

  return (
    <div className="space-y-5">
      <section
        aria-labelledby="evaluation-summary-title"
        className="rounded-xl border border-primary/25 bg-primary/5 p-4"
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
          $0 today · no card
        </p>
        <h2
          id="evaluation-summary-title"
          className="mt-1 text-base font-bold text-foreground"
        >
          Your {PRODUCT_EVALUATION_DAYS}-day free trial
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Complete three Pro deal analyses and one full comparison.{" "}
          {
            "Nothing auto-renews and no subscription starts when you create the account."
          }
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-card p-2.5">
            <dt className="text-muted-foreground">Plan you reviewed</dt>
            <dd className="mt-0.5 font-semibold text-foreground">
              {selectedPlanName} · {selectedBilling}
            </dd>
          </div>
          <div className="rounded-lg bg-card p-2.5">
            <dt className="text-muted-foreground">
              Only if you subscribe later
            </dt>
            <dd className="mt-0.5 font-semibold text-foreground">
              {formatPublicUsd(selectedPrice)}
              {selectedPriceSuffix}
            </dd>
          </div>
        </dl>
      </section>
      {hasPendingDeal ? (
        <div
          role="status"
          className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-foreground"
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
        className="relative"
        role="separator"
        aria-label="or sign up with email"
      >
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
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-5"
          noValidate
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-xs font-semibold text-foreground">
                  Email
                </FormLabel>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      required
                      aria-required="true"
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
                <FormLabel className="text-xs font-semibold text-foreground">
                  Password
                </FormLabel>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <FormControl>
                    <Input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      aria-required="true"
                      placeholder="Create a password"
                      disabled={isSubmitting}
                      className="h-12 rounded-xl border-border bg-background px-11 text-base sm:text-sm shadow-sm placeholder:text-muted-foreground/70"
                      {...field}
                    />
                  </FormControl>
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-0.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-xs font-semibold text-foreground">
                  Confirm password
                </FormLabel>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <FormControl>
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      aria-required="true"
                      placeholder="Confirm your password"
                      disabled={isSubmitting}
                      className="h-12 rounded-xl border-border bg-background px-11 text-base sm:text-sm shadow-sm placeholder:text-muted-foreground/70"
                      {...field}
                    />
                  </FormControl>
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    className="absolute right-0.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

          <CaptchaWidget
            onToken={setCaptchaToken}
            onUnavailable={() => setCaptchaUnavailable(true)}
          />

          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            By creating an account, you agree to the{" "}
            <Link
              href="/terms"
              className="font-medium text-primary hover:underline"
            >
              Terms
            </Link>{" "}
            and acknowledge the{" "}
            <Link
              href="/privacy"
              className="font-medium text-primary hover:underline"
            >
              Privacy Policy
            </Link>
            . No card is requested and no subscription starts today.
          </p>

          <Button
            type="submit"
            className="h-12 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.22)] hover:bg-primary/95"
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

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href={
                safeNextPath
                  ? `/auth/login?next=${encodeURIComponent(safeNextPath)}`
                  : "/auth/login"
              }
              className="inline-flex min-h-11 min-w-11 items-center justify-center px-2 font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      </Form>
    </div>
  );
}
