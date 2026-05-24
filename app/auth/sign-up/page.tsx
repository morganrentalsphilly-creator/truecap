import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";

function SignUpFallback() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" aria-label="Loading" />
    </div>
  );
}

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create account"
      description="Sign up to save deals and unlock Pro when you subscribe."
    >
      {/* Suspense boundary is required because SignUpForm (via the
          embedded GoogleAuthButton) calls useSearchParams. Next 16
          treats unbounded useSearchParams as a build error. */}
      <Suspense fallback={<SignUpFallback />}>
        <SignUpForm />
      </Suspense>
    </AuthShell>
  );
}
