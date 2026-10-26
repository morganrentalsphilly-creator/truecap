import { beforeEach, describe, expect, it, vi } from "vitest";
import { SAMPLE_DEAL_VALUES } from "@/lib/sample-deal";
const state = vi.hoisted(() => ({ user: "owner", allowed: true, enabled: true, dealOwner: "owner", deleted: false, queries: [] as unknown[], clients: vi.fn(), boxes: vi.fn() }));
vi.mock("@/lib/feature-flags", () => ({ isFeatureEnabled: () => state.enabled }));
vi.mock("@/lib/entitlements", () => ({ requireVerifiedEntitlements: async () => ({ ok: true, entitlements: {} }), hasPlanFeature: () => state.allowed }));
vi.mock("@/app/actions/agent-clients", () => ({ listAgentClientsAction: state.clients }));
vi.mock("@/app/actions/user-buy-boxes", () => ({ listBuyBoxesAction: state.boxes }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: async () => ({
  auth: { getUser: async () => ({ data: { user: state.user ? { id: state.user } : null } }) },
  from: () => {
    const filters = new Map<string, unknown>();
    const query = {
      select: (columns: string) => { expect(columns).toBe("form_snapshot"); return query; },
      eq: (key: string, value: unknown) => { filters.set(key, value); return query; },
      is: (key: string, value: unknown) => { filters.set(key, value); return query; },
      maybeSingle: async () => {
        state.queries.push([...filters]);
        expect(filters.get("deleted_at")).toBeNull();
        return { data: filters.get("user_id") === state.dealOwner && !state.deleted ? { form_snapshot: SAMPLE_DEAL_VALUES } : null, error: null };
      },
    }; return query;
  },
}) }));
import { screenSavedDealForClientsAction } from "@/app/actions/client-deal-screening";
const request = { savedDealId: "11111111-1111-4111-8111-111111111111" };
beforeEach(() => {
  Object.assign(state, { user: "owner", allowed: true, enabled: true, dealOwner: "owner", deleted: false, queries: [] });
  state.clients.mockReset().mockResolvedValue({ ok: true, clients: [{ id: "c", name: "Client", notes: "Secret note", email: "private@example.invalid", isArchived: false }] });
  state.boxes.mockReset().mockResolvedValue({ ok: true, canUse: true, boxes: [] });
});
describe("saved client screening authorization", () => {
  it("screens only owned data without returning private notes or contacts", async () => {
    const result = await screenSavedDealForClientsAction(request);
    expect(result).toMatchObject({ ok: true, screens: [{ clientId: "c", status: "no-criteria" }] });
    expect(JSON.stringify(result)).not.toMatch(/Secret note|private@example/);
  });
  it("fails closed for another owner's or deleted deal", async () => {
    state.dealOwner = "another";
    expect(await screenSavedDealForClientsAction(request)).toMatchObject({ ok: false });
    expect(state.clients).not.toHaveBeenCalled();
    state.dealOwner = "owner"; state.deleted = true;
    expect(await screenSavedDealForClientsAction(request)).toMatchObject({ ok: false });
  });
  it("requires the feature, authenticated Agent Pro entitlement, and a strict input shape", async () => {
    state.enabled = false; expect(await screenSavedDealForClientsAction(request)).toMatchObject({ ok: false });
    state.enabled = true; state.user = ""; expect(await screenSavedDealForClientsAction(request)).toMatchObject({ ok: false });
    state.user = "owner"; state.allowed = false; expect(await screenSavedDealForClientsAction(request)).toMatchObject({ ok: false });
    state.allowed = true; expect(await screenSavedDealForClientsAction({ ...request, userId: "another" })).toMatchObject({ ok: false });
    expect(state.queries).toEqual([]);
  });
});
