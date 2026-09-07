import { afterEach, describe, expect, it, vi } from "vitest";
import { isValidCronBearer } from "@/lib/cron-auth";

vi.mock("@sentry/nextjs", () => ({ captureMessage: vi.fn(), captureException: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: vi.fn(() => { throw new Error("Unauthorized cron accessed the database"); }),
}));

const SECRET = "cron-test-secret-that-is-not-used-in-production";
const request = (authorization?: string) => new Request("https://example.test/api/cron/test", {
  headers: authorization === undefined ? {} : { authorization },
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("cron bearer authentication", () => {
  it("accepts exactly the configured bearer", () => {
    expect(isValidCronBearer(request(`Bearer ${SECRET}`), SECRET)).toBe(true);
    vi.stubEnv("CRON_SECRET", SECRET);
    expect(isValidCronBearer(request(`Bearer ${SECRET}`))).toBe(true);
  });

  it.each([
    undefined, "", SECRET, `bearer ${SECRET}`, `Bearer x${SECRET.slice(1)}`,
    `Bearer ${SECRET.slice(0, -1)}x`, `Bearer ${SECRET}x`, "Bearer short",
  ])("rejects a missing, malformed, or mismatched bearer: %s", (header) => {
    expect(isValidCronBearer(request(header), SECRET)).toBe(false);
  });

  it("fails closed when the secret is missing or empty", () => {
    vi.stubEnv("CRON_SECRET", undefined);
    expect(isValidCronBearer(request("Bearer undefined"))).toBe(false);
    expect(isValidCronBearer(request("Bearer "), "")).toBe(false);
  });
});

describe("every cron preserves its unauthorized and missing-configuration guards", () => {
  it.each([
    "billing-reconcile", "feedback-request", "publish-testimonials", "reconcile-stripe",
    "send-lifecycle-emails", "send-rate-alerts", "send-rent-alerts", "send-weekly-digest",
    "send-weekly-summary",
  ])("%s rejects before any job work", async (route) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import(`../../app/api/cron/${route}/route.ts`);
    vi.stubEnv("CRON_SECRET", SECRET);
    expect((await GET(request())).status).toBe(401);
    expect((await GET(request(`Bearer ${SECRET}x`))).status).toBe(401);
    vi.stubEnv("CRON_SECRET", undefined);
    expect((await GET(request(`Bearer ${SECRET}`))).status).toBe(500);
  });
});
