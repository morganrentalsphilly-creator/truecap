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
