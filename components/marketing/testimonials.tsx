import { Section, SectionHeading } from "@/components/marketing/section";
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
    <figure className="flex h-full flex-col border-t-2 border-foreground pt-4">
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
