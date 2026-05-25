"use client";

/**
 * Newsletter Signup form — two variants, one component.
 *
 *   - <NewsletterSignup variant="compact" /> for the site footer
 *   - <NewsletterSignup variant="expanded" /> for the bottom of blog posts
 *
 * Both wrap the same server action. They differ only in copy, spacing,
 * and the trust-line position. State machine is shared:
 *
 *   idle → submitting → success
 *                    → error (recoverable, can retry)
 *
 * Success state replaces the form with a quiet confirmation so the
 * user knows it worked without a toast (toasts get dismissed too fast
 * for the "did anything happen?" moment after subscribing).
 */
import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import {
  subscribeToNewsletterAction,
  type NewsletterSubscribeInput,
} from "@/app/actions/newsletter";

type Variant = "compact" | "expanded";

export function NewsletterSignup({
  variant = "compact",
  source = "other",
}: {
  variant?: Variant;
  source?: NewsletterSubscribeInput["source"];
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const result = await subscribeToNewsletterAction({ email, source });
      if (result.ok) {
        setSuccessMessage(result.message);
        setEmail("");
        return;
      }
      setError(result.message);
    });
  };

  if (successMessage) {
    return (
      <div
        className={
          variant === "compact"
            ? "rounded-2xl border border-[var(--brand-green)]/30 bg-[var(--brand-green-light)] p-4 text-sm"
            : "rounded-2xl border border-[var(--brand-green)]/30 bg-[var(--brand-green-light)] p-5 sm:p-6 text-sm"
        }
        role="status"
        aria-live="polite"
      >
        <p className="flex items-start gap-2 text-foreground">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--brand-green)]" />
          <span>{successMessage}</span>
        </p>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <section
        aria-labelledby="newsletter-compact-heading"
        className="rounded-2xl border border-border bg-card p-4"
      >
        <h3
          id="newsletter-compact-heading"
          className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
        >
          Monthly investor digest
        </h3>
        <p className="mt-1.5 text-sm leading-snug text-muted-foreground">
          Market notes + new analysis. One email a month. Unsubscribe anytime.
        </p>
        <form onSubmit={onSubmit} noValidate className="mt-3 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="newsletter-email-compact" className="sr-only">
            Email
          </label>
          <input
            id="newsletter-email-compact"
            type="email"
            required
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="submit"
            disabled={isPending || !email}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
            Subscribe
          </button>
        </form>
        {error ? (
          <p className="mt-2 text-[11px] text-[var(--metric-negative,#dc2626)]" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    );
  }

  // Expanded — for the bottom of blog posts
  return (
    <section
      aria-labelledby="newsletter-expanded-heading"
      className="my-12 rounded-2xl border border-primary/20 bg-gradient-to-br from-[var(--brand-blue-light)] via-card to-card p-6 sm:p-8"
    >
      <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary mb-3">
        <Mail className="size-3" />
        Monthly digest
      </div>
      <h3
        id="newsletter-expanded-heading"
        className="text-xl sm:text-2xl font-black text-foreground leading-tight"
      >
        Want this kind of analysis in your inbox?
      </h3>
      <p className="mt-2 max-w-xl text-sm sm:text-base leading-relaxed text-muted-foreground">
        One email a month. The chart that actually moved, new long-form
        posts like this one, and the rate / rent / market notes for the
        cities TrueCap covers. No fluff, no daily spam. Unsubscribe
        anytime.
      </p>
      <form onSubmit={onSubmit} noValidate className="mt-5 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="newsletter-email-expanded" className="sr-only">
          Email
        </label>
        <input
          id="newsletter-email-expanded"
          type="email"
          required
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          type="submit"
          disabled={isPending || !email}
          className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(82,72,212,0.28)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
          Subscribe
        </button>
      </form>
      {error ? (
        <p className="mt-2 text-xs text-[var(--metric-negative,#dc2626)]" role="alert">
          {error}
        </p>
      ) : null}
      <p className="mt-3 text-[11px] text-muted-foreground">
        We respect your inbox. One email a month, no resold lists, easy
        unsubscribe.
      </p>
    </section>
  );
}
