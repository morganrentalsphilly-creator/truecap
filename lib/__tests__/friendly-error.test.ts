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

  it("maps a bucket mime rejection to the supported-types line, never to a retry", () => {
    // Reproduced live: a .zip injected past the picker's accept filter (the
    // drag-drop path) returned "mime type application/zip is not supported"
    // and the user was told "Please try again" — which can never work.
    const message = friendlyErrorMessage(
      new Error("mime type application/zip is not supported"),
    );
    expect(message).toMatch(/file type isn't supported/i);
    expect(message).not.toMatch(/try again/i);
  });

  it("maps a missing signed-URL target", () => {
    expect(friendlyErrorMessage(new Error("Object not found"))).toBe(
      "That document is no longer available. Refresh the page and try again.",
    );
  });

  it("maps an RLS denial to a refresh-and-sign-in line", () => {
    expect(
      friendlyErrorMessage(new Error("new row violates row-level security policy")),
    ).toBe("You don't have access to do that. Refresh the page and sign in again.");
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
