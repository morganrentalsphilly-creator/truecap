/**
 * A client-side workspace mutation may finish after the user has navigated to
 * another deal. Comparing a submitted id with a closed-over prop cannot detect
 * that switch: both values came from the same render. Pair the id with the
 * currently-owned request token so A -> B -> A navigation and superseded
 * same-deal requests both fail closed.
 */
export function isCurrentDealWorkspaceMutation(input: {
  submittedDealId: string;
  currentDealId: string;
  requestToken: symbol;
  currentRequestToken: symbol | null;
}): boolean {
  return (
    input.submittedDealId === input.currentDealId &&
    input.requestToken === input.currentRequestToken
  );
}
