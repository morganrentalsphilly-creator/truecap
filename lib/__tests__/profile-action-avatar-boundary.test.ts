import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  })),
}));

import { updateProfileAction } from "@/app/actions/profile";

const ORIGINAL_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_URL = "https://example-project.supabase.co";
const USER_ID = "11111111-1111-4111-8111-111111111111";

describe("profile avatar server boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
    mocks.getUser.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });
  });

  afterAll(() => {
    if (ORIGINAL_SUPABASE_URL === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_SUPABASE_URL;
    }
  });

  it.each([
    "https://tracker.example/avatar.webp",
    `${SUPABASE_URL}/storage/v1/object/public/profile-avatars/22222222-2222-4222-8222-222222222222/avatar-1788105600000.webp`,
  ])("rejects an unowned avatar before writing the profile: %s", async (avatarUrl) => {
    await expect(
      updateProfileAction({
        firstName: "Morgan",
        lastName: "Page",
        avatarUrl,
      }),
    ).resolves.toEqual({
      ok: false,
      code: "VALIDATION",
      message: "Upload your profile photo through this account before saving it.",
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
