export type ShareAuthRequestOwnership = {
  expectedUserId: string;
  authEpochAtSubmit: number;
  subjectAtSubmit: string;
  currentUserId: string | null;
  currentAuthEpoch: number;
  currentSubject: string | null;
};

/**
 * A public-share response is private account state. It can update the UI only
 * while the exact verified browser identity, auth epoch, and share subject
 * that launched it still own the mounted component.
 */
export function isCurrentShareAuthRequest({
  expectedUserId,
  authEpochAtSubmit,
  subjectAtSubmit,
  currentUserId,
  currentAuthEpoch,
  currentSubject,
}: ShareAuthRequestOwnership): boolean {
  return (
    currentUserId === expectedUserId &&
    currentAuthEpoch === authEpochAtSubmit &&
    currentSubject === subjectAtSubmit
  );
}

/** Server-side companion for actions that must never cross an account switch. */
export function isExpectedShareOwner(
  expectedUserId: string,
  currentUserId: string,
): boolean {
  return expectedUserId === currentUserId;
}
