import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isCurrentProfileMutation } from "@/lib/profile-mutation-lifecycle";

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("profile mutation identity lifecycle", () => {
  it("suppresses a deferred account-A success after the browser switches to account B", async () => {
    const requestToken = Symbol("profile-a");
    let mounted = true;
    let currentUserId: string | null = USER_A;
    let currentAuthEpoch = 3;
    let currentRequestToken: symbol | null = requestToken;
    let successPainted = false;
    let resolveSave!: () => void;
    const deferredSave = new Promise<void>((resolve) => {
      resolveSave = resolve;
    });

    const completion = deferredSave.then(() => {
      if (
        isCurrentProfileMutation({
          mounted,
          expectedUserId: USER_A,
          currentUserId,
          authEpochAtSubmit: 3,
          currentAuthEpoch,
          requestToken,
          currentRequestToken,
        })
      ) {
        successPainted = true;
      }
    });

    currentUserId = USER_B;
    currentAuthEpoch = 4;
    currentRequestToken = null;
    resolveSave();
    await completion;

    expect(successPainted).toBe(false);
    mounted = false;
  });

  it("wires fresh verification, auth invalidation, server binding, and guarded success UI", () => {
    const form = readFileSync(
      join(process.cwd(), "components/profile/profile-form.tsx"),
      "utf8",
    );
    const action = readFileSync(
      join(process.cwd(), "app/actions/profile.ts"),
      "utf8",
    );
    const submitStart = form.indexOf("const onSubmit = async");
    const submitEnd = form.indexOf("return (", submitStart);
    const submit = form.slice(submitStart, submitEnd);
    const actionAwait = submit.indexOf("await updateProfileAction({");

    expect(form).toContain("supabase.auth.onAuthStateChange");
    expect(form).toContain("authSubscription.unsubscribe()");
    expect(form).toContain("verifyExpectedProfileIdentity(");
    expect(form).toContain("getFreshSessionUser(supabase)");
    expect(form).toContain("profileAuthEpochRef.current += 1");
    expect(form).toContain("profileSaveRequestRef.current = null");
    expect(form).toContain("profileResetRequestRef.current = null");
    expect(form).toContain("Retry session verification");
    expect(form).toContain("Refresh profile");
    expect(submit).toContain("expectedUserId: userId");
    expect(actionAwait).toBeGreaterThan(-1);
    expect(
      submit.indexOf("if (!requestStillOwnsProfile()) return;", actionAwait),
    ).toBeGreaterThan(actionAwait);
    expect(submit).toContain('result.code === "SESSION_CHANGED"');
    expect(submit.indexOf('new CustomEvent("profile-updated"')).toBeGreaterThan(
      actionAwait,
    );
    expect(action).toContain("expectedUserId: z.string().uuid()");
    expect(action).toContain("user.id !== parsed.data.expectedUserId");
    expect(action.indexOf('code: "SESSION_CHANGED"')).toBeLessThan(
      action.indexOf('.from("profiles")'),
    );

    const resetStart = form.indexOf("const handleSendPasswordReset = async");
    const resetEnd = form.indexOf("const onSubmit = async", resetStart);
    const reset = form.slice(resetStart, resetEnd);
    const resetAwait = reset.indexOf("await requestPasswordResetAction({");
    expect(reset).toContain('profileSessionState !== "ready"');
    expect(reset).toContain("verifyExpectedProfileIdentity(");
    expect(reset).toContain("profileResetRequestRef.current");
    expect(reset).toContain("profileBinding: {");
    expect(reset).toContain("expectedUserId: userId");
    expect(reset).toContain('result.code === "SESSION_CHANGED"');
    expect(resetAwait).toBeGreaterThan(-1);
    expect(
      reset.indexOf("if (!requestStillOwnsProfile()) return;", resetAwait),
    ).toBeGreaterThan(resetAwait);
  });
});
