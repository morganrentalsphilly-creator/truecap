"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { signInAction } from "@/app/actions/auth";
import { loginSchema, type LoginInput } from "@/lib/auth-schema";
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
      description: "You are signed in.",
    });
    router.push("/");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
              <div className="flex items-center justify-between gap-2">
                <FormLabel>Password</FormLabel>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-primary hover:underline"
                  tabIndex={-1}
                >
                  Forgot password?
                </Link>
              </div>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link href="/auth/sign-up" className="text-primary font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </Form>
  );
}
