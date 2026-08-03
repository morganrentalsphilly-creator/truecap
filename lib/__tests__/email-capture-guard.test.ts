import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  EMAIL_CAPTURE_LIMITS,
  buildBucketKey,
  buildGlobalBucketKey,
  claimEmailCaptureSlot,
  interpretClaimStatus,
  releaseEmailCaptureSlot,
  type GuardRpc,
} from "@/lib/email-capture-guard";

/** RPC stub that answers with a fixed status. */
const rpcReturning = (data: unknown): GuardRpc =>
  vi.fn(async () => ({ data, error: null }));

describe("limit sanity — a legitimate first-timer must never be locked out", () => {
  it("lets one address retry after a half-failed first attempt", () => {
    expect(EMAIL_CAPTURE_LIMITS.emailMax).toBeGreaterThanOrEqual(2);
  });

  it("leaves headroom for several genuine users behind one shared/NAT IP", () => {
    // Real anonymous volume is ~3 analyses/hour site-wide, so >5 captures per
    // hour from ONE egress IP is not a shape legitimate traffic takes — but 3
    // was tight enough that an office/CGNAT IP could plausibly reach it.
    expect(EMAIL_CAPTURE_LIMITS.ipMax).toBeGreaterThanOrEqual(5);
    expect(EMAIL_CAPTURE_LIMITS.ipWindowSeconds).toBe(60 * 60);
  });

  it("keeps the site budget far above any single source's reach", () => {
    // The global cap is a backstop against rotating email+IP, not a bound on
    // ordinary traffic: one source can only ever reach ipMax of it, so a
    // flood cannot walk the site budget down to zero.
    expect(EMAIL_CAPTURE_LIMITS.globalMax).toBeGreaterThanOrEqual(
      EMAIL_CAPTURE_LIMITS.ipMax * 20
    );
  });
});

/**
 * The ordering inside `claim_email_capture` is load-bearing and lives in SQL,
 * so it can't be exercised by these unit tests — but it CAN be pinned. The
 * pre-fix ordering (global bumped first, on every request) let 200 requests
 * from one attacker IP burn the entire site-wide budget and hand the next
 * legitimate visitor `global_limited`. These assertions fail if that ordering
 * is ever reintroduced.
 */
describe("claim_email_capture SQL ordering contract", () => {
  const sql = readFileSync(
    path.resolve(__dirname, "../../supabase/migrations/20260802120500_email_capture_guard.sql"),
    "utf8"
  );
  const claimBody = sql.slice(sql.indexOf("create or replace function public.claim_email_capture"));

  const globalCheck = claimBody.indexOf("capture_bucket_at_limit(p_global_key");
  const ipCheck = claimBody.indexOf("capture_bucket_at_limit(p_ip_key");
  const emailBump = claimBody.indexOf("bump_capture_bucket(p_email_key");
  const ipBump = claimBody.indexOf("bump_capture_bucket(p_ip_key");
  const globalBump = claimBody.indexOf("bump_capture_bucket(p_global_key");

  it("checks the global budget read-only before writing anything", () => {
    expect(globalCheck).toBeGreaterThan(-1);
    expect(globalCheck).toBeLessThan(emailBump);
    expect(globalCheck).toBeLessThan(ipBump);
    expect(globalCheck).toBeLessThan(globalBump);
  });

  it("charges the global budget LAST — only for a claim that actually sends", () => {
    expect(globalBump).toBeGreaterThan(emailBump);
    expect(globalBump).toBeGreaterThan(ipBump);
  });

  it("bumps the global bucket exactly once", () => {
    expect(claimBody.split("bump_capture_bucket(p_global_key").length - 1).toBe(1);
  });

  it("screens an over-limit IP before an email row is created", () => {
    // Bounds table growth now that global no longer counts rejected requests,
    // and stops a flooding IP from burning a victim address' dedup slots.
    expect(ipCheck).toBeGreaterThan(-1);
    expect(ipCheck).toBeLessThan(emailBump);
  });

  it("still enforces every cap with an atomic bump, not just the read probe", () => {
    expect(emailBump).toBeGreaterThan(-1);
    expect(ipBump).toBeGreaterThan(-1);
    expect(globalBump).toBeGreaterThan(-1);
  });
});

describe("bucket keys", () => {
  it("hashes the email — no plaintext address in the key", () => {
    const key = buildBucketKey("email", "victim@example.com");
    expect(key.startsWith("pae:email:")).toBe(true);
    expect(key).not.toContain("victim");
    expect(key).not.toContain("@");
  });

  it("is case- and whitespace-insensitive so casing can't buy extra quota", () => {
    expect(buildBucketKey("email", "  Victim@Example.COM ")).toBe(
      buildBucketKey("email", "victim@example.com")
    );
  });

  it("separates the email and IP namespaces", () => {
    expect(buildBucketKey("email", "1.2.3.4")).not.toBe(buildBucketKey("ip", "1.2.3.4"));
  });

  it("buckets a missing IP into a single shared key", () => {
    expect(buildBucketKey("ip", "")).toBe(buildBucketKey("ip", "unknown"));
  });

  it("rotates the global key hourly", () => {
    const a = buildGlobalBucketKey(new Date("2026-08-02T10:15:00Z"));
    const b = buildGlobalBucketKey(new Date("2026-08-02T10:59:59Z"));
    const c = buildGlobalBucketKey(new Date("2026-08-02T11:00:00Z"));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe("interpretClaimStatus", () => {
  it("maps every known status", () => {
    expect(interpretClaimStatus("ok", "k")).toEqual({ allowed: true, emailBucketKey: "k" });
    expect(interpretClaimStatus("duplicate", "k")).toMatchObject({
      allowed: false,
      reason: "DUPLICATE",
    });
    expect(interpretClaimStatus("ip_limited", "k")).toMatchObject({
      allowed: false,
      reason: "IP_LIMIT",
    });
    expect(interpretClaimStatus("global_limited", "k")).toMatchObject({
      allowed: false,
      reason: "GLOBAL_LIMIT",
    });
  });

  it("fails CLOSED on an unrecognised status", () => {
    for (const junk of [null, undefined, "", "OK", 1, {}]) {
      const result = interpretClaimStatus(junk, "k");
      expect(result.allowed).toBe(false);
      expect(result).toMatchObject({ reason: "UNAVAILABLE" });
    }
  });
});

describe("claimEmailCaptureSlot", () => {
  const args = { email: "user@example.com", ip: "1.2.3.4" };

  it("allows a clean first capture and returns the email bucket for refunds", async () => {
    const rpc = rpcReturning("ok");
    const result = await claimEmailCaptureSlot({ ...args, rpc });
    expect(result).toEqual({
      allowed: true,
      emailBucketKey: buildBucketKey("email", args.email),
    });
  });

  it("passes the configured caps and both windows to the RPC", async () => {
    const rpc = rpcReturning("ok");
    await claimEmailCaptureSlot({
      ...args,
      rpc,
      now: new Date("2026-08-02T10:00:00Z"),
    });
    expect(rpc).toHaveBeenCalledWith("claim_email_capture", {
      p_global_key: "pae:global:2026-08-02T10",
      p_email_key: buildBucketKey("email", args.email),
      p_ip_key: buildBucketKey("ip", args.ip),
      p_global_max: EMAIL_CAPTURE_LIMITS.globalMax,
      p_global_window_seconds: EMAIL_CAPTURE_LIMITS.globalWindowSeconds,
      p_email_max: EMAIL_CAPTURE_LIMITS.emailMax,
      p_email_window_seconds: EMAIL_CAPTURE_LIMITS.emailWindowSeconds,
      p_ip_max: EMAIL_CAPTURE_LIMITS.ipMax,
      p_ip_window_seconds: EMAIL_CAPTURE_LIMITS.ipWindowSeconds,
    });
  });

  it("blocks a repeat enrolment of the same address (dedup)", async () => {
    const result = await claimEmailCaptureSlot({ ...args, rpc: rpcReturning("duplicate") });
    expect(result).toMatchObject({ allowed: false, reason: "DUPLICATE" });
  });

  it("blocks a scripted loop from one IP", async () => {
    const result = await claimEmailCaptureSlot({ ...args, rpc: rpcReturning("ip_limited") });
    expect(result).toMatchObject({ allowed: false, reason: "IP_LIMIT" });
  });

  it("blocks a rotating-IP attacker via the global backstop", async () => {
    const result = await claimEmailCaptureSlot({
      ...args,
      rpc: rpcReturning("global_limited"),
    });
    expect(result).toMatchObject({ allowed: false, reason: "GLOBAL_LIMIT" });
  });

  it("fails CLOSED when the RPC returns an error (e.g. migration not applied)", async () => {
    const rpc: GuardRpc = async () => ({
      data: null,
      error: { message: 'function public.claim_email_capture(...) does not exist' },
    });
    const result = await claimEmailCaptureSlot({ ...args, rpc });
    expect(result.allowed).toBe(false);
    expect(result).toMatchObject({ reason: "UNAVAILABLE" });
    if (!result.allowed) expect(result.detail).toContain("does not exist");
  });

  it("fails CLOSED when the RPC throws (network/DB down)", async () => {
    const rpc: GuardRpc = async () => {
      throw new Error("connection refused");
    };
    const result = await claimEmailCaptureSlot({ ...args, rpc });
    expect(result).toMatchObject({ allowed: false, reason: "UNAVAILABLE" });
  });

  it("never returns allowed:true without an explicit 'ok'", async () => {
    for (const status of [null, undefined, "", "duplicate", "ip_limited", "nope"]) {
      const result = await claimEmailCaptureSlot({ ...args, rpc: rpcReturning(status) });
      expect(result.allowed).toBe(false);
    }
  });
});

describe("releaseEmailCaptureSlot", () => {
  it("refunds only the bucket it is given", async () => {
    const rpc = rpcReturning(null);
    await releaseEmailCaptureSlot("pae:email:abc", rpc);
    expect(rpc).toHaveBeenCalledWith("release_capture_bucket", { p_key: "pae:email:abc" });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("swallows failures — a refund must never break the response", async () => {
    const rpc: GuardRpc = async () => {
      throw new Error("boom");
    };
    await expect(releaseEmailCaptureSlot("pae:email:abc", rpc)).resolves.toBeUndefined();
  });
});
