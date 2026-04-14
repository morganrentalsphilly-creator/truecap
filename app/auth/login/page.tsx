import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

function LoginFallback() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" aria-label="Loading" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Sign in"
      description="Use your email and password to access your saved deals and Pro features."
    >
      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
