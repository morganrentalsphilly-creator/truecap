import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

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
