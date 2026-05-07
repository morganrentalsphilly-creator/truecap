import { AuthShell } from "@/components/auth/auth-shell";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

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
