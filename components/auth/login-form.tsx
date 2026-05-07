"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { signInAction } from "@/app/actions/auth";
import { loginSchema, type LoginInput } from "@/lib/auth-schema";
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

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
  });

  useEffect(() => {
    if (searchParams.get("error") === "auth") {
      toast({
        title: "Link invalid or expired",
        description: "Try signing in again or request a new reset email.",
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
      toast({
        title: "Sign in failed",
        description: result.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Welcome back",
      description: rememberMe ? "You are signed in." : "You are signed in for this session.",
    });
    router.push("/");
    router.refresh();
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
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
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

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked === true)} />
          Remember me
        </label>

        <Button
          type="submit"
          className="h-12 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-[0_12px_28px_rgba(37,99,235,0.22)] hover:bg-primary/95"
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
  );
}
