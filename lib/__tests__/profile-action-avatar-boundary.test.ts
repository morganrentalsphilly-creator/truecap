import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
  updateProfile: vi.fn(),
  eqProfile: vi.fn(),
  selectProfile: vi.fn(),
  maybeSingleProfile: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: mocks.getUser, updateUser: mocks.updateUser },
    from: mocks.from,
  })),
}));

import { updateProfileAction } from "@/app/actions/profile";

const ORIGINAL_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_URL = "https://example-project.supabase.co";
const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";

describe("profile avatar server boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
    mocks.getUser.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });
    mocks.maybeSingleProfile.mockResolvedValue({
      data: { id: USER_ID },
      error: null,
    });
    mocks.selectProfile.mockReturnValue({
      maybeSingle: mocks.maybeSingleProfile,
    });
    mocks.eqProfile.mockReturnValue({ select: mocks.selectProfile });
    mocks.updateProfile.mockReturnValue({ eq: mocks.eqProfile });
    mocks.from.mockReturnValue({ update: mocks.updateProfile });
    mocks.updateUser.mockResolvedValue({ error: null });
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
        expectedUserId: USER_ID,
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

  it("canonicalizes the client's timestamp cache buster for both profile stores", async () => {
    const canonical = `${SUPABASE_URL}/storage/v1/object/public/profile-avatars/${USER_ID}/avatar-1788105600000.webp`;

    await expect(
      updateProfileAction({
        expectedUserId: USER_ID,
        firstName: "Morgan",
        lastName: "Page",
        avatarUrl: `${canonical}?v=1788105600123`,
      }),
    ).resolves.toEqual({ ok: true });

    expect(mocks.updateProfile).toHaveBeenCalledWith({
      first_name: "Morgan",
      last_name: "Page",
      display_name: "Morgan Page",
      avatar_url: canonical,
    });
    expect(mocks.updateUser).toHaveBeenCalledWith({
      data: {
        full_name: "Morgan Page",
        name: "Morgan",
        avatar_url: canonical,
      },
    });
  });

  it.each([
    "?v=not-a-number",
    "?v=1788105600123&download=1",
    "?v=1788105600123&v=1788105600456",
  ])("rejects malformed cache-buster queries before writing: %s", async (query) => {
    const avatarUrl = `${SUPABASE_URL}/storage/v1/object/public/profile-avatars/${USER_ID}/avatar-1788105600000.webp${query}`;

    await expect(
      updateProfileAction({
        expectedUserId: USER_ID,
        firstName: "Morgan",
        lastName: "Page",
        avatarUrl,
      }),
    ).resolves.toMatchObject({ ok: false, code: "VALIDATION" });
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("rejects a deferred account-A save when the server session resolves as account B", async () => {
    let resolveUser!: (value: {
      data: { user: { id: string } };
      error: null;
    }) => void;
    mocks.getUser.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveUser = resolve;
      }),
    );

    const pending = updateProfileAction({
      expectedUserId: USER_ID,
      firstName: "Account A",
      lastName: "Owner",
      avatarUrl: null,
    });
    resolveUser({ data: { user: { id: OTHER_USER_ID } }, error: null });

    await expect(pending).resolves.toEqual({
      ok: false,
      code: "SESSION_CHANGED",
      message:
        "Your signed-in account changed. Refresh this page before saving profile changes.",
    });
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
});
