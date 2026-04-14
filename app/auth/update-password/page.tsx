import { AuthShell } from "@/components/auth/auth-shell";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export default function UpdatePasswordPage() {
  return (
    <AuthShell
      title="Set new password"
      description="Choose a strong password you have not used here before."
    >
      <UpdatePasswordForm />
    </AuthShell>
  );
}
