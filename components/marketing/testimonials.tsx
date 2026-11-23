import Link from "next/link";
import { PAGE_CONTAINER, Section, SectionHeading } from "@/components/marketing/section";
import { cn } from "@/lib/utils";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { formatPublishedMonth, ROLE_LABELS, type PublicTestimonial } from "@/lib/testimonials/rules";
import { listPublishedTestimonials } from "@/lib/testimonials/store";

/**
 * <Testimonials /> — published rows ONLY (status = 'published'): first name,
 * role, market, quote, month/year. With zero rows it renders NOTHING: no
 * placeholders, no teaser text, no empty stars. Any read failure (env
 * missing at build, table not applied yet) also renders nothing.
 *
 * Set as quotations on rules (DESIGN.md "Components": cards only for things
 * a visitor compares), with the attribution in the figcaption.
 */
export async function loadPublishedTestimonials(limit: number): Promise<PublicTestimonial[]> {
  try {
    return await listPublishedTestimonials(createAdminSupabaseClient(), limit);
  } catch {
    return [];
  }
}

function attribution(t: PublicTestimonial): string {
  const parts: string[] = [];
  if (t.firstName) parts.push(t.firstName);
  if (t.role) parts.push(ROLE_LABELS[t.role]);
  if (t.market) parts.push(t.market);
  return parts.join(" · ");
}

export function TestimonialFigure({ testimonial }: { testimonial: PublicTestimonial }) {
  const who = attribution(testimonial);
  const when = formatPublishedMonth(testimonial.publishedAt);
  return (
    <figure className="flex h-full flex-col border-t border-foreground pt-4">
      <blockquote className="flex-1 text-pretty text-lg leading-relaxed text-foreground">
        &ldquo;{testimonial.quote}&rdquo;
      </blockquote>
      <figcaption className="mt-4 text-sm text-muted-foreground">
        {who ? <span className="font-semibold text-foreground">{who}</span> : null}
        {who && when ? " · " : null}
        {when ? <time dateTime={testimonial.publishedAt}>{when}</time> : null}
      </figcaption>
    </figure>
  );
}

export async function Testimonials({
  limit = 3,
  heading = "From people who use it",
  className = "",
}: {
  limit?: number;
  heading?: string;
  className?: string;
}) {
  const rows = await loadPublishedTestimonials(limit);
  if (rows.length === 0) return null;
  return (
    <Section aria-labelledby="testimonials-title" data-testimonials="" className={className}>
      <SectionHeading id="testimonials-title">{heading}</SectionHeading>
      <p className="mt-3 max-w-[60ch] text-base text-muted-foreground">
        Each quote came from a signed-in user through the in-product prompt, with permission to publish their first name, role, and market.
      </p>
      <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((t) => (
          <TestimonialFigure key={t.id} testimonial={t} />
        ))}
      </div>
    </Section>
  );
}

/**
 * <QuoteStrip /> — the compact form of the same published rows (2026-11 ads
 * pass, D1): the most recent one or two, for the pages a paid click lands on
 * (/, /for-investors, /for-agents) and beside the sign-up form. It reads the
 * same source as <Testimonials /> (status = 'published' only) and follows
 * the same rule: with no rows, or on any read failure, it renders NOTHING,
 * not a heading, a rule or a placeholder.
 *
 * "band" is a full-width strip under a page hero, set on the page container
 * with one bottom line; "stacked" is a narrow column (the auth page).
 */
export async function QuoteStrip({
  limit = 2,
  variant = "band",
  className,
}: {
  limit?: number;
  variant?: "band" | "stacked";
  className?: string;
}) {
  const rows = await loadPublishedTestimonials(limit);
  if (rows.length === 0) return null;
  const quotes = (
    <>
      <div
        className={cn(
          "grid gap-x-10 gap-y-5",
          variant === "band" && rows.length > 1 ? "md:grid-cols-2" : null,
        )}
      >
        {rows.map((t) => {
          const who = attribution(t);
          const when = formatPublishedMonth(t.publishedAt);
          return (
            <figure key={t.id} className="min-w-0">
              <blockquote className="text-pretty text-base leading-relaxed text-foreground">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-1.5 text-sm text-muted-foreground">
                {who ? <span className="font-semibold text-foreground">{who}</span> : null}
                {who && when ? " · " : null}
                {when ? <time dateTime={t.publishedAt}>{when}</time> : null}
              </figcaption>
            </figure>
          );
        })}
      </div>
      <p className="mt-2 text-sm">
        <Link href="/reviews" className="tc-link inline-flex min-h-11 items-center">
          See verified proof &amp; methodology
        </Link>
      </p>
    </>
  );
  return variant === "band" ? (
    <section
      aria-label="From people who use it"
      data-quote-strip=""
      className={cn("border-b border-border bg-background", className)}
    >
      <div className={cn(PAGE_CONTAINER, "pb-2 pt-6")}>{quotes}</div>
    </section>
  ) : (
    <section
      aria-label="From people who use it"
      data-quote-strip=""
      className={cn("border-t border-border pt-5", className)}
    >
      {quotes}
    </section>
  );
}
