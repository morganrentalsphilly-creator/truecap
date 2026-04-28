"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, CreditCard, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import {
  createBillingPortalSessionAction,
  createCheckoutSessionAction,
} from "@/app/actions/billing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type BillingPlan = {
  slug: "pro_monthly" | "pro_annual";
  title: string;
  intervalLabel: string;
  priceLabel: string;
  badge?: string;
  description: string;
  features: string[];
};

type CurrentSubscription = {
  status: string;
  planSlug: string | null;
  planName: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
} | null;

type BillingPanelProps = {
  currentSubscription: CurrentSubscription;
  plans: BillingPlan[];
};

function statusLabel(status?: string | null): string {
  if (!status) return "Free";
  if (status === "trialing") return "Trialing";
  if (status === "active") return "Active";
  if (status === "past_due") return "Past due";
  if (status === "canceled") return "Canceled";
  return status.replaceAll("_", " ");
}

function formatDate(value?: string | null): string {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function BillingPanel({ currentSubscription, plans }: BillingPanelProps) {
  const { toast } = useToast();
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  const [isPortalPending, startPortalTransition] = useTransition();

  const activePlanSlug =
    currentSubscription &&
    ["active", "trialing", "past_due"].includes(currentSubscription.status)
      ? currentSubscription.planSlug
      : null;

  const currentPlanTitle = useMemo(() => {
    if (!currentSubscription || !activePlanSlug) return "Free";
    return currentSubscription.planName;
  }, [activePlanSlug, currentSubscription]);

  const handleCheckout = (planSlug: BillingPlan["slug"]) => {
    setPendingPlan(planSlug);
    void (async () => {
      const result = await createCheckoutSessionAction({ planSlug });
      setPendingPlan(null);
      if (!result.ok) {
        toast({
          title: "Could not start checkout",
          description: result.message,
          variant: "destructive",
        });
        return;
      }
      window.location.href = result.url;
    })();
  };

  const handlePortal = () => {
    startPortalTransition(async () => {
      const result = await createBillingPortalSessionAction();
      if (!result.ok) {
        toast({
          title: "Could not open billing portal",
          description: result.message,
          variant: "destructive",
        });
        return;
      }
      window.location.href = result.url;
    });
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Billing</h2>
        <p className="text-muted-foreground mt-1">
          Choose a Pro plan or manage your current subscription.
        </p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Current plan
            </CardTitle>
            <CardDescription>
              {currentSubscription?.cancelAtPeriodEnd
                ? `Access stays active until ${formatDate(currentSubscription.currentPeriodEnd)}.`
                : `Renews or updates on ${formatDate(currentSubscription?.currentPeriodEnd)}.`}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full bg-primary/10 text-primary border border-primary/15">
              {currentPlanTitle}
            </Badge>
            <Badge variant="outline" className="rounded-full capitalize">
              {statusLabel(currentSubscription?.status)}
            </Badge>
            {currentSubscription?.cancelAtPeriodEnd ? (
              <Badge className="rounded-full border border-amber-200 bg-amber-100 text-amber-700">
                Cancels at period end
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={handlePortal}
            disabled={isPortalPending || !currentSubscription}
          >
            {isPortalPending ? <Loader2 className="animate-spin" /> : <CreditCard />}
            Manage billing
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {plans.map((plan) => {
          const isCurrent = activePlanSlug === plan.slug;
          const isPending = pendingPlan === plan.slug;
          return (
            <Card
              key={plan.slug}
              className={cn(
                "rounded-2xl overflow-hidden",
                isCurrent ? "border-primary/50 shadow-sm" : "border-border"
              )}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle>{plan.title}</CardTitle>
                      {plan.badge ? (
                        <Badge className="rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                          {plan.badge}
                        </Badge>
                      ) : null}
                    </div>
                    <CardDescription className="mt-1">{plan.description}</CardDescription>
                  </div>
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="pt-2">
                  <span className="text-4xl font-black tracking-tight">{plan.priceLabel}</span>
                  <span className="text-muted-foreground"> / {plan.intervalLabel}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  className="w-full rounded-xl"
                  variant={isCurrent ? "outline" : "default"}
                  disabled={isCurrent || isPending}
                  onClick={() => handleCheckout(plan.slug)}
                >
                  {isPending ? <Loader2 className="animate-spin" /> : null}
                  {isCurrent ? "Current plan" : "Subscribe"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
