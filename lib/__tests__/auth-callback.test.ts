import { describe, expect, it } from "vitest";
import {
  authCallbackFailureNextPath,
  authCallbackFailureReason,
  buildAuthErrorRedirectUrl,
} from "@/lib/auth-callback";

describe("auth callback failures", () => {
  it("identifies an OAuth cancellation without misdiagnosing an email link", () => {
    expect(authCallbackFailureReason("access_denied", "User canceled")).toBe(
      "oauth_cancelled"
    );
    expect(authCallbackFailureReason(null, null)).toBe("missing_token");
  });

  it("preserves a safe intended destination on every failure", () => {
    const result = new URL(
      buildAuthErrorRedirectUrl(
        "https://usetruecap.com",
        "expired token",
        "/pricing?checkout=pro_monthly#plans"
      )
    );
    expect(result.origin).toBe("https://usetruecap.com");
    expect(result.pathname).toBe("/auth/login");
    expect(result.searchParams.get("error")).toBe("auth");
    expect(result.searchParams.get("reason")).toBe("expired token");
    expect(result.searchParams.get("next")).toBe(
      "/pricing?checkout=pro_monthly#plans"
    );
  });

  it("rejects an external destination", () => {
    const result = new URL(
      buildAuthErrorRedirectUrl(
        "https://usetruecap.com",
        "access denied",
        "//evil.example"
      )
    );
    expect(result.searchParams.get("next")).toBe("/");
  });

  it("unwraps an expired recovery link to its original destination", () => {
    const originalNext = "/pricing?checkout=pro_annual#plans";
    const recoveryNext = `/auth/update-password?next=${encodeURIComponent(originalNext)}`;
    const result = new URL(
      buildAuthErrorRedirectUrl(
        "https://usetruecap.com",
        "otp_expired",
        recoveryNext
      )
    );

    expect(result.pathname).toBe("/auth/login");
    expect(result.searchParams.get("next")).toBe(originalNext);
  });

  it.each([
    "/auth/update-password",
    "/auth/update-password?next=",
    "/auth/update-password?next=%2F%2Fevil.example",
    "/auth/update-password?next=https%3A%2F%2Fevil.example",
  ])("fails closed when recovery destination is missing or unsafe: %s", (next) => {
    expect(authCallbackFailureNextPath(next)).toBe("/");
  });
});
