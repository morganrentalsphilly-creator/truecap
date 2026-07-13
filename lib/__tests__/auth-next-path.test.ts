import { describe, expect, it } from "vitest";
import { safeInternalNextPath } from "@/lib/auth-schema";

/**
 * Jul 2026: signUpAction / resendConfirmationAction thread the caller's
 * validated ?next into the confirmation email's redirect (emailRedirectTo)
 * so a mid-flow signup (started Pro checkout, pending save) resumes after
 * the confirm hop. This helper is the server-side gate — internal paths
 * only, no protocol-relative open redirects, invalid falls back to "/".
 */
describe("safeInternalNextPath", () => {
  it("passes internal paths through", () => {
    expect(safeInternalNextPath("/")).toBe("/");
    expect(safeInternalNextPath("/pricing?checkout=pro_monthly#plans")).toBe(
      "/pricing?checkout=pro_monthly#plans"
    );
    expect(safeInternalNextPath("/auth/update-password")).toBe("/auth/update-password");
  });

  it("rejects protocol-relative and absolute URLs (open redirect)", () => {
    expect(safeInternalNextPath("//evil.com")).toBe("/");
    expect(safeInternalNextPath("//evil.com/pricing")).toBe("/");
    expect(safeInternalNextPath("https://evil.com")).toBe("/");
    expect(safeInternalNextPath("http://evil.com/x")).toBe("/");
  });

  it("rejects non-path junk and non-strings", () => {
    expect(safeInternalNextPath("pricing")).toBe("/");
    expect(safeInternalNextPath("")).toBe("/");
    expect(safeInternalNextPath(undefined)).toBe("/");
    expect(safeInternalNextPath(null)).toBe("/");
    expect(safeInternalNextPath(42)).toBe("/");
    expect(safeInternalNextPath({ next: "/pricing" })).toBe("/");
  });
});
