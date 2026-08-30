const PROFILE_AVATAR_PUBLIC_PATH =
  "/storage/v1/object/public/profile-avatars/";

export type OwnedProfileAvatarUrlInput = {
  avatarUrl: string;
  userId: string;
  supabaseUrl: string | undefined;
};

/**
 * Profile avatars are public, but a profile must only point at an object in
 * that same user's Storage folder. This prevents a forged server-action call
 * from assigning another account's avatar (or an external tracking URL) after
 * the browser uploader has already performed its own identity check.
 * The browser adds exactly `?v=<timestamp>` after an upload to bypass its
 * image cache. Accept that one presentation-only query, then return the
 * canonical queryless URL so neither profile storage nor auth metadata keeps
 * cache state. Any other query/fragment/path representation fails closed.
 */
export function canonicalizeOwnedProfileAvatarUrl(
  input: OwnedProfileAvatarUrlInput,
): string | null {
  if (!input.supabaseUrl || input.avatarUrl !== input.avatarUrl.trim()) {
    return null;
  }

  try {
    const avatar = new URL(input.avatarUrl);
    const supabase = new URL(input.supabaseUrl);

    if (
      avatar.origin !== supabase.origin ||
      avatar.username ||
      avatar.password ||
      avatar.hash ||
      input.avatarUrl.includes("#")
    ) {
      return null;
    }

    const queryIndex = input.avatarUrl.indexOf("?");
    if (queryIndex >= 0) {
      const rawQuery = input.avatarUrl.slice(queryIndex + 1);
      if (!/^v=\d+$/.test(rawQuery)) return null;
    } else if (avatar.search) {
      return null;
    }

    const ownedPrefix = `${PROFILE_AVATAR_PUBLIC_PATH}${input.userId}/`;
    if (!avatar.pathname.startsWith(ownedPrefix)) return null;
    const objectName = avatar.pathname.slice(ownedPrefix.length);
    if (!/^avatar-\d+\.webp$/.test(objectName)) return null;

    return `${supabase.origin}${ownedPrefix}${objectName}`;
  } catch {
    return null;
  }
}

/** Boolean compatibility wrapper retained for existing ownership guards. */
export function isOwnedProfileAvatarUrl(
  input: OwnedProfileAvatarUrlInput,
): boolean {
  return canonicalizeOwnedProfileAvatarUrl(input) !== null;
}
