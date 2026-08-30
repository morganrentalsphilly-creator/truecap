export type ProfileMutationOwnership = {
  mounted: boolean;
  expectedUserId: string;
  currentUserId: string | null;
  authEpochAtSubmit: number;
  currentAuthEpoch: number;
  requestToken: symbol;
  currentRequestToken: symbol | null;
};

/**
 * Profile responses can mutate global account UI, navigation, and avatar
 * storage. Accept them only for the mounted request and exact verified owner
 * that launched the save.
 */
export function isCurrentProfileMutation({
  mounted,
  expectedUserId,
  currentUserId,
  authEpochAtSubmit,
  currentAuthEpoch,
  requestToken,
  currentRequestToken,
}: ProfileMutationOwnership): boolean {
  return (
    mounted &&
    currentUserId === expectedUserId &&
    currentAuthEpoch === authEpochAtSubmit &&
    currentRequestToken === requestToken
  );
}
