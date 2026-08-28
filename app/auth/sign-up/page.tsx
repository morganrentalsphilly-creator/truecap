import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { isAgentProConfigured } from "@/lib/stripe/plan-prices";

export const metadata: Metadata = {
  title: "Create account",
  description:
    "Create a TrueCap account for a 21-day, no-card product evaluation.",
  alternates: { canonical: "/auth/sign-up" },
  robots: { index: false, follow: false },
};

function SignUpFallback() {
  return (
    <div className="flex justify-center py-12">
      <Loader2
        className="w-8 h-8 animate-spin text-muted-foreground"
        aria-label="Loading"
      />
    </div>
  );
}

export default function SignUpPage() {
  const agentProConfigured = isAgentProConfigured();

  return (
    <AuthShell
      title="Create account"
      description="Keep this decision and evaluate three Pro deals plus one comparison. No card, no scheduled charge."
    >
      {/* Suspense boundary is required because SignUpForm (via the
          embedded GoogleAuthButton) calls useSearchParams. Next 16
          treats unbounded useSearchParams as a build error. */}
      <Suspense fallback={<SignUpFallback />}>
        <SignUpForm agentProConfigured={agentProConfigured} />
      </Suspense>
    </AuthShell>
  );
}
