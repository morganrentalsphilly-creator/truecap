/**
 * Browser-only presentation binding for the anonymous first decision.
 *
 * The signed HttpOnly cookie remains the server authority. This snapshot only
 * prevents client-computed paid surfaces from staying open after the live form
 * has moved away from the exact inputs whose claim succeeded.
 */
export function bindAnonymousDecisionPresentationGrant(
  claimGranted: boolean,
  claimedFormSnapshot: string | null,
  currentFormSnapshot: string | null,
): string | null {
  return claimGranted &&
    claimedFormSnapshot !== null &&
    currentFormSnapshot === claimedFormSnapshot
    ? claimedFormSnapshot
    : null;
}

export function anonymousDecisionPresentationGrantMatches(
  grantedFormSnapshot: string | null,
  currentFormSnapshot: string | null,
): boolean {
  return (
    grantedFormSnapshot !== null && currentFormSnapshot === grantedFormSnapshot
  );
}

/**
 * Shown on the page when the claim comes back RATE_LIMITED: new no-signup
 * decisions are capped per hour for each network address (the cap lives in
 * app/actions/anonymous-decision.ts and is not restated here as a number).
 * It states the limit and the way to continue now; a new free account starts
 * the no-card trial, which includes complete decisions.
 */
export const ANONYMOUS_DECISION_HOURLY_LIMIT_MESSAGE =
  "This network has reached the hourly limit on new no-signup decisions. Create a free account to continue now, or try again within the hour.";
