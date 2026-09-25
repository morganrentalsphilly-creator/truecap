import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * IP_RATE_LIMIT_MAX_OVERRIDE lifts every per-IP brake for test runs (CI and
 * the isolated local server). Unset, each caller keeps its own cap.
 */
describe("createIpRateLimit test-time override", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("keeps the configured cap when the override is unset", async () => {
    vi.stubEnv("IP_RATE_LIMIT_MAX_OVERRIDE", "");
    const { createIpRateLimit } = await import("@/lib/ip-rate-limit");
    const limit = createIpRateLimit({ windowMs: 60_000, maxPerWindow: 2 });
    expect(limit.isOverLimit("1.1.1.1")).toBe(false);
    expect(limit.isOverLimit("1.1.1.1")).toBe(false);
    expect(limit.isOverLimit("1.1.1.1")).toBe(true);
  });

  it("lifts the cap to the override when set to a positive integer", async () => {
    vi.stubEnv("IP_RATE_LIMIT_MAX_OVERRIDE", "5");
    const { createIpRateLimit } = await import("@/lib/ip-rate-limit");
    const limit = createIpRateLimit({ windowMs: 60_000, maxPerWindow: 2 });
    for (let i = 0; i < 5; i += 1) expect(limit.isOverLimit("1.1.1.1")).toBe(false);
    expect(limit.isOverLimit("1.1.1.1")).toBe(true);
  });

  it("ignores a malformed override", async () => {
    vi.stubEnv("IP_RATE_LIMIT_MAX_OVERRIDE", "lots");
    const { createIpRateLimit } = await import("@/lib/ip-rate-limit");
    const limit = createIpRateLimit({ windowMs: 60_000, maxPerWindow: 1 });
    expect(limit.isOverLimit("2.2.2.2")).toBe(false);
    expect(limit.isOverLimit("2.2.2.2")).toBe(true);
  });
});
