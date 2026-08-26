import * as Sentry from "@sentry/nextjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/csp-report/route";

vi.mock("@sentry/nextjs", () => ({ captureMessage: vi.fn() }));

describe("CSP report-only collector", () => {
  beforeEach(() => vi.clearAllMocks());

  it("records only redacted route and origin metadata", async () => {
    const response = await POST(
      new Request("https://usetruecap.com/api/csp-report", {
        method: "POST",
        headers: { "content-type": "application/csp-report" },
        body: JSON.stringify({
          "csp-report": {
            "effective-directive": "script-src-elem",
            "blocked-uri": "https://unexpected.example/private/customer.js?email=user@example.com",
            "document-uri": "https://usetruecap.com/s/secret-share-token?email=user@example.com",
            "source-file": "https://cdn.example.com/assets/private.js?deal=abc",
          },
        }),
      })
    );

    expect(response.status).toBe(204);
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      "CSP report-only violation",
      expect.objectContaining({
        tags: { feature: "csp-report", directive: "script-src-elem" },
        extra: {
          blockedOrigin: "https://unexpected.example",
          documentRoute: "/s/:redacted",
          sourceOrigin: "https://cdn.example.com",
        },
      })
    );
    expect(JSON.stringify(vi.mocked(Sentry.captureMessage).mock.calls)).not.toContain(
      "secret-share-token"
    );
    expect(JSON.stringify(vi.mocked(Sentry.captureMessage).mock.calls)).not.toContain(
      "user@example.com"
    );
  });

  it("rejects an explicitly oversized report without parsing it", async () => {
    const response = await POST(
      new Request("https://usetruecap.com/api/csp-report", {
        method: "POST",
        headers: { "content-length": "20001" },
        body: "{}",
      })
    );

    expect(response.status).toBe(413);
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it("rejects an oversized streamed report even without content-length", async () => {
    const response = await POST(
      new Request("https://usetruecap.com/api/csp-report", {
        method: "POST",
        body: JSON.stringify({ value: "x".repeat(20_001) }),
      })
    );

    expect(response.status).toBe(413);
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it("absorbs malformed advisory reports", async () => {
    const response = await POST(
      new Request("https://usetruecap.com/api/csp-report", {
        method: "POST",
        body: "not-json",
      })
    );
    expect(response.status).toBe(204);
  });
});
