import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export const metadata: Metadata = {
  title: "Create new password",
  description: "Choose a strong password to secure your TrueCap account.",
  alternates: { canonical: "/auth/update-password" },
  robots: { index: false, follow: false },
};

function UpdatePasswordFallback() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading" />
    </div>
  );
}

export default function UpdatePasswordPage() {
  return (
    <AuthShell
      title="Create new password"
      description="Choose a strong password to secure your TrueCap account."
    >
      <Suspense fallback={<UpdatePasswordFallback />}>
        <UpdatePasswordForm />
      </Suspense>
    </AuthShell>
  );
}
