/**
 * A client-side workspace mutation may finish after the user has navigated to
 * another deal. Comparing a submitted id with a closed-over prop cannot detect
 * that switch: both values came from the same render. Pair the id with the
 * currently-owned request token so A -> B -> A navigation and superseded
 * same-deal requests both fail closed.
 */
export function isCurrentDealWorkspaceMutation(input: {
  submittedDealId: string;
  /** `null` is the layout-cleanup state after the workspace unmounts. */
  currentDealId: string | null;
  requestToken: symbol;
  currentRequestToken: symbol | null;
}): boolean {
  return (
    input.submittedDealId === input.currentDealId &&
    input.requestToken === input.currentRequestToken
  );
}

/**
 * Async work owned by a mounted component instance must stop settling UI as
 * soon as that instance is replaced. The request token is installed
 * synchronously before IO and cleared by layout cleanup, so an old completion
 * cannot toast, mutate the next route, or clear a newer request's busy state.
 */
export function isCurrentMountedMutation(input: {
  requestToken: symbol;
  currentRequestToken: symbol | null;
}): boolean {
  return input.requestToken === input.currentRequestToken;
}
