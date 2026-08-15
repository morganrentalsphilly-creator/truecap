import type { ReactNode } from "react";
import { Quote } from "lucide-react";

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
  /** Pass a consented customer image, product screenshot, or analysis view. */
  media?: ReactNode;
};

export function CaseStudy({ study }: { study: CaseStudyData }) {
  return (
    <article className={`grid overflow-hidden rounded-3xl border border-border bg-card shadow-sm ${study.media ? "lg:grid-cols-[1.1fr_0.9fr]" : ""}`}>
      <div className="p-6 sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
          {study.customerType}
          {study.portfolioSize ? ` · ${study.portfolioSize}` : ""}
        </p>
        <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">{study.customerName}</h3>
        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Challenge</dt>
            <dd className="mt-1 text-sm leading-relaxed text-foreground">{study.challenge}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Old workflow</dt>
            <dd className="mt-1 text-sm leading-relaxed text-foreground">{study.oldWorkflow}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">TrueCap workflow</dt>
            <dd className="mt-1 text-sm leading-relaxed text-foreground">{study.trueCapWorkflow}</dd>
          </div>
          {study.quantitativeResult ? (
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Verified result</dt>
              <dd className="mt-1 text-sm font-bold leading-relaxed text-primary">{study.quantitativeResult}</dd>
            </div>
          ) : null}
        </dl>
        {study.quote ? (
          <blockquote className="mt-6 flex gap-2.5 border-t border-border pt-5 text-sm leading-relaxed text-muted-foreground">
            <Quote className="mt-0.5 size-4 shrink-0 text-primary/40" aria-hidden />
            <span>&ldquo;{study.quote}&rdquo;</span>
          </blockquote>
        ) : null}
      </div>
      {study.media ? (
        <div className="flex min-h-56 items-center justify-center bg-muted/30 p-5">{study.media}</div>
      ) : null}
    </article>
  );
}

export function CaseStudiesSection({ studies }: { studies: readonly CaseStudyData[] }) {
  // Never put a visible "coming soon" placeholder on a proof surface. The
  // section appears only after verified, permissioned data is supplied.
  if (studies.length === 0) return null;
  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mb-9 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Customer workflows</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">From listing to decision.</h2>
        </div>
        {studies.map((study) => <CaseStudy key={study.id} study={study} />)}
      </div>
    </section>
  );
}
