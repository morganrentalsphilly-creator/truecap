"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { requestPasswordResetAction } from "@/app/actions/auth";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/auth-schema";
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
  const [sent, setSent] = useState(false);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onTouched",
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setIsSubmitting(true);
    const result = await requestPasswordResetAction(values);
    setIsSubmitting(false);

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
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          If an account exists for <strong>{form.getValues("email")}</strong>, we sent a password
          reset link. Check your inbox and spam folder.
        </p>
        <Button variant="outline" className="w-full" asChild>
          <Link href="/auth/login">Back to sign in</Link>
        </Button>
      </div>
    );
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
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" />
              Sending link...
            </>
          ) : (
            "Send reset link"
          )}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/auth/login" className="text-primary font-medium hover:underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </Form>
  );
}
