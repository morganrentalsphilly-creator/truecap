const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const ACCOUNT_SESSION_CHANGED_MESSAGE =
  "Your signed-in account changed. Reload this page and try again.";

/**
 * Exact tenant binding for a mutation launched from server-rendered account
 * state. The expected id is consistency evidence, never authorization: every
 * action must still resolve the current user and scope its queries normally.
 */
export function expectedAccountUserMatches(
  expectedUserId: unknown,
  currentUserId: string,
): boolean {
  return (
    typeof expectedUserId === "string" &&
    UUID_PATTERN.test(expectedUserId) &&
    expectedUserId === currentUserId
  );
}

export function accountSessionChangedResult() {
  return {
    ok: false,
    code: "SESSION_CHANGED",
    message: ACCOUNT_SESSION_CHANGED_MESSAGE,
  } as const;
}

export function accountSessionIdentityChanged(
  expectedUserId: string,
  observedUserId: string | null,
): boolean {
  return expectedUserId !== observedUserId;
}

type AccountSessionVerification =
  | { ok: true; userId: string }
  | {
      ok: false;
      reason: "signed_out" | "identity_mismatch" | "unavailable";
    };

/** A transient auth/network failure must never turn a valid server session
 * into a reload loop. Only a verified different identity or a conclusive
 * signed-out/mismatched session asks the app shell to rebuild. */
export function accountSessionVerificationRequiresReload(
  expectedUserId: string,
  verification: AccountSessionVerification,
): boolean {
  if (verification.ok) return verification.userId !== expectedUserId;
  return verification.reason !== "unavailable";
}

export function isCurrentAccountMutation(input: {
  expectedUserId: string;
  authEpochAtSubmit: number;
  currentUserId: string | null;
  currentAuthEpoch: number;
}): boolean {
  return (
    input.currentUserId === input.expectedUserId &&
    input.currentAuthEpoch === input.authEpochAtSubmit
  );
}
