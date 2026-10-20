import type { ReactNode } from "react";
import type { ProofVerification, PublicationApproval } from "@/lib/proof-records";
import { Section, SectionHeading } from "@/components/marketing/section";
import { isPublicationReady } from "@/lib/proof-records";

export type CaseStudyData = {
  id: string;
  customerName: string;
  customerType: string;
  portfolioSize?: string;
  challenge: string;
  oldWorkflow: string;
  trueCapWorkflow: string;
  quantitativeResult?: string;
  quote?: string;
  sourceChannel: "interview" | "email" | "support" | "survey";
  observedAt: string;
  verification: ProofVerification;
  approval: PublicationApproval;
  /** Pass a consented customer image, product screenshot, or analysis view. */
  media?: ReactNode;
};

export function CaseStudy({ study }: { study: CaseStudyData }) {
  return (
    <article
      className={`grid gap-x-12 gap-y-6 border-t border-foreground pt-6 ${study.media ? "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]" : ""}`}
    >
      <div className="min-w-0">
        <p className="font-mono text-xs text-muted-foreground">
          {study.customerType}
          {study.portfolioSize ? ` · ${study.portfolioSize}` : ""}
        </p>
        <h3 className="mt-2 font-display text-balance text-h3-sm text-foreground sm:text-2xl">{study.customerName}</h3>
        <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <div className="border-t border-border pt-3">
            <dt className="text-xs font-medium text-muted-foreground">Challenge</dt>
            <dd className="mt-1 text-pretty text-base leading-relaxed text-foreground">{study.challenge}</dd>
          </div>
          <div className="border-t border-border pt-3">
            <dt className="text-xs font-medium text-muted-foreground">Old workflow</dt>
            <dd className="mt-1 text-pretty text-base leading-relaxed text-foreground">{study.oldWorkflow}</dd>
          </div>
          <div className="border-t border-border pt-3">
            <dt className="text-xs font-medium text-muted-foreground">TrueCap workflow</dt>
            <dd className="mt-1 text-pretty text-base leading-relaxed text-foreground">{study.trueCapWorkflow}</dd>
          </div>
          {study.quantitativeResult ? (
            <div className="border-t border-border pt-3">
              <dt className="text-xs font-medium text-muted-foreground">Verified result</dt>
              <dd className="mt-1 font-figure text-base font-semibold leading-relaxed text-foreground">{study.quantitativeResult}</dd>
            </div>
          ) : null}
        </dl>
        {study.quote ? (
          <blockquote className="mt-6 border-t border-border pt-4 text-pretty text-base leading-relaxed text-muted-foreground">
            &ldquo;{study.quote}&rdquo;
          </blockquote>
        ) : null}
      </div>
      {study.media ? <div className="min-w-0">{study.media}</div> : null}
    </article>
  );
}

export function CaseStudiesSection({ studies }: { studies: readonly CaseStudyData[] }) {
  const publishable = studies.filter((study) => isPublicationReady(study, "caseStudy"));
  if (publishable.length === 0) return null;
  return (
    <Section aria-labelledby="case-studies-heading">
      <SectionHeading id="case-studies-heading">From listing to decision.</SectionHeading>
      <div className="mt-8 space-y-10">
        {publishable.map((study) => <CaseStudy key={study.id} study={study} />)}
      </div>
    </Section>
  );
}
