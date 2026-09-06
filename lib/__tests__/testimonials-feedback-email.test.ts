import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({ captureMessage: vi.fn(), captureException: vi.fn() }));

import { createFakeAdmin } from "./helpers/fake-supabase-admin";
import { readSignedToken } from "@/lib/signed-token";
import {
  buildUnsubscribeUrl,
  renderFeedbackEmail,
  resolveFeedbackEmailMode,
  runFeedbackEmailJob,
  UNSUBSCRIBE_TOKEN_SCOPE,
  type EmailTransport,
} from "@/lib/testimonials/feedback-email";

const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";
const NOW = new Date("2026-09-08T12:00:00Z");

function setup() {
  return createFakeAdmin({
    tables: {
      profiles: [
        { id: U1, marketing_opt_out: false },
        { id: U2, marketing_opt_out: true },
      ],
      saved_analyses: [
        { id: "d1", user_id: U1, deleted_at: null, created_at: "2026-09-01T00:00:00Z" },
        { id: "d2", user_id: U2, deleted_at: null, created_at: "2026-09-01T00:00:00Z" },
      ],
      demo_accounts: [],
      testimonial_prompt_events: [],
      feedback_email_sends: [],
    },
    users: [
      { id: U1, email: "alice@example.com", email_confirmed_at: "2026-01-01" },
      { id: U2, email: "bob@example.com", email_confirmed_at: "2026-01-01" },
    ],
  });
}

beforeEach(() => {
  process.env.SHARE_LINK_SECRET = "test-secret-for-signed-links-1234567890";
});

describe("feedback-request email", () => {
  it("defaults to off and never sends in off or dry mode", async () => {
    expect(resolveFeedbackEmailMode(undefined)).toBe("off");
    expect(resolveFeedbackEmailMode("dry")).toBe("dry");
    expect(resolveFeedbackEmailMode("LIVE")).toBe("live");
    const transport = vi.fn<EmailTransport>(async () => ({ ok: true, id: "msg_1" }));
    const fake = setup();
    const off = await runFeedbackEmailJob({ admin: fake.admin, mode: "off", transport, siteUrl: "https://usetruecap.com", from: "TrueCap <hello@usetruecap.com>", now: NOW });
    expect(off).toMatchObject({ audience: 0, sent: 0 });
    const dry = await runFeedbackEmailJob({ admin: fake.admin, mode: "dry", transport, siteUrl: "https://usetruecap.com", from: "TrueCap <hello@usetruecap.com>", now: NOW });
    expect(dry).toMatchObject({ audience: 1, sent: 0 });
    expect(transport).not.toHaveBeenCalled();
    expect(fake.rows("feedback_email_sends")).toHaveLength(0);
  });

  it("sends once per eligible user through the mocked transport, claiming the row first, with a signed unsubscribe link", async () => {
    const transport = vi.fn<EmailTransport>(async () => ({ ok: true, id: "msg_1" }));
    const fake = setup();
    const summary = await runFeedbackEmailJob({ admin: fake.admin, mode: "live", transport, siteUrl: "https://usetruecap.com", from: "TrueCap <hello@usetruecap.com>", now: NOW });
    expect(summary).toMatchObject({ audience: 1, sent: 1, failed: 0 });
    expect(transport).toHaveBeenCalledTimes(1);
    const message = transport.mock.calls[0][0];
    expect(message.to).toBe("alice@example.com");
    expect(message.subject).toBe("One question about TrueCap");
    expect(message.text).toContain("What did TrueCap change about how you evaluate deals?");
    expect(message.text).toMatch(/\/feedback\/testimonial\?token=[a-f0-9]{48}/);
    expect(message.text).not.toMatch(/<[a-z]+>/); // plain text
    const unsub = message.headers?.["List-Unsubscribe"] ?? "";
    const token = new URL(unsub.slice(1, -1)).searchParams.get("token") ?? "";
    expect(readSignedToken(UNSUBSCRIBE_TOKEN_SCOPE, token)).toEqual({ u: U1 });
    // Claimed row carries the form token and the provider id.
    expect(fake.rows("feedback_email_sends")).toMatchObject([{ user_id: U1, provider_message_id: "msg_1" }]);

    // A second run can never send again.
    const again = await runFeedbackEmailJob({ admin: fake.admin, mode: "live", transport, siteUrl: "https://usetruecap.com", from: "TrueCap <hello@usetruecap.com>", now: NOW });
    expect(again).toMatchObject({ audience: 0, sent: 0 });
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("refuses to send without a signing secret (no compliant unsubscribe link)", async () => {
    delete process.env.SHARE_LINK_SECRET;
    const transport = vi.fn<EmailTransport>(async () => ({ ok: true }));
    const fake = setup();
    const summary = await runFeedbackEmailJob({ admin: fake.admin, mode: "live", transport, siteUrl: "https://usetruecap.com", from: "TrueCap <hello@usetruecap.com>", now: NOW });
    expect(summary).toMatchObject({ audience: 1, sent: 0, skipped_no_unsubscribe_link: 1 });
    expect(transport).not.toHaveBeenCalled();
    expect(buildUnsubscribeUrl("https://usetruecap.com", U1)).toBeNull();
  });

  it("includes the postal address only when configured", () => {
    const withAddress = renderFeedbackEmail({ siteUrl: "https://usetruecap.com", formToken: "a".repeat(48), unsubscribeUrl: "https://usetruecap.com/email/unsubscribe?token=x", postalAddress: "123 Main St, Philadelphia, PA" });
    expect(withAddress.text).toContain("123 Main St");
    const without = renderFeedbackEmail({ siteUrl: "https://usetruecap.com", formToken: "a".repeat(48), unsubscribeUrl: "https://usetruecap.com/email/unsubscribe?token=x" });
    expect(without.text).not.toContain("123 Main St");
  });
});
