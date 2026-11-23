/**
 * "Email me this decision memo", traced end to end with no network
 * (2026-11 ads pass, F2): the server action from the form's call to the
 * Resend request and the send log, on an in-memory database and a stubbed
 * fetch. Analytics showed more `memo_requested` (sent by the browser when the
 * form is submitted) than `memo_sent` (sent by this action after Resend
 * accepts the email). These cases pin, branch by branch, which requests end
 * in a send and which end without one, so the gap can be read from the code:
 *
 *   - a send:            the happy path, for every deal shape;
 *   - no send, "ok":     a third request for one address inside 30 days, an
 *                        unsubscribed address, a filled honeypot (the page
 *                        shows "Memo sent" for these, by design);
 *   - no send, an error: captcha, configuration, the database, Resend.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SAMPLE_DEAL_VALUES } from "@/lib/sample-deal";
import { releasedInvestmentFormSchema } from "@/lib/underwriting-model-release";

type Row = Record<string, unknown>;
const db = {
  suppressed: new Set<string>(),
  leads: [] as Row[],
  log: [] as Row[],
  claimStatus: "ok" as string,
  released: [] as string[],
  failLeadWrite: false,
};

function fakeAdmin() {
  return {
    rpc: async (fn: string, params: Row) => {
      if (fn === "claim_email_capture") return { data: db.claimStatus, error: null };
      if (fn === "release_capture_bucket") {
        db.released.push(String(params.p_key));
        return { data: null, error: null };
      }
      return { data: null, error: { message: `unknown rpc ${fn}` } };
    },
    from: (table: string) => {
      if (table === "email_suppressions") {
        let hash = "";
        const q = {
          select: () => q,
          eq: (_column: string, value: string) => {
            hash = value;
            return q;
          },
          maybeSingle: async () => ({
            data: db.suppressed.has(hash) ? { email_hash: hash } : null,
            error: null,
          }),
        };
        return q;
      }
      if (table === "memo_leads") {
        return {
          upsert: (row: Row) => ({
            select: () => ({
              single: async () => {
                if (db.failLeadWrite) return { data: null, error: { code: "42P10" } };
                const existing = db.leads.find((l) => l.email_normalized === row.email_normalized);
                if (existing) {
                  Object.assign(existing, row);
                  return { data: { id: existing.id }, error: null };
                }
                const id = `00000000-0000-4000-8000-00000000000${db.leads.length + 1}`;
                db.leads.push({ id, ...row });
                return { data: { id }, error: null };
              },
            }),
          }),
        };
      }
      if (table === "lifecycle_email_log") {
        return {
          insert: async (row: Row) => {
            db.log.push(row);
            return { data: null, error: null };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
}

vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabaseClient: () => fakeAdmin() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7" }),
}));
vi.mock("@sentry/nextjs", () => ({ captureMessage: vi.fn(), captureException: vi.fn() }));

import { captureMemoLeadAction } from "@/app/actions/memo-lead-capture";

const values = releasedInvestmentFormSchema.parse(SAMPLE_DEAL_VALUES);
const fetchMock = vi.fn();

function resendOk() {
  return new Response(JSON.stringify({ id: "resend_test_1" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
const resendCalls = () =>
  fetchMock.mock.calls.filter(([url]) => String(url) === "https://api.resend.com/emails");

beforeEach(() => {
  db.suppressed.clear();
  db.leads.length = 0;
  db.log.length = 0;
  db.released.length = 0;
  db.claimStatus = "ok";
  db.failLeadWrite = false;
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => resendOk());
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("FUNNEL_MEMO_CAPTURE", "on");
  vi.stubEnv("RESEND_API_KEY", "re_test_not_a_real_key");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://truecap.example");
  vi.stubEnv("SHARE_LINK_SECRET", "unit-test-signing-secret-of-32-chars-min");
  vi.stubEnv("MEMO_TURNSTILE_SECRET_KEY", "");
  vi.stubEnv("NEXT_PUBLIC_MEMO_TURNSTILE_SITE_KEY", "");
  vi.stubEnv("VERCEL", "");
});

const request = (overrides: Partial<Parameters<typeof captureMemoLeadAction>[0]> = {}) =>
  captureMemoLeadAction({
    email: "Reader@Example.com",
    values,
    sourcePage: "/analyze",
    ...overrides,
  });

describe("memo email: a request that ends in a send", () => {
  it("stores the lead, sends one email through Resend and logs L0", async () => {
    const result = await request();
    expect(result).toEqual({ ok: true });

    expect(db.leads).toHaveLength(1);
    expect(db.leads[0]).toMatchObject({
      email: "Reader@Example.com",
      email_normalized: "reader@example.com",
      source_page: "/analyze",
    });
    expect((db.leads[0]!.snapshot as { values: unknown }).values).toEqual(values);

    expect(resendCalls()).toHaveLength(1);
    const body = JSON.parse(String(resendCalls()[0]![1].body)) as {
      to: string[];
      subject: string;
      text: string;
      html: string;
      headers: Record<string, string>;
      tags: { name: string; value: string }[];
    };
    expect(body.to).toEqual(["Reader@Example.com"]);
    expect(body.subject).toBe("Your TrueCap decision memo");
    expect(body.text).toContain("https://truecap.example/memo/");
    expect(body.headers["List-Unsubscribe"]).toContain("https://truecap.example/email/unsubscribe?token=");
    expect(body.tags).toContainEqual({ name: "sequence_step", value: "L0" });

    expect(db.log).toEqual([{ lead_id: db.leads[0]!.id, email_key: "L0", resend_id: "resend_test_1" }]);
    expect(db.released).toEqual([]);
  });

  it("sends for every deal shape the analyzer can produce a free decision for", async () => {
    const shapes = [
      { name: "with adopted targets", input: { maoTarget: { monthlyCashFlow: 200, dscr: 1.25 } } },
      { name: "no targets", input: { maoTarget: undefined } },
      { name: "a cash purchase", input: { values: releasedInvestmentFormSchema.parse({ ...SAMPLE_DEAL_VALUES, downPaymentPct: 100 }) } },
      { name: "a rent that loses money", input: { values: releasedInvestmentFormSchema.parse({ ...SAMPLE_DEAL_VALUES, monthlyRent: 900 }) } },
    ];
    for (const [index, shape] of shapes.entries()) {
      const result = await request({ email: `shape${index}@example.com`, ...shape.input });
      expect(result, shape.name).toEqual({ ok: true });
    }
    expect(resendCalls()).toHaveLength(shapes.length);
  });
});

describe("memo email: a request the page answers with 'Memo sent' and no send", () => {
  it("a third request for one address inside 30 days (the guard's duplicate)", async () => {
    db.claimStatus = "duplicate";
    expect(await request()).toEqual({ ok: true });
    expect(resendCalls()).toHaveLength(0);
    expect(db.leads).toHaveLength(0);
  });

  it("an address that unsubscribed", async () => {
    const { hashDripEmail } = await import("@/lib/email-drip-unsubscribe");
    db.suppressed.add(hashDripEmail("reader@example.com"));
    expect(await request()).toEqual({ ok: true });
    expect(resendCalls()).toHaveLength(0);
  });

  it("a filled honeypot", async () => {
    expect(await request({ website: "https://spam.example" })).toEqual({ ok: true });
    expect(resendCalls()).toHaveLength(0);
  });
});

describe("memo email: a request that ends in an error and no send", () => {
  it("the memo widget's site key is set without its secret", async () => {
    vi.stubEnv("NEXT_PUBLIC_MEMO_TURNSTILE_SITE_KEY", "site-key");
    expect(await request()).toMatchObject({ ok: false, code: "CONFIG_MISSING" });
    expect(resendCalls()).toHaveLength(0);
  });

  it("the secret is set and the request carries no token", async () => {
    vi.stubEnv("NEXT_PUBLIC_MEMO_TURNSTILE_SITE_KEY", "site-key");
    vi.stubEnv("MEMO_TURNSTILE_SECRET_KEY", "secret");
    expect(await request()).toMatchObject({ ok: false, code: "CAPTCHA_FAILED" });
    expect(resendCalls()).toHaveLength(0);
  });

  it("no Resend key, or no signing secret for the unsubscribe link", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect(await request()).toMatchObject({ ok: false, code: "CONFIG_MISSING" });
    vi.stubEnv("RESEND_API_KEY", "re_test_not_a_real_key");
    vi.stubEnv("SHARE_LINK_SECRET", "");
    expect(await request()).toMatchObject({ ok: false, code: "CONFIG_MISSING" });
    expect(resendCalls()).toHaveLength(0);
  });

  it("the lead cannot be written: the address's slot is given back", async () => {
    db.failLeadWrite = true;
    expect(await request()).toMatchObject({ ok: false, code: "SEND_FAILED" });
    expect(resendCalls()).toHaveLength(0);
    expect(db.released).toHaveLength(1);
  });

  it("Resend refuses the email: the slot is given back and nothing is logged", async () => {
    fetchMock.mockImplementation(async () => new Response("{}", { status: 422 }));
    expect(await request()).toMatchObject({ ok: false, code: "SEND_FAILED" });
    expect(db.log).toEqual([]);
    expect(db.released).toHaveLength(1);
  });

  it("the flag is off", async () => {
    vi.stubEnv("FUNNEL_MEMO_CAPTURE", "off");
    expect(await request()).toMatchObject({ ok: false, code: "DISABLED" });
  });
});
