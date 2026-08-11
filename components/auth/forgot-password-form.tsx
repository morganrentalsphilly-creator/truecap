"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
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
      <div className="space-y-5 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="size-7" />
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          If an account exists for <strong>{form.getValues("email")}</strong>, we sent a password
          reset link. Check your inbox and spam folder.
        </p>
        <Button variant="outline" className="h-12 w-full rounded-xl" asChild>
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
        <CaptchaWidget onToken={setCaptchaToken} />

        <Button
          type="submit"
          className="h-12 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.22)] hover:bg-primary/95"
          disabled={isSubmitting || (captchaEnabled && !captchaToken)}
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
        <p className="text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link href="/auth/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </Form>
  );
}
