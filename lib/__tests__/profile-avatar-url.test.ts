import { describe, expect, it } from "vitest";

import { isOwnedProfileAvatarUrl } from "@/lib/profile-avatar-url";

const SUPABASE_URL = "https://example-project.supabase.co";
const USER_ID = "11111111-1111-4111-8111-111111111111";

function isOwned(avatarUrl: string, userId = USER_ID): boolean {
  return isOwnedProfileAvatarUrl({
    avatarUrl,
    userId,
    supabaseUrl: SUPABASE_URL,
  });
}

describe("profile avatar URL ownership", () => {
  it("accepts the exact public object URL produced by the account uploader", () => {
    expect(
      isOwned(
        `${SUPABASE_URL}/storage/v1/object/public/profile-avatars/${USER_ID}/avatar-1788105600000.webp`,
      ),
    ).toBe(true);
  });

  it("rejects another user's avatar path", () => {
    expect(
      isOwned(
        `${SUPABASE_URL}/storage/v1/object/public/profile-avatars/22222222-2222-4222-8222-222222222222/avatar-1788105600000.webp`,
      ),
    ).toBe(false);
  });

  it.each([
    "https://tracker.example/avatar.webp",
    `${SUPABASE_URL}/storage/v1/object/public/profile-avatars/${USER_ID}/nested/avatar-1788105600000.webp`,
    `${SUPABASE_URL}/storage/v1/object/public/profile-avatars/${USER_ID}/avatar.svg`,
    `${SUPABASE_URL}/storage/v1/object/public/profile-avatars/${USER_ID}/avatar-1788105600000.webp?download=1`,
    `${SUPABASE_URL}/storage/v1/object/public/profile-avatars/${USER_ID}%2F..%2Fother/avatar-1788105600000.webp`,
  ])("rejects a forged or non-canonical URL: %s", (avatarUrl) => {
    expect(isOwned(avatarUrl)).toBe(false);
  });

  it("fails closed when the configured Supabase URL is missing", () => {
    expect(
      isOwnedProfileAvatarUrl({
        avatarUrl: `${SUPABASE_URL}/storage/v1/object/public/profile-avatars/${USER_ID}/avatar-1788105600000.webp`,
        userId: USER_ID,
        supabaseUrl: undefined,
      }),
    ).toBe(false);
  });
});
