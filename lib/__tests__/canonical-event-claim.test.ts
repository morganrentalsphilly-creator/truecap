import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("server-only", () => ({}));

import {
  canonicalAnalyticsEventId,
  claimCanonicalAnalyticsEvent,
  releaseCanonicalAnalyticsEventClaim,
} from "@/lib/analytics/canonical-event-claim";

function clientReturning(error: { code?: string } | null) {
  const insert = vi.fn().mockResolvedValue({ error });
  const from = vi.fn(() => ({ insert }));
  return {
    client: { from } as unknown as SupabaseClient,
    from,
    insert,
  };
}

function clientWithDurableUniqueClaims() {
  const claims = new Set<string>();
  const insert = vi.fn(
    async (row: { event_name: string; dedupe_key_hash: string }) => {
      const key = `${row.event_name}:${row.dedupe_key_hash}`;
      if (claims.has(key)) return { error: { code: "23505" } };
      claims.add(key);
      return { error: null };
    },
  );
  const from = vi.fn(() => ({ insert }));
  return {
    client: { from } as unknown as SupabaseClient,
    insert,
  };
}

describe("canonical analytics event claims", () => {
  it("derives a stable opaque UUID without exposing the raw dedupe key", () => {
    const rawKey = "cs_private_provider_identifier";
    const first = canonicalAnalyticsEventId("subscription_started", rawKey);
    const second = canonicalAnalyticsEventId("subscription_started", rawKey);
    expect(first).toBe(second);
    expect(first).toMatch(
      /^[a-f0-9]{8}-[a-f0-9]{4}-5[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/,
    );
    expect(first).not.toContain(rawKey);
    expect(canonicalAnalyticsEventId("account_created", rawKey)).not.toBe(
      first,
    );
  });

  it("stores only a deterministic digest and wins the first claim", async () => {
    const fake = clientReturning(null);
    const rawKey = "cs_private_provider_identifier";

    await expect(
      claimCanonicalAnalyticsEvent(fake.client, {
        eventName: "subscription_started",
        dedupeKey: rawKey,
      }),
    ).resolves.toBe(true);

    expect(fake.from).toHaveBeenCalledWith("canonical_analytics_event_claims");
    expect(fake.insert).toHaveBeenCalledWith({
      event_name: "subscription_started",
      dedupe_key_hash: createHash("sha256").update(rawKey).digest("hex"),
    });
    expect(JSON.stringify(fake.insert.mock.calls)).not.toContain(rawKey);
  });

  it("treats the primary-key collision as an already-emitted transition", async () => {
    const fake = clientReturning({ code: "23505" });
    await expect(
      claimCanonicalAnalyticsEvent(fake.client, {
        eventName: "subscription_started",
        dedupeKey: "same-session",
      }),
    ).resolves.toBe(false);
  });

  it("fails visibly on a claim-store outage so the webhook can retry", async () => {
    const fake = clientReturning({ code: "42501" });
    await expect(
      claimCanonicalAnalyticsEvent(fake.client, {
        eventName: "subscription_started",
        dedupeKey: "retry-session",
      }),
    ).rejects.toThrow("canonical analytics event claim failed: 42501");
  });

  it("releases a won claim after capture failure without exposing the key", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const secondEq = vi.fn(() => ({ eq }));
    const deleteClaim = vi.fn(() => ({ eq: secondEq }));
    const from = vi.fn(() => ({ delete: deleteClaim }));
    const client = { from } as unknown as SupabaseClient;
    const rawKey = "private-retry-key";

    await expect(
      releaseCanonicalAnalyticsEventClaim(client, {
        eventName: "subscription_started",
        dedupeKey: rawKey,
      }),
    ).resolves.toBe(true);
    expect(secondEq).toHaveBeenCalledWith("event_name", "subscription_started");
    expect(eq).toHaveBeenCalledWith(
      "dedupe_key_hash",
      createHash("sha256").update(rawKey).digest("hex"),
    );
    expect(JSON.stringify([secondEq.mock.calls, eq.mock.calls])).not.toContain(
      rawKey,
    );
  });

  it("atomically wins each OAuth event once under parallel callback replay", async () => {
    const fake = clientWithDurableUniqueClaims();
    const userId = "e9d40b65-b1f4-4ca7-8388-acde43999690";
    const events = ["account_created", "product_evaluation_started"] as const;

    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        Promise.all(
          events.map((eventName) =>
            claimCanonicalAnalyticsEvent(fake.client, {
              eventName,
              dedupeKey: userId,
            }),
          ),
        ),
      ),
    );

    for (const eventIndex of [0, 1]) {
      expect(results.filter((result) => result[eventIndex])).toHaveLength(1);
    }
    const digest = createHash("sha256").update(userId).digest("hex");
    expect(fake.insert).toHaveBeenCalledWith({
      event_name: "account_created",
      dedupe_key_hash: digest,
    });
    expect(fake.insert).toHaveBeenCalledWith({
      event_name: "product_evaluation_started",
      dedupe_key_hash: digest,
    });
    expect(JSON.stringify(fake.insert.mock.calls)).not.toContain(userId);
  });
});
