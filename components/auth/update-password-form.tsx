"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { updatePasswordAction } from "@/app/actions/auth";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  PASSWORD_POLICY_TEXT,
  type UpdatePasswordInput,
  updatePasswordSchema,
} from "@/lib/auth-schema";
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

export function UpdatePasswordForm() {
  const router = useRouter();
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

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setSessionReady(!!user);
    });
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

      // The recovery link already established a session, so the user is
      // signed in with the new password — send them into the product rather
      // than back to a login form they don't need.
      toast({
        title: "Password updated",
        description: "You're signed in with your new password.",
      });
      router.push("/dashboard");
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
      <div className="space-y-4">
        <p className="text-base leading-relaxed text-muted-foreground">
          You need a valid reset link to set a new password. Request a new link from the forgot
          password page.
        </p>
        <Button variant="outline" size="cta" className="w-full" asChild>
          <Link href="/auth/forgot-password">Forgot password</Link>
        </Button>
        <Button variant="ghost" size="cta" className="w-full" asChild>
          <Link href="/auth/login">Sign in</Link>
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
            <FormItem>
              <FormLabel>New password</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Enter your new password"
                    disabled={isSubmitting}
                    className="h-12 pl-4 pr-12 text-base lg:text-base"
                    {...field}
                  />
                </FormControl>
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-0.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <FormDescription id="new-password-policy">
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
                    placeholder="Confirm your new password"
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
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          size="cta"
          className="w-full"
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
