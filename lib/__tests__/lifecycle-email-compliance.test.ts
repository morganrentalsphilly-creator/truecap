/**
 * Lifecycle emails: the send gate, the footer, the opt-out, the welcome age
 * guard and the pacing (report rows P0-19 and P2-131). The wording guards for
 * the content files are in lifecycle-email-wording.test.ts.
 *
 * Nothing here can reach the network: `fetch` is replaced in every test and
 * throws for any URL other than the stubbed Resend endpoint. The database is
 * an in-memory fake. The postal address below is a made-up test value; no
 * address is typed anywhere in shipped code.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  admin: vi.fn(),
  captureMessage: vi.fn(),
  captureException: vi.fn(),
  setMarketingOptOut: vi.fn(),
  paidUserIds: vi.fn(),
  guaranteeEnabled: { value: true },
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabaseClient: mocks.admin }));
vi.mock("@sentry/nextjs", () => ({
  captureMessage: mocks.captureMessage,
  captureException: mocks.captureException,
}));
vi.mock("@/lib/paid-user-ids", () => ({ getPaidUserIds: mocks.paidUserIds }));
vi.mock("@/lib/marketing-offer-config", () => ({
  getMarketingOfferConfig: () => ({ guaranteeEnabled: mocks.guaranteeEnabled.value }),
}));
vi.mock("@/lib/testimonials/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/testimonials/store")>()),
  setMarketingOptOut: mocks.setMarketingOptOut,
}));

import { GET as runCron } from "@/app/api/cron/send-lifecycle-emails/route";
import { GET as unsubscribeGet, POST as unsubscribePost } from "@/app/email/unsubscribe/route";
import {
  WELCOME_MAX_AGE_DAYS,
  buildLifecycleUnsubscribeHeaders,
  buildLifecycleUnsubscribeUrl,
  describeLifecycleBlock,
  lifecycleSendGate,
  readEmailPostalAddress,
  welcomeWindowPassed,
} from "@/lib/email/lifecycle-compliance";
import { renderLifecycleEmail } from "@/lib/email/render-lifecycle";
import {
  MAX_RATE_LIMIT_HITS,
  RUN_BUDGET_MS,
  SEND_GAP_MS,
  classifyResend429,
  pacing,
  retryAfterMs,
} from "@/lib/email/resend-pacing";
import { sendLifecycleEmailNow } from "@/lib/email/send-lifecycle";
import { scheduleTrialOnboardingEmails } from "@/lib/email/trial-emails";
import {
  DRIP_CATCH_UP_GRACE_DAYS,
  DRIP_SKIPPED_RESEND_ID,
  MAX_DRIP_DAY,
  type DueLifecycleEmail,
} from "@/lib/lifecycle-emails";
import { readSignedToken } from "@/lib/signed-token";
import { UNSUBSCRIBE_TOKEN_SCOPE } from "@/lib/testimonials/feedback-email";
import type { SupabaseClient } from "@supabase/supabase-js";

const SITE = "https://usetruecap.com";
const CRON_SECRET = "cron-test-secret-that-is-not-used-in-production";
/** A made-up value for tests only. */
const TEST_POSTAL_ADDRESS = "TEST ADDRESS (not real), 000 Example Road, Nowhere, ZZ 00000";
const DAY_MS = 86_400_000;

type Row = Record<string, unknown>;
type FakeUser = { id: string; email: string; created_at: string; email_confirmed_at: string | null };

const uid = (n: number) => `aaaaaaaa-0000-4000-8000-${String(n).padStart(12, "0")}`;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS - 60_000).toISOString();
function user(n: number, ageDays: number, confirmed = true): FakeUser {
  const created = daysAgo(ageDays);
  return { id: uid(n), email: `user${n}@example.com`, created_at: created, email_confirmed_at: confirmed ? created : null };
}
const profile = (n: number, extra: Row = {}): Row => ({
  id: uid(n),
  marketing_opt_out: false,
  marketing_emails: false,
  ...extra,
});

function makeDatabase(seed: { users?: FakeUser[]; profiles?: Row[]; log?: Row[] } = {}) {
  const tables: Record<string, Row[]> = {
    profiles: [...(seed.profiles ?? [])],
    lifecycle_email_log: [...(seed.log ?? [])],
    saved_analyses: [],
  };
  const users = [...(seed.users ?? [])];
  const errors = new Set<string>();
  const operations: Array<{ table: string; method: string; value?: unknown }> = [];
  const from = (table: string) => {
    let method = "select";
    let value: unknown;
    let single = false;
    let window: [number, number] | null = null;
    const filters: Array<(row: Row) => boolean> = [];
    const query = {
      select: () => query,
      insert: (input: Row) => { method = "insert"; value = input; return query; },
      upsert: (input: Row[]) => { method = "upsert"; value = input; return query; },
      update: (input: Row) => { method = "update"; value = input; return query; },
      delete: () => { method = "delete"; return query; },
      eq: (key: string, input: unknown) => { filters.push((row) => row[key] === input); return query; },
      is: (key: string, input: unknown) => { filters.push((row) => (row[key] ?? null) === input); return query; },
      order: () => query,
      range: (start: number, end: number) => { window = [start, end]; return query; },
      maybeSingle: () => { single = true; return query; },
      then: (
        resolve: (result: { data: unknown; error: { code: string; message: string } | null }) => unknown,
        reject?: (error: unknown) => unknown,
      ) => {
        try {
          operations.push({ table, method, value });
          if (errors.has(`${table}:${method}`)) {
            return Promise.resolve(resolve({ data: null, error: { code: "42703", message: "private database detail" } }));
          }
          const rows = (tables[table] ??= []);
          const found = rows.filter((row) => filters.every((filter) => filter(row)));
          if (method === "insert") {
            const input = value as Row;
            if (
              table === "lifecycle_email_log" &&
              rows.some((row) => row.user_id === input.user_id && row.email_key === input.email_key)
            ) {
              return Promise.resolve(resolve({ data: null, error: { code: "23505", message: "duplicate" } }));
            }
            rows.push({ resend_id: null, ...input });
          }
          if (method === "upsert") {
            for (const input of value as Row[]) {
              if (!rows.some((row) => row.user_id === input.user_id && row.email_key === input.email_key)) {
                rows.push({ ...input });
              }
            }
          }
          if (method === "update") found.forEach((row) => Object.assign(row, value as Row));
          if (method === "delete") {
            tables[table] = rows.filter((row) => !found.includes(row));
          }
          const page = window ? found.slice(window[0], window[1] + 1) : found;
          return Promise.resolve(resolve({ data: single ? (page[0] ?? null) : page, error: null }));
        } catch (error) {
          return reject ? Promise.resolve(reject(error)) : Promise.reject(error);
        }
      },
    };
    return query;
  };
  const admin = {
    from,
    auth: {
      admin: {
        listUsers: async ({ page }: { page: number }) => ({
          data: { users: page === 1 ? users : [] },
          error: null,
        }),
        getUserById: async (id: string) => {
          const found = users.find((candidate) => candidate.id === id) ?? null;
          return found ? { data: { user: found }, error: null } : { data: { user: null }, error: { message: "not found" } };
        },
      },
    },
  } as unknown as SupabaseClient;
  const log = () => tables.lifecycle_email_log!;
  return { admin, tables, users, errors, operations, log };
}

type SentMail = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
  scheduled_at?: string;
  tags?: Array<{ name: string; value: string }>;
};

let db: ReturnType<typeof makeDatabase>;
let sent: SentMail[];
let transport: ReturnType<typeof vi.fn<typeof fetch>>;
let waits: number[];
let logLines: string[];

function useDatabase(seed: Parameters<typeof makeDatabase>[0]) {
  db = makeDatabase(seed);
  mocks.admin.mockImplementation(() => db.admin);
}

function cronRequest() {
  return new Request(`${SITE}/api/cron/send-lifecycle-emails`, {
    headers: { authorization: `Bearer ${CRON_SECRET}` },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.guaranteeEnabled.value = true;
  mocks.paidUserIds.mockResolvedValue([]);
  mocks.setMarketingOptOut.mockResolvedValue(true);
  vi.stubEnv("CRON_SECRET", CRON_SECRET);
  vi.stubEnv("LIFECYCLE_EMAILS_MODE", "live");
  vi.stubEnv("SHARE_LINK_SECRET", "mock-signing-key");
  vi.stubEnv("RESEND_API_KEY", "mock-resend-key");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE);
  vi.stubEnv("EMAIL_POSTAL_ADDRESS", TEST_POSTAL_ADDRESS);
  useDatabase({});
  sent = [];
  transport = vi.fn<typeof fetch>(async (url, init) => {
    if (url !== "https://api.resend.com/emails") throw new Error(`Unexpected network call in test: ${String(url)}`);
    sent.push(JSON.parse(String(init?.body)) as SentMail);
    return Response.json({ id: `message-${sent.length}` });
  });
  vi.stubGlobal("fetch", transport);
  waits = [];
  vi.spyOn(pacing, "wait").mockImplementation(async (ms: number) => { waits.push(ms); });
  logLines = [];
  vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => { logLines.push(args.join(" ")); });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function expectCompliant(mail: SentMail, userId: string) {
  const unsubscribeUrl = buildLifecycleUnsubscribeUrl(SITE, userId)!;
  expect(mail.headers).toEqual({
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  });
  expect(mail.html).toContain(`href="${unsubscribeUrl}"`);
  expect(mail.html).toContain(TEST_POSTAL_ADDRESS);
  if (mail.text !== undefined) {
    expect(mail.text).toContain(`Unsubscribe: ${unsubscribeUrl}`);
    expect(mail.text).toContain(TEST_POSTAL_ADDRESS);
  }
}

describe("the lifecycle send gate", () => {
  it("opens only when the mode is live, the address is set and the link can be signed", () => {
    expect(lifecycleSendGate(SITE)).toEqual({ open: true, postalAddress: TEST_POSTAL_ADDRESS });
  });

  it.each([
    ["an unset address", undefined],
    ["an empty address", ""],
    ["a blank address", "  \n "],
  ])("stays closed with %s", (_label, value) => {
    vi.stubEnv("EMAIL_POSTAL_ADDRESS", value);
    expect(readEmailPostalAddress()).toBeNull();
    expect(lifecycleSendGate(SITE)).toEqual({ open: false, reason: "postal_address_missing" });
    expect(describeLifecycleBlock("postal_address_missing")).toBe("EMAIL_POSTAL_ADDRESS is not set");
  });

  it("stays closed when the unsubscribe link cannot be signed", () => {
    vi.stubEnv("SHARE_LINK_SECRET", "");
    expect(lifecycleSendGate(SITE)).toEqual({ open: false, reason: "unsubscribe_unsignable" });
    vi.stubEnv("SHARE_LINK_SECRET", "mock-signing-key");
    expect(lifecycleSendGate("http://usetruecap.com")).toEqual({ open: false, reason: "unsubscribe_unsignable" });
    expect(lifecycleSendGate("not a url")).toEqual({ open: false, reason: "unsubscribe_unsignable" });
  });

  it.each([
    ["off", "mode_off"],
    ["", "mode_off"],
    ["anything-else", "mode_off"],
    ["dry", "mode_dry"],
    ["dry-run", "mode_dry"],
  ])("stays closed in mode %j", (mode, reason) => {
    vi.stubEnv("LIFECYCLE_EMAILS_MODE", mode);
    expect(lifecycleSendGate(SITE)).toEqual({ open: false, reason });
  });

  it("puts a multi-line address on one line", () => {
    vi.stubEnv("EMAIL_POSTAL_ADDRESS", "  Line one\n  Line two  ");
    expect(readEmailPostalAddress()).toBe("Line one Line two");
  });
});

describe("the lifecycle unsubscribe link", () => {
  it("is the existing account opt-out token, signed for that user only", () => {
    const url = new URL(buildLifecycleUnsubscribeUrl(SITE, uid(1))!);
    expect(url.origin + url.pathname).toBe(`${SITE}/email/unsubscribe`);
    const token = url.searchParams.get("token")!;
    expect(readSignedToken(UNSUBSCRIBE_TOKEN_SCOPE, token)).toEqual({ u: uid(1) });
    expect(readSignedToken("drip-unsubscribe", token)).toBeNull();
    expect(buildLifecycleUnsubscribeUrl(SITE, uid(2))).not.toBe(url.toString());
  });

  it.each(["", "not-a-user-id", `${uid(1)}x`])("is refused for an id the route would reject: %j", (id) => {
    expect(buildLifecycleUnsubscribeUrl(SITE, id)).toBeNull();
  });

  it("lists the URL alone, with the one-click header", () => {
    expect(buildLifecycleUnsubscribeHeaders("https://example.test/u")).toEqual({
      "List-Unsubscribe": "<https://example.test/u>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });

  it("is accepted by /email/unsubscribe: GET confirms, the one-click POST stores the opt-out", async () => {
    const url = buildLifecycleUnsubscribeUrl(SITE, uid(1))!;
    const page = await unsubscribeGet(new Request(url));
    expect(page.status).toBe(200);
    expect(await page.text()).toContain(
      "Unsubscribe from TrueCap account emails (onboarding, tips, offers and feedback requests)?",
    );
    expect(mocks.setMarketingOptOut).not.toHaveBeenCalled();

    const done = await unsubscribePost(new Request(url, { method: "POST", body: "List-Unsubscribe=One-Click" }));
    expect(done.status).toBe(200);
    expect(mocks.setMarketingOptOut).toHaveBeenCalledWith(db.admin, uid(1));
    // The account opt-out does not stop a checklist or playbook sequence;
    // the page must not say it does.
    expect(await done.text()).toContain("Checklist and playbook emails have their own unsubscribe link.");
  });

  it("does not say unsubscribed when the opt-out was not stored", async () => {
    mocks.setMarketingOptOut.mockResolvedValue(false);
    const url = buildLifecycleUnsubscribeUrl(SITE, uid(1))!;
    const response = await unsubscribePost(new Request(url, { method: "POST", body: "List-Unsubscribe=One-Click" }));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("You're unsubscribed");
  });
});

describe("every lifecycle email carries the unsubscribe link and the postal address", () => {
  const due: DueLifecycleEmail[] = [
    { userId: uid(1), email: "user1@example.com", kind: "welcome", key: "welcome" },
    ...Array.from({ length: MAX_DRIP_DAY }, (_, index): DueLifecycleEmail => ({
      userId: uid(1),
      email: "user1@example.com",
      kind: "drip",
      key: `drip_${index + 1}`,
      dripDay: index + 1,
    })),
    { userId: uid(1), email: "user1@example.com", kind: "pro_nudge", key: "pro_nudge" },
    { userId: uid(1), email: "user1@example.com", kind: "winback", key: "winback_21d" },
  ];

  it("covers the 33 emails the cron can send", () => {
    expect(due).toHaveLength(33);
  });

  it.each(due.map((item) => [item.key, item] as const))("%s", async (_key, item) => {
    const unsubscribeUrl = buildLifecycleUnsubscribeUrl(SITE, item.userId)!;
    const out = await renderLifecycleEmail(item, SITE, { unsubscribeUrl, postalAddress: TEST_POSTAL_ADDRESS });
    expect(out).not.toBeNull();
    const hrefs = [...out!.html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
    expect(hrefs.filter((href) => href === unsubscribeUrl)).toHaveLength(1);
    expect(out!.html).toContain(">Unsubscribe</a>");
    expect(out!.html).toContain(TEST_POSTAL_ADDRESS);
    expect(out!.text).toContain(`Unsubscribe: ${unsubscribeUrl}`);
    expect(out!.text).toContain(TEST_POSTAL_ADDRESS);
  });

  it("prints no address and no link when the caller has none (a dry preview only)", async () => {
    const out = await renderLifecycleEmail(due[0]!, SITE, { unsubscribeUrl: null, postalAddress: null });
    expect(out!.html).not.toContain("/email/unsubscribe");
    expect(out!.html).not.toContain(TEST_POSTAL_ADDRESS);
    // The /settings link names the page; it is not an email opt-out.
    expect(out!.html).toMatch(/Account settings<\/a><\/p>/);
    expect(out!.html).not.toContain("Manage email preferences");
    expect(out!.text).toContain(`Account settings: ${SITE}/settings`);
    expect(out!.text).not.toContain("Unsubscribe");
  });
});

describe("the welcome age guard", () => {
  it("uses the drip's own slack", () => {
    expect(WELCOME_MAX_AGE_DAYS).toBe(DRIP_CATCH_UP_GRACE_DAYS);
  });

  it("passes a new account and stops an old one", () => {
    const now = new Date("2026-10-02T14:00:00Z");
    const signedUp = (days: number) => new Date(now.getTime() - days * DAY_MS).toISOString();
    expect(welcomeWindowPassed(signedUp(0), now)).toBe(false);
    expect(welcomeWindowPassed(signedUp(WELCOME_MAX_AGE_DAYS), now)).toBe(false);
    expect(welcomeWindowPassed(signedUp(WELCOME_MAX_AGE_DAYS + 1), now)).toBe(true);
    expect(welcomeWindowPassed(signedUp(40), now)).toBe(true);
    expect(welcomeWindowPassed("not a date", now)).toBe(true);
  });
});

describe("the lifecycle cron", () => {
  it("sends nothing, reads nothing and logs one line while the postal address is unset", async () => {
    vi.stubEnv("EMAIL_POSTAL_ADDRESS", "");
    useDatabase({ users: [user(1, 0)], profiles: [profile(1)] });
    const response = await runCron(cronRequest());
    expect(await response.json()).toEqual({ mode: "live", blocked: true, reason: "postal_address_missing", sent: 0 });
    expect(transport).not.toHaveBeenCalled();
    expect(mocks.admin).not.toHaveBeenCalled();
    expect(logLines).toEqual(["[lifecycle] BLOCKED — nothing sent: EMAIL_POSTAL_ADDRESS is not set"]);
  });

  it("sends nothing and logs one line when the unsubscribe link cannot be signed", async () => {
    vi.stubEnv("SHARE_LINK_SECRET", "");
    useDatabase({ users: [user(1, 0)], profiles: [profile(1)] });
    const response = await runCron(cronRequest());
    expect(await response.json()).toMatchObject({ blocked: true, reason: "unsubscribe_unsignable", sent: 0 });
    expect(transport).not.toHaveBeenCalled();
    expect(mocks.admin).not.toHaveBeenCalled();
    expect(logLines).toHaveLength(1);
    expect(logLines[0]).toContain("the unsubscribe link cannot be signed");
  });

  it("sends nothing when the opt-outs cannot be read", async () => {
    useDatabase({ users: [user(1, 0)], profiles: [profile(1)] });
    db.errors.add("profiles:select");
    const response = await runCron(cronRequest());
    expect(await response.json()).toMatchObject({ blocked: true, reason: "opt_out_unreadable", sent: 0 });
    expect(transport).not.toHaveBeenCalled();
    expect(db.log()).toHaveLength(0);
    expect(logLines).toEqual(["[lifecycle] BLOCKED — nothing sent: marketing opt-outs could not be read"]);
  });

  it("sends a new account its welcome with the link, the address and the one-click headers", async () => {
    useDatabase({ users: [user(1, 0)], profiles: [profile(1)] });
    const response = await runCron(cronRequest());
    expect(await response.json()).toMatchObject({ mode: "live", sent: 1, due: 1, stopped: null });
    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toBe("user1@example.com");
    expectCompliant(sent[0]!, uid(1));
    expect(db.log()).toEqual([expect.objectContaining({ user_id: uid(1), email_key: "welcome", resend_id: "message-1" })]);
  });

  it("skips an opted-out user and a user with no profile row", async () => {
    useDatabase({
      users: [user(1, 0), user(2, 0), user(3, 0)],
      profiles: [profile(1), profile(2, { marketing_opt_out: true })],
    });
    const response = await runCron(cronRequest());
    expect(await response.json()).toMatchObject({ sent: 1, due: 1, skippedOptedOut: 1, skippedNoProfile: 1 });
    expect(sent.map((mail) => mail.to)).toEqual(["user1@example.com"]);
    expect(db.log().map((row) => row.user_id)).toEqual([uid(1)]);
  });

  it("gives a 40-day-old account no welcome when the block lifts", async () => {
    // The account signed up while nothing could send: no welcome on record.
    useDatabase({ users: [user(1, 40), user(2, 1)], profiles: [profile(1), profile(2)] });

    vi.stubEnv("EMAIL_POSTAL_ADDRESS", "");
    await runCron(cronRequest());
    expect(transport).not.toHaveBeenCalled();
    expect(db.log()).toHaveLength(0);

    // The address is set: the block lifts.
    vi.stubEnv("EMAIL_POSTAL_ADDRESS", TEST_POSTAL_ADDRESS);
    const response = await runCron(cronRequest());
    const summary = await response.json();

    // Only the day-old account is written to, and only with its welcome.
    expect(sent.map((mail) => mail.to)).toEqual(["user2@example.com"]);
    expect(summary).toMatchObject({ sent: 1, due: 1, welcomesRetired: 1, dripDaysRetired: MAX_DRIP_DAY });
    const old = db.log().filter((row) => row.user_id === uid(1));
    expect(old).toHaveLength(1 + MAX_DRIP_DAY);
    expect(old.every((row) => row.resend_id === DRIP_SKIPPED_RESEND_ID)).toBe(true);
    expect(old.map((row) => row.email_key)).toContain("welcome");

    // And it stays that way on the next run.
    sent.length = 0;
    await runCron(cronRequest());
    expect(sent.map((mail) => mail.to)).not.toContain("user1@example.com");
  });

  it("retires, and never sends, drip days whose window passed during the block", async () => {
    // Day 12 of the drip: days 1 to 7 are past their window, day 8 is the
    // earliest one still inside it.
    useDatabase({
      users: [user(1, 12)],
      profiles: [profile(1)],
      log: [{ user_id: uid(1), email_key: "welcome", resend_id: "earlier" }],
    });
    await runCron(cronRequest());
    expect(sent).toHaveLength(1);
    const keys = db.log().filter((row) => row.resend_id === DRIP_SKIPPED_RESEND_ID).map((row) => row.email_key);
    expect(keys).toEqual(["drip_1", "drip_2", "drip_3", "drip_4", "drip_5", "drip_6", "drip_7"]);
    expect(db.log().find((row) => row.email_key === "drip_8")).toMatchObject({ resend_id: "message-1" });
  });

  it("previews in dry mode without sending, and says a live run is blocked", async () => {
    vi.stubEnv("LIFECYCLE_EMAILS_MODE", "dry");
    vi.stubEnv("EMAIL_POSTAL_ADDRESS", "");
    useDatabase({ users: [user(1, 0), user(2, 40)], profiles: [profile(1), profile(2)] });
    const response = await runCron(cronRequest());
    const summary = await response.json();
    expect(summary).toMatchObject({
      mode: "dry",
      wouldSendCount: 1,
      wouldRetireWelcomes: 1,
      wouldRetireDripDays: MAX_DRIP_DAY,
      sendBlocked: "postal_address_missing",
    });
    expect(transport).not.toHaveBeenCalled();
    expect(db.log()).toHaveLength(0);
    expect(logLines).toHaveLength(1);
    expect(logLines[0]).toMatch(/^\[lifecycle\] DRY RUN — 1 emails would send/);
    expect(logLines[0]).toContain("a live run would send nothing: EMAIL_POSTAL_ADDRESS is not set");
  });

  it("keeps a fixed gap between Resend requests", async () => {
    useDatabase({ users: [user(1, 0), user(2, 0), user(3, 0)], profiles: [profile(1), profile(2), profile(3)] });
    await runCron(cronRequest());
    expect(sent).toHaveLength(3);
    expect(waits).toEqual([SEND_GAP_MS, SEND_GAP_MS]);
  });

  it("releases the claim on a rate-limit 429 so the next run retries, and goes on", async () => {
    useDatabase({ users: [user(1, 0), user(2, 0)], profiles: [profile(1), profile(2)] });
    transport.mockImplementationOnce(async () =>
      Response.json({ statusCode: 429, name: "rate_limit_exceeded", message: "Too many requests" }, {
        status: 429,
        headers: { "retry-after": "2" },
      }),
    );
    const response = await runCron(cronRequest());
    expect(await response.json()).toMatchObject({ sent: 1, due: 2, released: 1, stopped: null });
    expect(db.log().map((row) => row.user_id)).toEqual([uid(2)]);
    expect(waits).toEqual([2_000, SEND_GAP_MS]);

    // The released welcome goes out on the next run.
    const again = await runCron(cronRequest());
    expect(await again.json()).toMatchObject({ sent: 1, due: 1 });
    expect(db.log().map((row) => row.user_id).sort()).toEqual([uid(1), uid(2)]);
  });

  it("stops the run with one alert when the daily quota is used up", async () => {
    useDatabase({
      users: [user(1, 0), user(2, 0), user(3, 0)],
      profiles: [profile(1), profile(2), profile(3)],
    });
    transport
      .mockImplementationOnce(async () => Response.json({ id: "message-1" }))
      .mockImplementationOnce(async () =>
        Response.json({ statusCode: 429, name: "daily_quota_exceeded", message: "quota" }, { status: 429 }),
      );
    const response = await runCron(cronRequest());
    expect(await response.json()).toMatchObject({ sent: 1, due: 3, released: 1, stopped: "daily_quota" });
    // Two requests only: the third user was never claimed or attempted.
    expect(transport).toHaveBeenCalledTimes(2);
    expect(db.log().map((row) => row.user_id)).toEqual([uid(1)]);
    const alerts = mocks.captureMessage.mock.calls.filter(([message]) => String(message).includes("run stopped early"));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]![0]).toBe("lifecycle cron: run stopped early (daily_quota)");
    expect(JSON.stringify(alerts)).not.toContain("@example.com");
  });

  it("stops after repeated rate limits instead of hammering the provider", async () => {
    const count = MAX_RATE_LIMIT_HITS + 2;
    useDatabase({
      users: Array.from({ length: count }, (_, index) => user(index + 1, 0)),
      profiles: Array.from({ length: count }, (_, index) => profile(index + 1)),
    });
    transport.mockImplementation(async () =>
      Response.json({ statusCode: 429, name: "rate_limit_exceeded", message: "Too many requests" }, { status: 429 }),
    );
    const response = await runCron(cronRequest());
    expect(await response.json()).toMatchObject({ sent: 0, released: MAX_RATE_LIMIT_HITS, stopped: "rate_limit" });
    expect(transport).toHaveBeenCalledTimes(MAX_RATE_LIMIT_HITS);
    expect(db.log()).toHaveLength(0);
  });

  it("stops with one warning when the run's time budget is used up, leaving the rest unclaimed", async () => {
    useDatabase({ users: [user(1, 0), user(2, 0)], profiles: [profile(1), profile(2)] });
    const realNow = Date.now.bind(Date);
    let calls = 0;
    // The first reading is the start of the run; every later one is past the budget.
    vi.spyOn(Date, "now").mockImplementation(() => (calls++ === 0 ? realNow() : realNow() + RUN_BUDGET_MS + 1_000));
    const response = await runCron(cronRequest());
    expect(await response.json()).toMatchObject({ sent: 0, due: 2, stopped: "time_budget" });
    expect(transport).not.toHaveBeenCalled();
    expect(db.log()).toHaveLength(0);
    const alerts = mocks.captureMessage.mock.calls.filter(([message]) => String(message).includes("run stopped early"));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]![1]).toMatchObject({ level: "warning" });
  });

  it("classifies a 429 by Resend's error name and bounds the retry wait", () => {
    expect(classifyResend429(JSON.stringify({ name: "daily_quota_exceeded" }))).toBe("daily_quota");
    expect(classifyResend429(JSON.stringify({ name: "monthly_quota_exceeded" }))).toBe("monthly_quota");
    expect(classifyResend429(JSON.stringify({ name: "rate_limit_exceeded" }))).toBe("rate_limit");
    expect(classifyResend429("<html>")).toBe("rate_limit");
    expect(retryAfterMs(null)).toBe(1_000);
    expect(retryAfterMs("0.2")).toBe(1_000);
    expect(retryAfterMs("3")).toBe(3_000);
    expect(retryAfterMs("600")).toBe(5_000);
  });
});

describe("the instant welcome (sendLifecycleEmailNow)", () => {
  const welcome = (n: number): DueLifecycleEmail => ({
    userId: uid(n),
    email: `user${n}@example.com`,
    kind: "welcome",
    key: "welcome",
  });

  it("sends a new account its welcome with the link, the address and the headers", async () => {
    useDatabase({ users: [user(1, 0)], profiles: [profile(1)] });
    expect(await sendLifecycleEmailNow(welcome(1), SITE)).toEqual({ sent: true });
    expect(sent).toHaveLength(1);
    expectCompliant(sent[0]!, uid(1));
  });

  it("sends nothing and logs one line while the postal address is unset", async () => {
    vi.stubEnv("EMAIL_POSTAL_ADDRESS", "");
    useDatabase({ users: [user(1, 0)], profiles: [profile(1)] });
    expect(await sendLifecycleEmailNow(welcome(1), SITE)).toEqual({ sent: false, reason: "postal_address_missing" });
    expect(transport).not.toHaveBeenCalled();
    expect(mocks.admin).not.toHaveBeenCalled();
    expect(logLines).toEqual(["[lifecycle] BLOCKED — welcome not sent: EMAIL_POSTAL_ADDRESS is not set"]);
  });

  it.each(["off", "dry"])("stays silent in mode %s", async (mode) => {
    vi.stubEnv("LIFECYCLE_EMAILS_MODE", mode);
    expect(await sendLifecycleEmailNow(welcome(1), SITE)).toEqual({ sent: false, reason: "mode_not_live" });
    expect(transport).not.toHaveBeenCalled();
    expect(logLines).toEqual([]);
  });

  it("gives a 40-day-old account no welcome when it next signs in", async () => {
    useDatabase({ users: [user(1, 40)], profiles: [profile(1)] });
    expect(await sendLifecycleEmailNow(welcome(1), SITE)).toEqual({ sent: false, reason: "welcome_window_passed" });
    expect(transport).not.toHaveBeenCalled();
    expect(db.log()).toHaveLength(0);
  });

  it.each([
    ["an opted-out user", [profile(1, { marketing_opt_out: true })], "opted_out"],
    ["a user with no profile row", [], "no_profile"],
  ])("does not email %s", async (_label, profiles, reason) => {
    useDatabase({ users: [user(1, 0)], profiles });
    expect(await sendLifecycleEmailNow(welcome(1), SITE)).toEqual({ sent: false, reason });
    expect(transport).not.toHaveBeenCalled();
    expect(db.log()).toHaveLength(0);
  });

  it("does not email when the opt-out cannot be read", async () => {
    useDatabase({ users: [user(1, 0)], profiles: [profile(1)] });
    db.errors.add("profiles:select");
    expect(await sendLifecycleEmailNow(welcome(1), SITE)).toEqual({ sent: false, reason: "opt_out_unreadable" });
    expect(transport).not.toHaveBeenCalled();
  });
});

describe("the legacy trial emails", () => {
  const input = { userId: uid(1), email: "user1@example.com" };

  it("schedules the day-1 pitch with the link, the address and the headers; the day-10 billing notice without a link", async () => {
    useDatabase({ users: [user(1, 0)], profiles: [profile(1)] });
    expect(await scheduleTrialOnboardingEmails(db.admin, input)).toEqual({ scheduled: 2, skipped: 0 });
    expect(sent).toHaveLength(2);
    const [pitch, notice] = sent;
    expectCompliant(pitch!, uid(1));
    expect(notice!.headers).toBeUndefined();
    expect(notice!.html).not.toContain("/email/unsubscribe");
    expect(notice!.html).toContain(TEST_POSTAL_ADDRESS);
  });

  // Founder answer 2: nothing sends until EMAIL_POSTAL_ADDRESS is set. The
  // day-10 billing notice is gated on LIFECYCLE_EMAILS_MODE like the pitch,
  // so it waits for the address too.
  it("schedules neither trial email while the postal address is unset, and reads nothing", async () => {
    vi.stubEnv("EMAIL_POSTAL_ADDRESS", "");
    useDatabase({ users: [user(1, 0)], profiles: [profile(1)] });
    expect(await scheduleTrialOnboardingEmails(db.admin, input)).toEqual({
      scheduled: 0,
      skipped: 2,
      reason: "postal_address_missing",
    });
    expect(transport).not.toHaveBeenCalled();
    expect(db.operations).toEqual([]);
    expect(db.log()).toHaveLength(0);
    expect(logLines).toEqual(["[lifecycle] BLOCKED — trial emails not scheduled: EMAIL_POSTAL_ADDRESS is not set"]);
  });

  it("schedules neither trial email while the unsubscribe link cannot be signed", async () => {
    vi.stubEnv("SHARE_LINK_SECRET", "");
    useDatabase({ users: [user(1, 0)], profiles: [profile(1)] });
    expect(await scheduleTrialOnboardingEmails(db.admin, input)).toEqual({
      scheduled: 0,
      skipped: 2,
      reason: "unsubscribe_unsignable",
    });
    expect(transport).not.toHaveBeenCalled();
    expect(db.operations).toEqual([]);
    expect(logLines).toHaveLength(1);
    expect(logLines[0]).toMatch(/^\[lifecycle\] BLOCKED — trial emails not scheduled: the unsubscribe link cannot be signed/);
  });

  it("does not schedule the pitch for an opted-out user; the billing notice still goes", async () => {
    useDatabase({ users: [user(1, 0)], profiles: [profile(1, { marketing_opt_out: true })] });
    expect(await scheduleTrialOnboardingEmails(db.admin, input)).toEqual({ scheduled: 1, skipped: 1 });
    expect(db.log().map((row) => row.email_key)).toEqual(["trial_day10"]);
  });

  it("still schedules nothing when the mode is not live", async () => {
    vi.stubEnv("LIFECYCLE_EMAILS_MODE", "dry");
    useDatabase({ users: [user(1, 0)], profiles: [profile(1)] });
    expect(await scheduleTrialOnboardingEmails(db.admin, input)).toMatchObject({ scheduled: 0, skipped: 2 });
    expect(transport).not.toHaveBeenCalled();
  });

  it("still schedules nothing while the guarantee flag is off", async () => {
    mocks.guaranteeEnabled.value = false;
    useDatabase({ users: [user(1, 0)], profiles: [profile(1)] });
    expect(await scheduleTrialOnboardingEmails(db.admin, input)).toEqual({
      scheduled: 0,
      skipped: 2,
      reason: "guarantee_disabled",
    });
    expect(transport).not.toHaveBeenCalled();
  });
});
