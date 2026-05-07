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
      title="Welcome back"
      description="Sign in to access your saved deals, Pro tools, and personalized insights."
    >
      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
