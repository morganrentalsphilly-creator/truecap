"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { resendConfirmationAction, signInAction } from "@/app/actions/auth";
import { loginSchema, type LoginInput } from "@/lib/auth-schema";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
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
    const result = await signInAction(values);
    setIsSubmitting(false);

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
      description: rememberMe ? "You are signed in." : "You are signed in for this session.",
    });
    router.push("/");
    router.refresh();
  }

  async function handleResendConfirmation() {
    if (!unconfirmedEmail || isResending) return;
    setIsResending(true);
    const result = await resendConfirmationAction({ email: unconfirmedEmail });
    setIsResending(false);
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
              <FormControl>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    disabled={isSubmitting}
                    className="h-12 rounded-xl border-border bg-background pl-11 text-sm shadow-sm placeholder:text-muted-foreground/70"
                    {...field}
                  />
                </div>
              </FormControl>
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
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <FormControl>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    disabled={isSubmitting}
                    className="h-12 rounded-xl border-border bg-background px-11 text-sm shadow-sm placeholder:text-muted-foreground/70"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </FormControl>
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

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked === true)} />
          Remember me
        </label>

        <Button
          type="submit"
          className="h-12 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-[0_12px_28px_rgba(0, 112, 196,0.22)] hover:bg-primary/95"
          disabled={isSubmitting}
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
          <Link href="/auth/sign-up" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </p>
        </form>
      </Form>
    </div>
  );
}
