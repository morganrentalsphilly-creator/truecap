import { Quote } from "lucide-react";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { formatPublishedMonth, ROLE_LABELS, type PublicTestimonial } from "@/lib/testimonials/rules";
import { listPublishedTestimonials } from "@/lib/testimonials/store";

/**
 * <Testimonials /> — published rows ONLY (status = 'published'): first name,
 * role, market, quote, month/year. With zero rows it renders NOTHING: no
 * placeholders, no teaser text, no empty stars. Any read failure (env
 * missing at build, table not applied yet) also renders nothing.
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
    <figure className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <Quote aria-hidden className="size-5 text-primary/40" />
      <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-foreground">
        &ldquo;{testimonial.quote}&rdquo;
      </blockquote>
      <figcaption className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
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
    <section aria-labelledby="testimonials-title" data-testimonials="" className={className}>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <h2
          id="testimonials-title"
          className="text-balance text-center text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
        >
          {heading}
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-muted-foreground">
          Each quote came from a signed-in user through the in-product prompt, with permission to publish their first name, role, and market.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((t) => (
            <TestimonialFigure key={t.id} testimonial={t} />
          ))}
        </div>
      </div>
    </section>
  );
}
