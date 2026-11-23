import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { SignUpHeading } from "@/components/auth/sign-up-heading";
import { QuoteStrip } from "@/components/marketing/testimonials";
import { PRODUCT_EVALUATION_DAYS } from "@/lib/product-access";
import { isAgentProConfigured } from "@/lib/stripe/plan-prices";

export const metadata: Metadata = {
  title: "Create account",
  description: `Create a TrueCap account to save your deals and start your ${PRODUCT_EVALUATION_DAYS}-day free trial. No card.`,
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
 * The headline by context (2026-11 ads pass, B2). A visitor with a pending
 * analysis reads "Save <street address> to a free account" (SignUpHeading
 * swaps it in from the browser's own draft); one who arrived with a plan
 * from pricing reads the trial headline; everyone else the plain one. The
 * page no longer promises to unlock a figure that most visitors who reach it
 * have just read.
 */
const TRIAL_HEADING = `Start your ${PRODUCT_EVALUATION_DAYS}-day free trial`;
const DEFAULT_HEADING = "Create your free account";
/** The one line under the headline; the trial's details sit in the form's
 *  "What the trial includes" disclosure. */
const LEDE = "No card. Nothing renews automatically.";

/**
 * What an agent reads above the form after an Agent Pro CTA
 * (?plan=agent-pro). The default headings speak to an investor, and the
 * trial headline would promise an agent a trial of Agent Pro, which the
 * trial does not include. Every sentence here is one the
 * agent has already read: the heading is the /for-agents H1, the lede is two
 * sentences from lib/agent-faqs.ts around a clause of the /for-agents hero
 * note (lib/__tests__/agent-signup-heading.test.ts holds them to those
 * sources). It says nothing about what the trial includes: the form below
 * prints that, with the sentence that the roster is not part of it.
 */
const AGENT_HEADING = "One listing. Each client's numbers.";
const AGENT_LEDE =
  "Creating an account never asks for a card. Client workspaces require Agent Pro; checkout shows the exact charge before you confirm.";

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
  // Any other plan parameter is the Pro CTA on /pricing or the homepage.
  const arrivedFromPlan = planParam !== undefined && !agentIntent;

  return (
    <AuthShell
      title={
        <SignUpHeading
          fallback={
            agentIntent
              ? AGENT_HEADING
              : arrivedFromPlan
                ? TRIAL_HEADING
                : DEFAULT_HEADING
          }
        />
      }
      description={agentIntent ? AGENT_LEDE : LEDE}
      // One side panel for every visitor, so it names no audience: "the Buy
      // Box" is the client's for an agent and their own for an investor.
      panelTitle="Know the highest price that still meets the Buy Box."
      panelDescription="Offer Ceiling. Downside analysis. Saved deals. Your work stays private."
    >
      {/* Suspense boundary is required because SignUpForm (via the
          embedded GoogleAuthButton) calls useSearchParams. Next 16
          treats unbounded useSearchParams as a build error. */}
      <Suspense fallback={<SignUpFallback />}>
        <SignUpForm agentProConfigured={agentProConfigured} />
      </Suspense>
      {/* Consented quotes, under the form so the buttons never move; renders
          nothing until published rows exist. */}
      <Suspense fallback={null}>
        <QuoteStrip variant="stacked" className="mt-10" />
      </Suspense>
    </AuthShell>
  );
}
