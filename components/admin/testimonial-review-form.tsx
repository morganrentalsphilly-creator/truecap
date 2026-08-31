"use client";

import { useState, useTransition } from "react";
import { updateTestimonialReviewAction } from "@/app/actions/admin-testimonials";

export function TestimonialReviewForm({
  id,
  initialStatus,
  initialVerificationStatus,
  initialPublicationStatus,
  initialAdministrativeNotes,
  withdrawn,
}: {
  id: string;
  initialStatus: "new" | "reviewed" | "rejected";
  initialVerificationStatus: "unverified" | "pending" | "verified" | "rejected";
  initialPublicationStatus:
    | "private"
    | "pending_approval"
    | "approved"
    | "rejected"
    | "revoked";
  initialAdministrativeNotes: string;
  withdrawn: boolean;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [verificationStatus, setVerificationStatus] = useState(
    initialVerificationStatus,
  );
  const [publicationStatus, setPublicationStatus] = useState(
    initialPublicationStatus,
  );
  const [administrativeNotes, setAdministrativeNotes] = useState(
    initialAdministrativeNotes,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-4 space-y-3 border-t border-border pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(null);
        startTransition(async () => {
          const result = await updateTestimonialReviewAction({
            id,
            status,
            verificationStatus,
            publicationStatus,
            administrativeNotes,
          });
          setMessage(result.ok ? "Review saved." : result.message);
        });
      }}
    >
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-xs font-semibold text-muted-foreground">
          Submission
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground"
          >
            <option value="new">New</option>
            <option value="reviewed">Reviewed</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Verification
          <select
            value={verificationStatus}
            onChange={(event) =>
              setVerificationStatus(
                event.target.value as typeof verificationStatus,
              )
            }
            className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground"
          >
            <option value="unverified">Unverified</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Publication
          <select
            value={publicationStatus}
            disabled={withdrawn}
            onChange={(event) =>
              setPublicationStatus(
                event.target.value as typeof publicationStatus,
              )
            }
            className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground disabled:opacity-60"
          >
            <option value="private">Private</option>
            <option value="pending_approval">Pending approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="revoked">Withdraw / revoke</option>
          </select>
        </label>
      </div>
      <label className="block text-xs font-semibold text-muted-foreground">
        Administrative notes (private)
        <textarea
          value={administrativeNotes}
          onChange={(event) => setAdministrativeNotes(event.target.value)}
          maxLength={4000}
          rows={3}
          className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm text-foreground"
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save private review"}
        </button>
        {message ? (
          <p
            role="status"
            className="text-xs font-semibold text-muted-foreground"
          >
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
