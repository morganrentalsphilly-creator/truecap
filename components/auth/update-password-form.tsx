"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { updatePasswordAction } from "@/app/actions/auth";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { updatePasswordSchema, type UpdatePasswordInput } from "@/lib/auth-schema";
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
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);

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
    const result = await updatePasswordAction(values);
    setIsSubmitting(false);

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
      description: "You can sign in with your new password.",
    });
    router.push("/auth/login");
    router.refresh();
  }

  if (sessionReady === false) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          You need a valid reset link to set a new password. Request a new link from the forgot
          password page.
        </p>
        <Button variant="outline" className="w-full" asChild>
          <Link href="/auth/forgot-password">Forgot password</Link>
        </Button>
        <Button variant="ghost" className="w-full" asChild>
          <Link href="/auth/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (sessionReady === null) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
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
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm new password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
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
