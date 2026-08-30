import { describe, expect, it } from "vitest";
import {
  accountSessionIdentityChanged,
  accountSessionVerificationRequiresReload,
  expectedAccountUserMatches,
  isCurrentAccountMutation,
} from "@/lib/account-session-binding";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";

describe("account session binding", () => {
  it("accepts only the exact well-formed user rendered by the server", () => {
    expect(expectedAccountUserMatches(USER_A, USER_A)).toBe(true);
    expect(expectedAccountUserMatches(USER_A, USER_B)).toBe(false);
    expect(expectedAccountUserMatches(null, USER_A)).toBe(false);
    expect(expectedAccountUserMatches("user-a", "user-a")).toBe(false);
  });

  it("does not reload for same-account initial/refresh events", () => {
    expect(accountSessionIdentityChanged(USER_A, USER_A)).toBe(false);
    expect(accountSessionIdentityChanged(USER_A, USER_B)).toBe(true);
    expect(accountSessionIdentityChanged(USER_A, null)).toBe(true);
  });

  it("reloads only after a conclusive account verification", () => {
    expect(
      accountSessionVerificationRequiresReload(USER_A, {
        ok: true,
        userId: USER_A,
      }),
    ).toBe(false);
    expect(
      accountSessionVerificationRequiresReload(USER_A, {
        ok: false,
        reason: "unavailable",
      }),
    ).toBe(false);
    expect(
      accountSessionVerificationRequiresReload(USER_A, {
        ok: false,
        reason: "signed_out",
      }),
    ).toBe(true);
    expect(
      accountSessionVerificationRequiresReload(USER_A, {
        ok: true,
        userId: USER_B,
      }),
    ).toBe(true);
  });

  it("drops a deferred A response after an A to B switch or epoch change", () => {
    expect(
      isCurrentAccountMutation({
        expectedUserId: USER_A,
        authEpochAtSubmit: 3,
        currentUserId: USER_A,
        currentAuthEpoch: 3,
      }),
    ).toBe(true);
    expect(
      isCurrentAccountMutation({
        expectedUserId: USER_A,
        authEpochAtSubmit: 3,
        currentUserId: USER_B,
        currentAuthEpoch: 4,
      }),
    ).toBe(false);
  });
});
