const PROFILE_AVATAR_PUBLIC_PATH =
  "/storage/v1/object/public/profile-avatars/";

/**
 * Profile avatars are public, but a profile must only point at an object in
 * that same user's Storage folder. This prevents a forged server-action call
 * from assigning another account's avatar (or an external tracking URL) after
 * the browser uploader has already performed its own identity check.
 */
export function isOwnedProfileAvatarUrl(input: {
  avatarUrl: string;
  userId: string;
  supabaseUrl: string | undefined;
}): boolean {
  if (!input.supabaseUrl) return false;

  try {
    const avatar = new URL(input.avatarUrl);
    const supabase = new URL(input.supabaseUrl);

    if (
      avatar.origin !== supabase.origin ||
      avatar.username ||
      avatar.password ||
      avatar.search ||
      avatar.hash ||
      !avatar.pathname.startsWith(PROFILE_AVATAR_PUBLIC_PATH)
    ) {
      return false;
    }

    const objectPath = decodeURIComponent(
      avatar.pathname.slice(PROFILE_AVATAR_PUBLIC_PATH.length),
    );
    const segments = objectPath.split("/");
    return (
      segments.length === 2 &&
      segments[0] === input.userId &&
      /^avatar-\d+\.webp$/.test(segments[1] ?? "")
    );
  } catch {
    return false;
  }
}
