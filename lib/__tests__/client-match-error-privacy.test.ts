import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ capture: vi.fn(), insert: vi.fn(), fingerprint: "a".repeat(64) }));
const clientId = "11111111-1111-4111-8111-111111111111";
const buyBoxId = "22222222-2222-4222-8222-222222222222";
const savedDealId = "33333333-3333-4333-8333-333333333333";
vi.mock("@sentry/nextjs", () => ({ captureException: state.capture }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabaseClient: () => ({ from: () => ({ insert: state.insert }) }) }));
vi.mock("@/lib/client-underwriting-server", () => ({
  requireClientUnderwritingAccess: vi.fn(),
  loadClientUnderwritingContext: async () => ({ ok: true, userId: "owner", values: {}, clients: [{ id: clientId }], boxes: [{ id: buyBoxId }] }),
  clientMatchFingerprint: () => state.fingerprint,
  buildClientMatchSnapshot: () => ({ version: 1 }),
}));
import { saveClientDealMatchAction } from "@/app/actions/client-deal-matches";
beforeEach(() => { state.capture.mockClear(); state.insert.mockReset(); });
it.each(["23514", "Private fixture buyer"])("keeps rejected-row details out of telemetry (%s)", async (code) => {
  state.insert.mockResolvedValue({ error: { code, message: "Private fixture buyer", details: "Failing row contains Private fixture address, rent 3050 and private financing" } });
  const result = await saveClientDealMatchAction({ savedDealId, clientId, buyBoxId, sourceFingerprint: state.fingerprint });
  expect(result.ok).toBe(false);
  expect(state.capture).toHaveBeenCalledOnce();
  const [error, context] = state.capture.mock.calls[0];
  expect(error.message).toBe("Client match storage request failed");
  expect(context.tags.databaseCode).toBe(code === "23514" ? code : "unknown");
  expect(JSON.stringify({ result, context, message: error.message })).not.toMatch(/Private fixture|3050|private financing/);
});
