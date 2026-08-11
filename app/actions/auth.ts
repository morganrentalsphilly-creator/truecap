"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import {
  forgotPasswordSchema,
  loginSchema,
  safeInternalNextPath,
  signUpSchema,
  updatePasswordSchema,
} from "@/lib/auth-schema";

export type AuthActionResult =
  | { ok: true; needsEmailConfirmation?: boolean }
  | { ok: false; message: string };

function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }
  if (m.includes("email not confirmed")) {
    return "Confirm your email before signing in. Check your inbox.";
  }
  if (m.includes("user already registered")) {
    return "An account with this email already exists. Try signing in.";
  }
  return message;
}

export async function signInAction(input: unknown): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg =
      first.email?.[0] ?? first.password?.[0] ?? "Please check the form and try again.";
    return { ok: false, message: msg };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email.trim(),
    password: parsed.data.password,
    // Forwarded only when the captcha widget produced one; Supabase ignores it
    // until captcha is enabled on the project, then requires it.
    ...(parsed.data.captchaToken ? { options: { captchaToken: parsed.data.captchaToken } } : {}),
  });

  if (error) {
    return { ok: false, message: mapAuthError(error.message) };
  }
  return { ok: true };
}

export async function signUpAction(
  input: unknown,
  // The caller's validated ?next return path. Threaded into the
  // confirmation email's redirect so a user who signed up mid-flow (a
  // started Pro checkout, a pending calculator save) lands back where
  // they started after confirming — not on the homepage with the intent
  // dropped. Re-validated server-side (internal paths only); omitted or
  // invalid falls back to "/", the pre-existing behavior.
  nextPath?: unknown
): Promise<AuthActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg =
      first.email?.[0] ??
      first.password?.[0] ??
      first.confirmPassword?.[0] ??
      "Please check the form and try again.";
    return { ok: false, message: msg };
  }

  const siteUrl = getSiteUrl();
  const next = safeInternalNextPath(nextPath);
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email.trim(),
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
      ...(parsed.data.captchaToken ? { captchaToken: parsed.data.captchaToken } : {}),
    },
  });

  if (error) {
    return { ok: false, message: mapAuthError(error.message) };
  }

  if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
    return {
      ok: false,
      message: "Unable to register with this email. Try signing in instead.",
    };
  }

  const needsEmailConfirmation = !data.session;
  return { ok: true, needsEmailConfirmation };
}

export async function requestPasswordResetAction(
  input: unknown
): Promise<AuthActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors.email?.[0] ?? "Enter a valid email.";
    return { ok: false, message: msg };
  }

  const siteUrl = getSiteUrl();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email.trim(), {
    redirectTo: `${siteUrl}/auth/callback?next=/auth/update-password`,
    ...(parsed.data.captchaToken ? { captchaToken: parsed.data.captchaToken } : {}),
  });

  if (error) {
    return { ok: false, message: mapAuthError(error.message) };
  }

  return { ok: true };
}

export async function updatePasswordAction(input: unknown): Promise<AuthActionResult> {
  const parsed = updatePasswordSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg =
      first.password?.[0] ??
      first.confirmPassword?.[0] ??
      "Please check the form and try again.";
    return { ok: false, message: msg };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      message: "Your reset link expired or is invalid. Request a new one from Forgot password.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, message: mapAuthError(error.message) };
  }

  return { ok: true };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
}

/**
 * Resend the signup-confirmation email. Used by the login form when a
 * user tries to sign in with an unconfirmed account, or when they lose
 * the original email (spam folder, typo'd address that auto-corrected).
 *
 * Always returns ok=true to avoid leaking which emails are registered —
 * Supabase no-ops silently on unknown / already-confirmed addresses.
 */
export async function resendConfirmationAction(
  input: unknown,
  // Same contract as signUpAction's nextPath: the resent confirmation
  // link keeps the caller's return address instead of hardcoding "/".
  nextPath?: unknown
): Promise<AuthActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors.email?.[0] ?? "Enter a valid email.";
    return { ok: false, message: msg };
  }

  const siteUrl = getSiteUrl();
  const next = safeInternalNextPath(nextPath);
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email.trim(),
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  // Supabase rate-limits resends; surface that case clearly. All other
  // errors are intentionally swallowed (don't leak account existence).
  if (error && /rate ?limit|too many/i.test(error.message)) {
    return {
      ok: false,
      message: "You've requested a few of these in a row. Wait a minute and try again.",
    };
  }

  return { ok: true };
}
