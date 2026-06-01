import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export const metadata: Metadata = {
  title: "Create new password",
  description: "Choose a strong password to secure your TrueCap account.",
  alternates: { canonical: "/auth/update-password" },
  robots: { index: false, follow: false },
};

export default function UpdatePasswordPage() {
  return (
    <AuthShell
      title="Create new password"
      description="Choose a strong password to secure your Truecap account."
    >
      <UpdatePasswordForm />
    </AuthShell>
  );
}
