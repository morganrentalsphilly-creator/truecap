import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { PRODUCT_EVALUATION_DAYS } from "@/lib/product-access";
import { isAgentProConfigured } from "@/lib/stripe/plan-prices";

export const metadata: Metadata = {
  title: "Create account",
  description: `Create a TrueCap account to unlock your Offer Ceiling and start your ${PRODUCT_EVALUATION_DAYS}-day free Pro evaluation. No card.`,
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

/**
 * What an agent reads above the form after an Agent Pro CTA
 * (?plan=agent-pro). The default heading and lede speak to an investor ("your
 * full deal decision", "Pro evaluation"). Every sentence here is one the
 * agent has already read: the heading is the /for-agents H1, the lede is two
 * sentences from lib/agent-faqs.ts around a clause of the /for-agents hero
 * note (lib/__tests__/agent-signup-heading.test.ts holds them to those
 * sources). It says nothing about what the trial includes: the form below
 * prints that, with the sentence that the roster is not part of it.
 */
const AGENT_HEADING = "Send your investor clients deals that already pencil.";
const AGENT_LEDE =
  "Creating an account never asks for a card. Agent Pro is a separate plan for client workflows; checkout shows the exact charge before you confirm.";

type SignUpPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const agentProConfigured = isAgentProConfigured();
  // Copy only. The same test the form applies before it names Agent Pro
  // (components/auth/sign-up-form.tsx): the plan must be on sale and asked for.
  const planParam = (await searchParams).plan;
  const agentIntent =
    agentProConfigured &&
    (Array.isArray(planParam) ? planParam[0] : planParam) === "agent-pro";

  return (
    <AuthShell
      title={
        agentIntent
          ? AGENT_HEADING
          : "You're one step away from your full deal decision."
      }
      description={
        agentIntent
          ? AGENT_LEDE
          : "Create your account to unlock your Offer Ceiling, downside analysis, saved deals, and Pro evaluation. $0 today. No card required. Nothing automatically renews."
      }
      panelTitle="Know your walk-away price before you make the offer."
      panelDescription="Offer Ceiling. Downside analysis. Saved deals. Your work stays private."
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
