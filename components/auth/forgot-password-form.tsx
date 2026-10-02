"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { requestPasswordResetAction } from "@/app/actions/auth";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/auth-schema";
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

export function ForgotPasswordForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  // Turnstile could not run (blocked/timed out). Stop waiting for a token —
  // a captcha the user cannot solve must not be a permanent lockout. Supabase
  // still enforces server-side, so this only changes the failure MODE from a
  // dead button to a real error message.
  const [captchaUnavailable, setCaptchaUnavailable] = useState(false);
  const [sent, setSent] = useState(false);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onTouched",
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setIsSubmitting(true);
    try {
      const result = await requestPasswordResetAction({ ...values, captchaToken: captchaToken ?? undefined });

      if (!result.ok) {
        toast({
          title: "Request failed",
          description: result.message,
          variant: "destructive",
        });
        return;
      }

      setSent(true);
      toast({
        title: "Check your email",
        description: "If an account exists for that address, you will receive a reset link shortly.",
      });
    } catch {
      // This is the ONLY account-recovery path; a thrown action must not
      // leave it stuck on "Sending link..." with no way forward.
      toast({
        title: "Request failed",
        description: "Something interrupted the request. Check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-5">
        <p className="bg-band px-4 py-3 text-base leading-relaxed text-foreground">
          If an account exists for <strong className="break-words">{form.getValues("email")}</strong>, we sent a password
          reset link. Check your inbox and spam folder.
        </p>
        <Button variant="outline" size="cta" className="w-full" asChild>
          <Link href="/auth/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
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
                  placeholder="you@example.com"
                  disabled={isSubmitting}
                  className="h-12 px-4 text-base md:text-base"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <CaptchaWidget onToken={setCaptchaToken} onUnavailable={() => setCaptchaUnavailable(true)} />

        <Button
          type="submit"
          size="cta"
          className="w-full"
          disabled={isSubmitting || (captchaEnabled && !captchaUnavailable && !captchaToken)}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Sending link...
            </>
          ) : (
            "Send reset link"
          )}
        </Button>
        <p className="text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link href="/auth/login" className="tc-link inline-flex min-h-11 min-w-11 items-center justify-center px-2 font-medium">
            Sign in
          </Link>
        </p>
      </form>
    </Form>
  );
}
