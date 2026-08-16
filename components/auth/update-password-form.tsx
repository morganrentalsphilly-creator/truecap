"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { updatePasswordAction } from "@/app/actions/auth";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  internalNextPathOrNull,
  updatePasswordSchema,
  type UpdatePasswordInput,
} from "@/lib/auth-schema";
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

export function UpdatePasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<UpdatePasswordInput>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onTouched",
  });

  // The recovery callback has already established a real Supabase session.
  // Validate its nested return path again at the last consumer and use the
  // dashboard as the recovery-specific fallback (rather than the homepage).
  const safeNextPath = internalNextPathOrNull(searchParams.get("next")) ?? "/dashboard";
  const encodedNextPath = encodeURIComponent(safeNextPath);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let cancelled = false;
    void supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (!cancelled) setSessionReady(!!user);
      })
      .catch(() => {
        if (!cancelled) setSessionReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(values: UpdatePasswordInput) {
    setIsSubmitting(true);
    try {
      const result = await updatePasswordAction(values);

      if (!result.ok) {
        toast({
          title: "Could not update password",
          description: result.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Password updated",
        description: "You're signed in. Continuing where you left off.",
      });
      router.replace(safeNextPath);
      router.refresh();
    } catch {
      // A thrown action here strands the user mid-reset on a one-time link
      // they'd then have to re-request. Keep it retryable in place.
      toast({
        title: "Could not update password",
        description: "Something interrupted the request. Check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sessionReady === false) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm leading-relaxed text-muted-foreground">
          You need a valid reset link to set a new password. Request a new link from the forgot
          password page.
        </p>
        <Button variant="outline" className="h-12 w-full rounded-xl" asChild>
          <Link href={`/auth/forgot-password?next=${encodedNextPath}`}>Forgot password</Link>
        </Button>
        <Button variant="ghost" className="h-12 w-full rounded-xl" asChild>
          <Link href={`/auth/login?next=${encodedNextPath}`}>Sign in</Link>
        </Button>
      </div>
    );
  }

  if (sessionReady === null) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-xs font-semibold text-foreground">New password</FormLabel>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <FormControl>
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Enter your new password"
                    disabled={isSubmitting}
                    className="h-12 rounded-xl border-border bg-background px-11 text-base sm:text-sm shadow-sm placeholder:text-muted-foreground/70"
                    {...field}
                  />
                </FormControl>
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-0.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
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
              <FormLabel className="text-xs font-semibold text-foreground">Confirm password</FormLabel>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <FormControl>
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Confirm your new password"
                    disabled={isSubmitting}
                    className="h-12 rounded-xl border-border bg-background px-11 text-base sm:text-sm shadow-sm placeholder:text-muted-foreground/70"
                    {...field}
                  />
                </FormControl>
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  className="absolute right-0.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="h-12 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.22)] hover:bg-primary/95"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Updating...
            </>
          ) : (
            "Update password"
          )}
        </Button>
      </form>
    </Form>
  );
}
