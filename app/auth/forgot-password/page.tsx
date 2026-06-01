import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Enter your email and we will send you a secure link to reset your TrueCap password.",
  alternates: { canonical: "/auth/forgot-password" },
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset password"
      description="Enter your email and we will send you a secure link to reset your password."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
