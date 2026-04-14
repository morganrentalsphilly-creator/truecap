import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create account"
      description="Sign up to save deals and unlock Pro when you subscribe."
    >
      <SignUpForm />
    </AuthShell>
  );
}
