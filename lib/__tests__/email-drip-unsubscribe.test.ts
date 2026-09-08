import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const mocks = vi.hoisted(() => ({
  admin: vi.fn(), claim: vi.fn(), release: vi.fn(), setMarketingOptOut: vi.fn(), captureMessage: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabaseClient: mocks.admin }));
vi.mock("@/lib/email-capture-guard", () => ({ claimEmailCaptureSlot: mocks.claim, releaseEmailCaptureSlot: mocks.release }));
vi.mock("@/lib/testimonials/store", () => ({ setMarketingOptOut: mocks.setMarketingOptOut }));
vi.mock("@sentry/nextjs", () => ({ captureMessage: mocks.captureMessage }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "192.0.2.10" }) }));

import { capturePostAnalysisEmail } from "@/app/actions/post-analysis-email-capture";
import { captureLeadMagnetEmail } from "@/app/actions/lead-magnet-capture";
import { GET, POST } from "@/app/email/unsubscribe/route";
import {
  buildDripUnsubscribeUrl, DRIP_UNSUBSCRIBE_TOKEN_SCOPE, hashDripEmail,
  isDripEmailSuppressed, recordDripSchedule, suppressDripEmail,
} from "@/lib/email-drip-unsubscribe";
import { mintSignedToken, readSignedToken } from "@/lib/signed-token";

type Row = Record<string, unknown>;
function makeDatabase() {
  const tables: Record<string, Row[]> = { email_suppressions: [], email_drip_schedules: [] };
  const operations: Array<{ table: string; method: string; value?: Row }> = [];
  const errors: Record<string, "error" | "throw"> = {};
  let onQuery: ((table: string, method: string) => void) | undefined;
  const from = vi.fn((table: string) => {
    let method = "select";
    let value: Row | undefined;
    let single = false;
    const filters: Array<(row: Row) => boolean> = [];
    const query = {
      select: () => { method = "select"; return query; },
      insert: (input: Row) => { method = "insert"; value = input; return query; },
      upsert: (input: Row) => { method = "upsert"; value = input; return query; },
      update: (input: Row) => { method = "update"; value = input; return query; },
      eq: (key: string, input: unknown) => { filters.push(row => row[key] === input); return query; },
      is: (key: string, input: unknown) => { filters.push(row => (row[key] ?? null) === input); return query; },
      gt: (key: string, input: string) => { filters.push(row => typeof row[key] === "string" && row[key] > input); return query; },
      maybeSingle: () => { single = true; return query; },
      then: (resolve: (result: { data: Row[] | Row | null; error: unknown }) => unknown, reject: (error: Error) => unknown) => {
        try {
          operations.push({ table, method, value });
          onQuery?.(table, method);
          const error = errors[`${table}:${method}`];
          if (error === "throw") throw new Error("private database detail");
          if (error) return Promise.resolve(resolve({ data: null, error: { message: "private database detail" } }));
          const rows = tables[table]!;
          const found = rows.filter(row => filters.every(filter => filter(row)));
          if (method === "insert") rows.push({ ...value });
          if (method === "upsert" && !rows.some(row => row.email_hash === value?.email_hash)) rows.push({ ...value });
          if (method === "update") found.forEach(row => Object.assign(row, value));
          return Promise.resolve(resolve({ data: single ? found[0] ?? null : found, error: null }));
        } catch (error) { return Promise.resolve(reject(error as Error)); }
      },
    };
    return query;
  });
  return { admin: { from } as unknown as SupabaseClient, tables, operations, errors, setOnQuery: (fn: typeof onQuery) => { onQuery = fn; } };
}

const EMAIL = "reader@example.com";
const HASH = hashDripEmail(EMAIL);
const FUTURE = "2030-01-01T00:00:00.000Z";
let db: ReturnType<typeof makeDatabase>;
let transport: ReturnType<typeof vi.fn<typeof fetch>>;
let sent: Array<Record<string, unknown>>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SHARE_LINK_SECRET", "mock-signing-key");
  vi.stubEnv("RESEND_API_KEY", "mock-resend-key");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://usetruecap.com");
  vi.stubEnv("POST_ANALYSIS_COUPON_CODE", "WELCOME");
  vi.stubEnv("POST_ANALYSIS_COUPON_ID", "mock-coupon");
  db = makeDatabase();
  mocks.admin.mockImplementation(() => db.admin);
  mocks.claim.mockResolvedValue({ allowed: true, emailBucketKey: "bucket" });
  mocks.release.mockResolvedValue(undefined);
  mocks.setMarketingOptOut.mockResolvedValue(undefined);
  sent = [];
  transport = vi.fn<typeof fetch>(async (url, init) => {
    if (url === "https://api.resend.com/emails") {
      sent.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return Response.json({ id: `message-${sent.length}` });
    }
    if (String(url).endsWith("/cancel")) return Response.json({ id: "cancelled" });
    throw new Error("Unexpected provider call in test");
  });
  vi.stubGlobal("fetch", transport);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

function queued(id = "pending", extra: Row = {}) {
  db.tables.email_drip_schedules!.push({ email_hash: HASH, resend_id: id, scheduled_at: FUTURE, cancelled_at: null, ...extra });
}
function unsubscribeRequest(method = "POST", url = buildDripUnsubscribeUrl("https://usetruecap.com", EMAIL)!) {
  return new Request(url, { method, ...(method === "POST" ? { body: "List-Unsubscribe=One-Click" } : {}) });
}

describe("drip tokens", () => {
  it("normalizes addresses and signs only their hash under a distinct scope", () => {
    expect(hashDripEmail(" Reader@Example.COM ")).toBe(HASH);
    const url = new URL(buildDripUnsubscribeUrl("https://usetruecap.com/", EMAIL)!);
    const token = url.searchParams.get("token")!;
    expect(readSignedToken(DRIP_UNSUBSCRIBE_TOKEN_SCOPE, token)).toEqual({ e: HASH });
    expect(readSignedToken("marketing-unsubscribe", token)).toBeNull();
    expect(Buffer.from(token, "base64url").toString()).not.toContain(EMAIL);
  });
  it.each(["http://usetruecap.com", "https://user:password@usetruecap.com", "invalid"])("rejects unusable unsubscribe origin %s", origin => {
    expect(buildDripUnsubscribeUrl(origin, EMAIL)).toBeNull();
  });
  it("rejects invalid, tampered, wrong-scope and wrong-payload tokens before DB access", async () => {
    const valid = new URL(buildDripUnsubscribeUrl("https://usetruecap.com", EMAIL)!).searchParams.get("token")!;
    const changed = JSON.parse(Buffer.from(valid, "base64url").toString());
    changed.e = "a".repeat(64);
    for (const token of ["", "junk", Buffer.from(JSON.stringify(changed)).toString("base64url"),
      mintSignedToken("other", { e: HASH })!, mintSignedToken(DRIP_UNSUBSCRIBE_TOKEN_SCOPE, { e: "invalid" })!]) {
      const response = await GET(new Request(`https://usetruecap.com/email/unsubscribe?token=${token}`));
      expect(response.status).toBe(400);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
    expect(mocks.admin).not.toHaveBeenCalled();
  });
});

const captureCases = [
  { name: "post-analysis", capture: capturePostAnalysisEmail, count: 5 },
  { name: "lead-magnet", capture: captureLeadMagnetEmail, count: 3 },
];
describe.each(captureCases)("$name capture", ({ name, capture, count }) => {
  it("adds a working footer and one-click headers to every message and records all provider IDs", async () => {
    const result = await capture({ email: EMAIL });
    expect(result).toMatchObject({ ok: true, scheduledCount: count });
    expect(sent).toHaveLength(count);
    const unsubscribeUrl = buildDripUnsubscribeUrl("https://usetruecap.com", EMAIL)!;
    for (const mail of sent) {
      expect(mail.headers).toMatchObject({ "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" });
      expect((mail.headers as Record<string, string>)["List-Unsubscribe"]).toContain(`<${unsubscribeUrl}>`);
      expect(mail.html).toContain(`href="${unsubscribeUrl}"`);
    }
    expect(db.tables.email_drip_schedules).toHaveLength(count);
    expect(db.tables.email_drip_schedules![0]).toMatchObject({ email_hash: HASH, surface: name, resend_id: "message-1", scheduled_at: null });
    expect(db.tables.email_drip_schedules![1]?.scheduled_at).toBe(sent[1]?.scheduled_at);
    expect(JSON.stringify(db.tables)).not.toContain(EMAIL);
    expect(mocks.claim.mock.invocationCallOrder[0]).toBeLessThan(transport.mock.invocationCallOrder[0]!);
  });
  it("silently skips a suppressed recipient before claiming a slot", async () => {
    db.tables.email_suppressions!.push({ email_hash: HASH });
    const result = await capture({ email: "Reader@Example.COM" });
    expect(result).toMatchObject({ ok: true, scheduledCount: 0 });
    if (name === "lead-magnet") expect(result).toHaveProperty("downloadUrl", "https://usetruecap.com/playbook");
    expect(mocks.claim).not.toHaveBeenCalled();
    expect(transport).not.toHaveBeenCalled();
  });
  it.each(["error", "throw"] as const)("fails closed before claim when suppression lookup returns %s", async mode => {
    db.errors["email_suppressions:select"] = mode;
    const result = await capture({ email: EMAIL });
    expect(result).toMatchObject({ ok: false, code: "SEND_FAILED" });
    // The playbook needs no email: a blocked send never withholds the asset.
    if (name === "lead-magnet") expect(result).toHaveProperty("downloadUrl", "https://usetruecap.com/playbook");
    expect(mocks.claim).not.toHaveBeenCalled();
    expect(transport).not.toHaveBeenCalled();
    expect(JSON.stringify(mocks.captureMessage.mock.calls)).not.toContain("private database detail");
  });
  it("requires a signing secret and HTTPS before claiming or sending", async () => {
    vi.stubEnv("SHARE_LINK_SECRET", "");
    const withoutSecret = await capture({ email: EMAIL });
    expect(withoutSecret).toMatchObject({ ok: false, code: "CONFIG_MISSING" });
    if (name === "lead-magnet") expect(withoutSecret).toHaveProperty("downloadUrl", "https://usetruecap.com/playbook");
    vi.stubEnv("SHARE_LINK_SECRET", "mock-signing-key");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://usetruecap.com");
    expect(await capture({ email: EMAIL })).toMatchObject({ ok: false, code: "CONFIG_MISSING" });
    expect(mocks.claim).not.toHaveBeenCalled();
    expect(transport).not.toHaveBeenCalled();
  });
  it("hands over the asset when the guard is unavailable or the provider key is missing", async () => {
    mocks.claim.mockResolvedValueOnce({ allowed: false, reason: "UNAVAILABLE" });
    const guardDown = await capture({ email: EMAIL });
    expect(guardDown).toMatchObject({ ok: false, code: "SEND_FAILED" });
    vi.stubEnv("RESEND_API_KEY", "");
    const keyMissing = await capture({ email: EMAIL });
    expect(keyMissing).toMatchObject({ ok: false, code: "CONFIG_MISSING" });
    expect(mocks.release).toHaveBeenCalledWith("bucket");
    expect(transport).not.toHaveBeenCalled();
    if (name === "lead-magnet") {
      expect(guardDown).toHaveProperty("downloadUrl", "https://usetruecap.com/playbook");
      expect(keyMissing).toHaveProperty("downloadUrl", "https://usetruecap.com/playbook");
    }
  });
  it.each(["DUPLICATE", "IP_LIMIT", "GLOBAL_LIMIT", "UNAVAILABLE"])("preserves the abuse guard for %s", async reason => {
    mocks.claim.mockResolvedValue({ allowed: false, reason });
    const result = await capture({ email: EMAIL });
    expect(result.ok).toBe(reason === "DUPLICATE");
    expect(transport).not.toHaveBeenCalled();
  });
  it("rechecks suppression after the claim and immediately before sending", async () => {
    mocks.claim.mockImplementation(async () => {
      db.tables.email_suppressions!.push({ email_hash: HASH });
      return { allowed: true, emailBucketKey: "bucket" };
    });
    expect(await capture({ email: EMAIL })).toMatchObject({ ok: true, scheduledCount: 0 });
    expect(transport).not.toHaveBeenCalled();
    expect(mocks.release).toHaveBeenCalledWith("bucket");
  });
  it("stops and retains the claim on an uncertain provider timeout", async () => {
    transport.mockRejectedValue(new Error("timeout"));
    const result = await capture({ email: EMAIL });
    expect(result).toMatchObject({ ok: false, code: "SEND_FAILED" });
    if (name === "lead-magnet") expect(result).toHaveProperty("downloadUrl", "https://usetruecap.com/playbook");
    expect(transport).toHaveBeenCalledTimes(1);
    expect(mocks.release).not.toHaveBeenCalled();
  });
  it("refunds the slot when the sequence stops before anything is sent", async () => {
    // The pre-claim check passes; the in-loop recheck (before the first send)
    // fails. Zero sent, nothing uncertain → the 30-day claim goes back.
    let suppressionReads = 0;
    db.setOnQuery((table, method) => {
      if (table === "email_suppressions" && method === "select" && ++suppressionReads === 2) {
        db.errors["email_suppressions:select"] = "error";
      }
    });
    const result = await capture({ email: EMAIL });
    expect(result).toMatchObject({ ok: false, code: "SEND_FAILED" });
    if (name === "lead-magnet") expect(result).toHaveProperty("downloadUrl", "https://usetruecap.com/playbook");
    expect(transport).not.toHaveBeenCalled();
    expect(mocks.release).toHaveBeenCalledWith("bucket");
  });
  it("treats an accepted day-0 with no usable provider ID as a partial send", async () => {
    transport.mockResolvedValue(Response.json({}));
    // The day-0 message was accepted (in flight, uncancellable) — that is a
    // partial send, not a zero-sent failure: the claim stays and the user
    // hears success while the truncated follow-ups go to Sentry.
    expect(await capture({ email: EMAIL })).toMatchObject({ ok: true, scheduledCount: 1 });
    expect(transport).toHaveBeenCalledTimes(1);
    expect(mocks.release).not.toHaveBeenCalled();
    expect(JSON.stringify(mocks.captureMessage.mock.calls)).toContain("truncated after partial send");
  });
  it("reports a truncated sequence but succeeds once day-0 has left", async () => {
    transport.mockImplementationOnce(async (url, init) => {
      sent.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return Response.json({ id: "message-1" });
    }).mockRejectedValueOnce(new Error("timeout"));
    const result = await capture({ email: EMAIL });
    expect(result).toMatchObject({ ok: true, scheduledCount: 1 });
    if (name === "lead-magnet") expect(result).toHaveProperty("downloadUrl", "https://usetruecap.com/playbook");
    expect(sent).toHaveLength(1);
    expect(sent[0]?.scheduled_at).toBeUndefined();
    expect(transport).toHaveBeenCalledTimes(2);
    expect(mocks.release).not.toHaveBeenCalled();
    const reports = mocks.captureMessage.mock.calls.map(([message]) => String(message));
    expect(reports.some(message => message.includes("truncated after partial send"))).toBe(true);
  });
  it("cancels a future send if unsubscribe commits while the provider request is in flight", async () => {
    transport.mockImplementation(async (url, init) => {
      if (String(url).endsWith("/cancel")) return Response.json({ id: "cancelled" });
      const payload = JSON.parse(String(init?.body));
      sent.push(payload);
      if (payload.scheduled_at) {
        // The handler cannot see the in-flight ID yet; the recorder must
        // notice its suppression and cancel after the provider returns.
        expect((await POST(unsubscribeRequest())).status).toBe(200);
      }
      return Response.json({ id: `message-${sent.length}` });
    });
    expect(await capture({ email: EMAIL })).toMatchObject({ ok: true });
    expect(sent).toHaveLength(2);
    expect(db.tables.email_drip_schedules![1]?.cancelled_at).toEqual(expect.any(String));
    expect(transport.mock.calls.some(([url]) => String(url).endsWith("message-2/cancel"))).toBe(true);
  });
});

describe("schedule persistence", () => {
  const args = { emailHash: HASH, surface: "post-analysis" as const, resendId: "future-id", scheduledAt: FUTURE, apiKey: "mock-resend-key" };
  it("cancels a known future provider ID when persistence fails", async () => {
    db.errors["email_drip_schedules:insert"] = "error";
    await expect(recordDripSchedule(db.admin, args)).rejects.toThrow("safely recorded");
    expect(transport).toHaveBeenCalledWith("https://api.resend.com/emails/future-id/cancel", expect.objectContaining({ method: "POST" }));
  });
  it("cancels and stops when the post-insert suppression read becomes unavailable", async () => {
    db.errors["email_suppressions:select"] = "throw";
    await expect(recordDripSchedule(db.admin, args)).rejects.toThrow("safely recorded");
    expect(db.tables.email_drip_schedules![0]?.cancelled_at).toEqual(expect.any(String));
  });
  it("leaves a racing cancellation failure visible and pending for retry", async () => {
    db.tables.email_suppressions!.push({ email_hash: HASH });
    transport.mockResolvedValue(new Response(null, { status: 429 }));
    await expect(recordDripSchedule(db.admin, args)).rejects.toThrow("cancellation incomplete");
    expect(db.tables.email_drip_schedules![0]?.cancelled_at).toBeUndefined();
  });
  it("does not treat an unavailable read as permission to send", async () => {
    db.errors["email_suppressions:select"] = "error";
    await expect(isDripEmailSuppressed(db.admin, HASH)).rejects.toThrow("unavailable");
  });
});

describe("unsubscribe endpoint", () => {
  it("GET is a side-effect-free confirmation page whose form POSTs the token", async () => {
    // Mail-client link scanners GET every body href; a GET that acted would
    // unsubscribe recipients who never clicked and cancel their queued sends.
    queued("analysis", { surface: "post-analysis" });
    const url = buildDripUnsubscribeUrl("https://usetruecap.com", EMAIL)!;
    const token = new URL(url).searchParams.get("token")!;
    const response = await GET(unsubscribeRequest("GET", url));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("x-robots-tag")).toBe("noindex");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    const html = await response.text();
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).toContain('<form method="post" action="/email/unsubscribe">');
    expect(html).toContain(`<input type="hidden" name="token" value="${token}">`);
    expect(html).toContain("checklist and playbook emails");
    expect(db.tables.email_suppressions).toHaveLength(0);
    expect(db.tables.email_drip_schedules![0]?.cancelled_at).toBeNull();
    expect(mocks.admin).not.toHaveBeenCalled();
    expect(transport).not.toHaveBeenCalled();
    expect(mocks.setMarketingOptOut).not.toHaveBeenCalled();
  });
  it("GET confirms without acting on the account marketing token too", async () => {
    const token = mintSignedToken("marketing-unsubscribe", { u: "11111111-2222-4333-8444-555555555555" })!;
    const response = await GET(new Request(`https://usetruecap.com/email/unsubscribe?token=${token}`));
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("marketing emails");
    expect(mocks.setMarketingOptOut).not.toHaveBeenCalled();
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("POST saves suppression and cancels only future, uncancelled sends across surfaces", async () => {
    queued("analysis", { surface: "post-analysis" });
    queued("playbook", { surface: "lead-magnet" });
    queued("day-zero", { scheduled_at: null });
    queued("past", { scheduled_at: "2020-01-01T00:00:00Z" });
    queued("already-cancelled", { cancelled_at: "2026-01-01T00:00:00Z" });
    queued("other-recipient", { email_hash: "a".repeat(64) });
    const response = await POST(unsubscribeRequest());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(db.tables.email_suppressions).toHaveLength(1);
    expect(transport).toHaveBeenCalledTimes(2);
    expect((await POST(unsubscribeRequest())).status).toBe(200);
    expect(db.tables.email_suppressions).toHaveLength(1);
    expect(transport).toHaveBeenCalledTimes(2);
    expect(mocks.setMarketingOptOut).not.toHaveBeenCalled();
  });
  it("POST accepts the confirmation form's body token without a query string", async () => {
    queued();
    const token = new URL(buildDripUnsubscribeUrl("https://usetruecap.com", EMAIL)!).searchParams.get("token")!;
    const body = new URLSearchParams({ token });
    const response = await POST(new Request("https://usetruecap.com/email/unsubscribe", { method: "POST", body }));
    expect(response.status).toBe(200);
    expect(db.tables.email_suppressions).toHaveLength(1);
    expect(db.tables.email_drip_schedules![0]?.cancelled_at).toEqual(expect.any(String));
  });
  it("POST keeps RFC 8058 one-click working from the header URL", async () => {
    queued();
    const url = buildDripUnsubscribeUrl("https://usetruecap.com", EMAIL)!;
    const response = await POST(new Request(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "List-Unsubscribe=One-Click",
    }));
    expect(response.status).toBe(200);
    expect(db.tables.email_suppressions).toHaveLength(1);
    expect(db.tables.email_drip_schedules![0]?.cancelled_at).toEqual(expect.any(String));
  });
  it("POST rejects an invalid token without touching the database", async () => {
    expect((await POST(unsubscribeRequest("POST", "https://usetruecap.com/email/unsubscribe?token=junk"))).status).toBe(400);
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it.each([401, 403, 404, 429, 500, 503])("keeps cancellation retryable after HTTP %s", async status => {
    queued();
    transport.mockResolvedValueOnce(new Response(null, { status }));
    const response = await POST(unsubscribeRequest());
    expect(response.status).toBe(503);
    expect(await response.text()).toContain("opt-out is saved");
    expect(db.tables.email_drip_schedules![0]?.cancelled_at).toBeNull();
    expect((await POST(unsubscribeRequest())).status).toBe(200);
    expect(db.tables.email_drip_schedules![0]?.cancelled_at).toEqual(expect.any(String));
  });
  it("verifies an already-canceled provider state before closing a rejected retry", async () => {
    queued();
    transport.mockResolvedValueOnce(new Response(null, { status: 400 })).mockResolvedValueOnce(Response.json({ last_event: "canceled" }));
    expect((await POST(unsubscribeRequest())).status).toBe(200);
    expect(transport.mock.calls[1]?.[0]).toBe("https://api.resend.com/emails/pending");
  });
  it("does not infer cancellation from a generic 400 or a still-scheduled message", async () => {
    queued();
    transport.mockResolvedValueOnce(new Response(null, { status: 400 })).mockResolvedValueOnce(Response.json({ last_event: "scheduled" }));
    expect((await POST(unsubscribeRequest())).status).toBe(503);
    expect(db.tables.email_drip_schedules![0]?.cancelled_at).toBeNull();
  });
  it.each(["email_suppressions:upsert", "email_drip_schedules:select", "email_drip_schedules:update"])("reports incomplete work when %s fails", async operation => {
    queued(); db.errors[operation] = "error";
    expect((await POST(unsubscribeRequest())).status).toBe(503);
  });
  it("persists opt-out but reports a missing cancellation API key", async () => {
    queued(); vi.stubEnv("RESEND_API_KEY", "");
    expect((await POST(unsubscribeRequest())).status).toBe(503);
    expect(db.tables.email_suppressions).toHaveLength(1);
    expect(transport).not.toHaveBeenCalled();
  });
  it("preserves the existing account marketing token scope", async () => {
    const userId = "11111111-2222-4333-8444-555555555555";
    const token = mintSignedToken("marketing-unsubscribe", { u: userId })!;
    expect((await POST(unsubscribeRequest("POST", `https://usetruecap.com/email/unsubscribe?token=${token}`))).status).toBe(200);
    expect(mocks.setMarketingOptOut).toHaveBeenCalledWith(db.admin, userId);
    expect(db.tables.email_suppressions).toHaveLength(0);
  });
  it("rejects malformed hashes even when called without the route", async () => {
    expect(await suppressDripEmail(db.admin, "invalid", "mock-key")).toMatchObject({ suppressed: false, failed: 1 });
    expect(db.operations).toHaveLength(0);
  });
});

it("keeps the new suppression tables inaccessible to browser roles", () => {
  const sql = readFileSync("supabase/migrations/20260907130000_email_drip_unsubscribe.sql", "utf8");
  for (const table of ["email_drip_schedules", "email_suppressions"]) {
    expect(sql).toContain(`alter table public.${table} enable row level security`);
    expect(sql).toContain(`alter table public.${table} force row level security`);
    expect(sql).toContain(`revoke all on table public.${table} from public, anon, authenticated`);
    expect(sql).toContain(`grant select, insert, update on table public.${table} to service_role`);
  }
  expect(sql).not.toMatch(/create\s+policy/i);
});
