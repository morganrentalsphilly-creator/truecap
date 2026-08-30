import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import * as Sentry from "@sentry/nextjs";
import { friendlyErrorMessage, friendlyToastError } from "@/lib/friendly-error";

describe("friendlyErrorMessage", () => {
  it("maps the Storage duplicate-object error", () => {
    expect(friendlyErrorMessage(new Error("The resource already exists"))).toBe(
      "A file with this name already exists — rename it and try again.",
    );
  });

  it("maps the Storage size-cap error", () => {
    expect(
      friendlyErrorMessage(new Error("The object exceeded the maximum allowed size")),
    ).toBe("That file is too large to upload.");
  });

  it("maps a missing signed-URL target", () => {
    expect(friendlyErrorMessage(new Error("Object not found"))).toBe(
      "That document is no longer available. Refresh the page and try again.",
    );
  });

  it("maps an RLS denial without blaming the account or prescribing sign-in", () => {
    const message = friendlyErrorMessage(
      new Error("new row violates row-level security policy"),
    );
    expect(message).toBe(
      "We couldn't verify access for that action. Nothing was changed. Try again; if it keeps happening, contact support.",
    );
    expect(message).not.toMatch(/you don't have access|sign in/i);
  });

  it("maps a telemetry-safe session verification failure to retryable copy", () => {
    expect(
      friendlyErrorMessage(
        new Error("Browser session verification unavailable during get-user."),
      ),
    ).toBe(
      "We couldn't verify your session right now. Check your connection and try again.",
    );
  });

  it("maps a disabled OAuth provider", () => {
    for (const raw of ["provider is not enabled", "Unsupported provider: provider is not enabled"]) {
      expect(friendlyErrorMessage(new Error(raw))).toBe(
        "Google sign-in isn't available right now — use your email and password instead.",
      );
    }
  });

  it("maps expired sessions", () => {
    expect(friendlyErrorMessage(new Error("JWT expired"))).toBe(
      "Your session expired. Refresh the page and sign in again.",
    );
  });

  it("maps one-word unauthorized Storage variants to neutral access copy", () => {
    const message = friendlyErrorMessage(new Error("Unauthorized request"));
    expect(message).toBe(
      "We couldn't verify access for that action. Nothing was changed. Try again; if it keeps happening, contact support.",
    );
    expect(message).not.toMatch(/sign in|your account/i);
  });

  it("maps rate limiting", () => {
    expect(friendlyErrorMessage(new Error("Email rate limit exceeded"))).toBe(
      "Too many attempts — wait a moment and try again.",
    );
  });

  it("maps browser network failures", () => {
    for (const raw of ["Failed to fetch", "NetworkError when attempting to fetch resource", "Load failed"]) {
      expect(friendlyErrorMessage(new TypeError(raw))).toBe(
        "We couldn't reach the server — check your connection and try again.",
      );
    }
  });

  it("accepts Supabase's plain-object errors (message prop, not Error instance)", () => {
    expect(friendlyErrorMessage({ message: "The resource already exists", statusCode: "409" })).toBe(
      "A file with this name already exists — rename it and try again.",
    );
  });

  it("falls back to the generic line for unknown errors", () => {
    expect(friendlyErrorMessage(new Error("ECONNRESET while reading frame"))).toBe(
      "Something went wrong. Please try again.",
    );
  });

  it("uses a call-site fallback for unknown errors when provided", () => {
    expect(
      friendlyErrorMessage(new Error("ECONNRESET"), "We couldn't upload this file. Please try again."),
    ).toBe("We couldn't upload this file. Please try again.");
  });

  it("never leaks the raw message for null/undefined/garbage inputs", () => {
    expect(friendlyErrorMessage(null)).toBe("Something went wrong. Please try again.");
    expect(friendlyErrorMessage(undefined)).toBe("Something went wrong. Please try again.");
    expect(friendlyErrorMessage(42)).toBe("Something went wrong. Please try again.");
    expect(friendlyErrorMessage({ message: 42 })).toBe("Something went wrong. Please try again.");
  });
});

describe("friendlyToastError", () => {
  beforeEach(() => {
    vi.mocked(Sentry.captureException).mockClear();
  });

  it("captures the raw error to Sentry tagged by feature, and returns the mapped copy", () => {
    const error = new Error("The resource already exists");
    const message = friendlyToastError(error, { feature: "deal-documents" });
    expect(message).toBe("A file with this name already exists — rename it and try again.");
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      tags: { feature: "deal-documents" },
    });
  });

  it("still captures unknown errors while returning the fallback", () => {
    const error = new Error("something weird");
    const message = friendlyToastError(error, {
      feature: "google-auth",
      fallback: "Google sign-in failed. Try email and password instead.",
    });
    expect(message).toBe("Google sign-in failed. Try email and password instead.");
    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      tags: { feature: "google-auth" },
    });
  });
});
