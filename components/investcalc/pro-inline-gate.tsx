"use client";

/**
 * Inline Pro-feature gate used for cards that sit in the main column of
 * the analysis dashboard (MaxOfferCard, SensitivityGrid, etc.) — i.e.
 * features that aren't tab-gated.
 *
 * Renders a teaser card that hints at the value (title + value-prop
 * line) and routes the user to /pricing on click. Designed to drive
 * conversion at the moment the user would have seen the feature, not
 * to hide its existence.
 */

import { ArrowRight, Lock, Sparkles } from "lucide-react";
import Link from "next/link";

interface ProInlineGateProps {
  /** Brand-color icon at the top — same icon as the gated feature uses. */
  icon: React.ComponentType<{ className?: string }>;
  /** Headline of the gated feature, e.g. "Max Allowable Offer". */
  title: string;
  /** One-line description of what the user would see if unlocked. */
  description: string;
  /** Compact "preview" pill values — make the feature feel tangible. */
  previewBullets: string[];
}

export function ProInlineGate({ icon: Icon, title, description, previewBullets }: ProInlineGateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-primary/25 bg-gradient-to-br from-[var(--brand-blue-light)] via-card to-card p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Icon className="size-4" />
          </span>
          <div>
            <p className="text-base font-bold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-primary-foreground">
          <Lock className="size-2.5" />
          Pro
        </span>
      </div>

      {/* Preview bullets — make the gated feature feel tangible */}
      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {previewBullets.map((bullet) => (
          <li
            key={bullet}
            className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground/70"
          >
            {bullet}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Link
        href="/pricing"
        className="group mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
      >
        <Sparkles className="size-4" />
        Unlock with Pro
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
