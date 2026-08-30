/**
 * /admin/testimonials — founder review queue for testimonial submissions.
 *
 * Lists raw submissions from the in-product prompt
 * (permissioned_testimonial_submissions, service-role only). The legacy
 * testimonial_submissions table remains untouched and is not a source for this
 * workflow. Publication is a MANUAL promotion: verify the quote with the
 * customer, record approval, and confirm it has not been withdrawn; only then
 * add a VerifiedTestimonial record to
 * lib/proof-records.ts with verification + approval — the homepage,
 * /reviews, and /for-agents surfaces light up from that registry
 * automatically. This page renders a copy-ready record skeleton per
 * submission to make that promotion a paste-and-fill.
 *
 * Guarded by checkAdmin() (ADMIN_EMAILS env, founder fallback), noindex.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { checkAdmin } from "@/lib/admin-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { TestimonialReviewForm } from "@/components/admin/testimonial-review-form";
import {
  formatTestimonialDisplayName,
  type TestimonialDisplayNameFormat,
} from "@/lib/testimonial-display-name";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Testimonial review",
  robots: { index: false, follow: false },
};

type SubmissionRow = {
  id: string;
  user_id: string | null;
  quote: string | null;
  display_name: string | null;
  preferred_display_name_format: TestimonialDisplayNameFormat;
  role_segment: string | null;
  consent_to_publish: boolean;
  permission_granted_at: string | null;
  source_event: string;
  status: string;
  verification_status: "unverified" | "pending" | "verified" | "rejected";
  publication_status:
    | "private"
    | "pending_approval"
    | "approved"
    | "rejected"
    | "revoked";
  approved_at: string | null;
  administrative_notes: string | null;
  withdrawn_at: string | null;
  created_at: string;
};

function promotionSkeleton(row: SubmissionRow): string {
  const archetype =
    row.role_segment === "agent"
      ? "investor-focused-agent"
      : row.role_segment === "house_hacker"
        ? "newer-investor-house-hacker"
        : "active-investor";
  const approvedDisplayName = formatTestimonialDisplayName(
    row.display_name,
    row.preferred_display_name_format,
  );
  return `{
  id: "${row.id}",
  archetype: "${archetype}",
  quote: ${JSON.stringify(row.quote ?? "")},
  customerName: ${JSON.stringify(approvedDisplayName ?? "FILL ME")},
  customerType: "${row.role_segment ?? "investor"}",
  sourceChannel: "survey",
  observedAt: "${row.created_at.slice(0, 10)}",
  withdrawnAt: undefined,
  verification: {
    status: "verified",
    verifiedAt: "YYYY-MM-DD",
    verifiedBy: "Morgan",
    evidenceRef: "email thread / call note ref",
  },
  approval: {
    publicDisplay: true,
    approvedAt: "YYYY-MM-DD",
    scope: ["quote", "attribution"],
    homepage: true,
    ads: false,
    caseStudy: false,
  },
},`;
}

function isPromotionEligible(row: SubmissionRow): boolean {
  return Boolean(
    row.quote &&
    row.consent_to_publish &&
    row.permission_granted_at &&
    row.verification_status === "verified" &&
    row.publication_status === "approved" &&
    row.approved_at &&
    !row.withdrawn_at,
  );
}

export default async function AdminTestimonialsPage() {
  const adminCheck = await checkAdmin();
  if (!adminCheck.ok) notFound();

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("permissioned_testimonial_submissions")
    .select(
      "id, user_id, quote, display_name, preferred_display_name_format, role_segment, consent_to_publish, permission_granted_at, source_event, status, verification_status, publication_status, approved_at, administrative_notes, withdrawn_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data as SubmissionRow[] | null) ?? [];

  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
        Testimonial submissions
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Raw prompt answers, newest first. Review and record permission,
        verification, approval, private notes, and any withdrawal here. An
        eligible quote still requires a deliberate manual promotion into{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          lib/proof-records.ts
        </code>{" "}
        (VERIFIED_TESTIMONIALS, or VERIFIED_AGENT_PROOF for agents) and fill the
        verification/approval fields. Surfaces light up automatically.
      </p>
      {error ? (
        <p className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Could not load submissions ({error.code ?? "unknown"}). Apply
          20260829110000_testimonial_workflow_hardening.sql for the separate,
          additive permissioned workflow table and auditable publication gate.
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-6 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          No submissions yet. The prompt fires after a PDF export or a third
          saved deal, once per browser.
        </p>
      ) : (
        <ul className="mt-6 space-y-5">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>{new Date(row.created_at).toLocaleDateString()}</span>
                <span>· {row.source_event}</span>
                <span>· {row.status}</span>
                <span>· {row.verification_status}</span>
                <span>· {row.publication_status}</span>
                <span
                  className={
                    row.consent_to_publish
                      ? "rounded-full bg-[var(--metric-positive)]/15 px-2 py-0.5 text-[var(--metric-positive)]"
                      : "rounded-full bg-muted px-2 py-0.5"
                  }
                >
                  {row.consent_to_publish
                    ? "consented to publish"
                    : "no publish consent"}
                </span>
                {row.user_id ? (
                  <span>· has account</span>
                ) : (
                  <span>· anonymous</span>
                )}
              </div>
              {row.quote ? (
                <blockquote className="mt-3 text-sm leading-relaxed text-foreground">
                  &ldquo;{row.quote}&rdquo;
                </blockquote>
              ) : (
                <p className="mt-3 text-sm italic text-muted-foreground">
                  No quote submitted.
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                — {row.display_name ?? "(no name)"}
                {row.role_segment ? `, ${row.role_segment}` : ""}
                {` · ${row.preferred_display_name_format}`}
              </p>
              {isPromotionEligible(row) ? (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-bold text-primary">
                    Copy-ready proof-records skeleton
                  </summary>
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 text-[11px] leading-relaxed">
                    {promotionSkeleton(row)}
                  </pre>
                </details>
              ) : null}
              <TestimonialReviewForm
                id={row.id}
                initialStatus={
                  row.status === "reviewed" || row.status === "rejected"
                    ? row.status
                    : "new"
                }
                initialVerificationStatus={row.verification_status}
                initialPublicationStatus={row.publication_status}
                initialAdministrativeNotes={row.administrative_notes ?? ""}
                withdrawn={Boolean(row.withdrawn_at)}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
