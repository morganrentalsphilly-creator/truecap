import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/investcalc/header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { TestimonialForm } from "@/components/marketing/testimonial-prompt";
import { getRequestUser } from "@/lib/request-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { resolveFeedbackFormToken } from "@/lib/testimonials/store";

/**
 * /feedback/testimonial?token=… — the page the feedback-request email links
 * to. The token maps to the emailed user; the same consent form as the
 * in-product prompt is rendered when that user is signed in (the server
 * action stores the note against the account, never against a token).
 */
export const metadata: Metadata = {
  title: "One question about TrueCap",
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export const dynamic = "force-dynamic";

export default async function FeedbackTestimonialPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const token = typeof params.token === "string" ? params.token : "";
  const user = await getRequestUser();
  let tokenUserId: string | null = null;
  if (token) {
    try {
      tokenUserId = await resolveFeedbackFormToken(createAdminSupabaseClient(), token);
    } catch {
      tokenUserId = null;
    }
  }
  const matches = Boolean(user && tokenUserId && user.id === tokenUserId);

  return (
    <>
      <Header initialUser={user} initialEntitlements={null} />
      <main id="main" className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary">One question</p>
        <h1 className="mt-2 text-balance text-3xl font-extrabold tracking-tight text-foreground">
          What did TrueCap change about how you evaluate deals?
        </h1>
        {!tokenUserId ? (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            This link isn&apos;t valid. If you got here from an email, open the link in that email again.
          </p>
        ) : !user ? (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Sign in to answer — it takes 30 seconds and your note is stored with your account.{" "}
            <Link
              href={`/auth/login?next=${encodeURIComponent(`/feedback/testimonial?token=${token}`)}`}
              className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
            >
              Log in →
            </Link>
          </p>
        ) : !matches ? (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            This link was sent to a different account. Sign in with the address that received the email.
          </p>
        ) : (
          <div className="mt-6">
            <TestimonialForm trigger="email_link" />
          </div>
        )}
      </main>
      <SiteFooter hideAccountLinks={Boolean(user)} />
    </>
  );
}
