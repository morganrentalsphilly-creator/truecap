/**
 * TestimonialCard + TestimonialStrip — display components for VERIFIED
 * proof records only.
 *
 * Both render exclusively from lib/proof-records.ts records that pass
 * isPublicationReady() for the given placement, and the strip returns null
 * at zero records — so mounting these anywhere is safe before any
 * testimonial exists, and nothing fake can ever render (the registries are
 * typed, verified, and customer-approved by construction).
 *
 * Server components: pure render, no state.
 */

import { Quote } from "lucide-react";
import {
  VERIFIED_TESTIMONIALS,
  VERIFIED_AGENT_PROOF,
  isPublicationReady,
  type VerifiedTestimonial,
} from "@/lib/proof-records";

const ARCHETYPE_LABELS: Record<VerifiedTestimonial["archetype"], string> = {
  "active-investor": "Active investor",
  "investor-focused-agent": "Investor-focused agent",
  "newer-investor-house-hacker": "House hacker",
};

function metricLine(record: VerifiedTestimonial): string | null {
  const parts: string[] = [];
  if (record.dealsScreened) parts.push(`${record.dealsScreened} deals screened`);
  if (record.offersMade) parts.push(`${record.offersMade} offers made`);
  if (record.transactionsClosed) parts.push(`${record.transactionsClosed} closed`);
  if (
    record.timePerDealBeforeMinutes &&
    record.timePerDealAfterMinutes &&
    record.timePerDealAfterMinutes < record.timePerDealBeforeMinutes
  ) {
    parts.push(
      `${record.timePerDealBeforeMinutes} → ${record.timePerDealAfterMinutes} min per deal`
    );
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function TestimonialCard({ record }: { record: VerifiedTestimonial }) {
  const metrics = metricLine(record);
  return (
    <figure className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <Quote aria-hidden className="size-5 text-primary/40" />
      <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-foreground">
        &ldquo;{record.quote}&rdquo;
      </blockquote>
      <figcaption className="mt-4 border-t border-border pt-3">
        <p className="text-sm font-bold text-foreground">{record.customerName}</p>
        <p className="text-xs text-muted-foreground">
          {ARCHETYPE_LABELS[record.archetype]}
          {record.portfolioSize ? ` · ${record.portfolioSize}` : ""}
        </p>
        {metrics ? (
          <p className="mt-1 text-[11px] font-semibold text-primary">{metrics}</p>
        ) : null}
      </figcaption>
    </figure>
  );
}

/**
 * Heading + strip wrapper that hides ENTIRELY at zero published records —
 * use this when the surrounding page shouldn't show an orphaned heading.
 */
export function AgentProofSection() {
  const publishable = VERIFIED_AGENT_PROOF.filter((record) =>
    isPublicationReady(record, "homepage")
  );
  if (publishable.length === 0) return null;
  return (
    <section className="mb-12 sm:mb-16">
      <h2 className="mb-2 text-2xl font-extrabold text-foreground sm:text-3xl">
        Agents on TrueCap
      </h2>
      <p className="mb-6 text-base leading-relaxed text-muted-foreground">
        Verified quotes from investor-focused agents — published only with
        their approval.
      </p>
      <TestimonialStrip segment="agent" limit={3} />
    </section>
  );
}

export function TestimonialStrip({
  segment = "all",
  limit = 3,
  placement = "homepage",
}: {
  segment?: "all" | "agent";
  limit?: number;
  placement?: "homepage" | "ads" | "caseStudy";
}) {
  const pool =
    segment === "agent" ? VERIFIED_AGENT_PROOF : VERIFIED_TESTIMONIALS;
  const publishable = pool
    .filter((record) => isPublicationReady(record, placement))
    .slice(0, limit);
  if (publishable.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {publishable.map((record) => (
        <TestimonialCard key={record.id} record={record} />
      ))}
    </div>
  );
}
