import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  user: "owner", allowed: true, countError: false,
  rows: [] as Record<string, unknown>[], writes: [] as Record<string, unknown>[],
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/entitlements", () => ({ requireVerifiedEntitlements: async () => ({ ok: true, entitlements: {} }), hasPlanFeature: () => state.allowed }));
vi.mock("@/app/actions/user-buy-boxes", () => ({ listBuyBoxesAction: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user ? { id: state.user } : null } }) },
    from: () => {
      const filters = new Map<string, unknown>();
      let patch: Record<string, unknown> | null = null; let insert = false; let count = false;
      const result = () => {
        if (count) return { count: state.rows.length, error: state.countError ? { code: "XX000" } : null };
        const rows = state.rows.filter(row => [...filters].every(([key, value]) => row[key] === value));
        if (patch) {
          state.writes.push(patch);
          if (insert) { state.rows.push({ ...patch, id: "new", created_at: "2026-10-26" }); return { data: [{ id: "new" }], error: null }; }
          rows.forEach(row => Object.assign(row, patch));
        }
        return { data: rows, error: null };
      };
      const query: Record<string, unknown> = new Proxy({}, { get: (_, method) => {
        if (method === "then") { const promise = Promise.resolve(result()); return promise.then.bind(promise); }
        return (...args: unknown[]) => {
          if (method === "eq") filters.set(args[0] as string, args[1]);
          if (method === "select" && args[1]) count = true;
          if (method === "update" || method === "insert") { patch = args[0] as Record<string, unknown>; insert = method === "insert"; }
          return query;
        };
      }});
      return query;
    },
  }),
}));
import { upsertAgentClientAction } from "@/app/actions/agent-clients";
const id = "11111111-1111-4111-8111-111111111111";
beforeEach(() => Object.assign(state, { user: "owner", allowed: true, countError: false, writes: [], rows: [{ id, agent_user_id: "owner", name: "Client", email: "client@example.invalid", phone: "123", notes: "Private financing note", is_archived: true, created_at: "2026-10-26" }] }));
describe("client edit safety", () => {
  it("preserves omitted contact, notes, and archive state on a name edit", async () => {
    expect(await upsertAgentClientAction({ id, name: "Renamed" })).toMatchObject({ ok: true });
    expect(state.rows[0]).toMatchObject({ name: "Renamed", email: "client@example.invalid", phone: "123", notes: "Private financing note", is_archived: true });
    expect(state.writes[0]).not.toHaveProperty("notes"); expect(state.writes[0]).not.toHaveProperty("is_archived");
  });
  it("allows an explicit clear without unarchiving", async () => {
    await upsertAgentClientAction({ id, name: "Client", notes: null, email: null });
    expect(state.rows[0]).toMatchObject({ notes: null, email: null, is_archived: true });
  });
  it("rejects cross-owner edits and unentitled callers", async () => {
    state.rows[0].agent_user_id = "different-owner";
    expect(await upsertAgentClientAction({ id, name: "Wrong" })).toMatchObject({ ok: false, code: "NOT_FOUND" });
    expect(state.rows[0].name).toBe("Client");
    state.allowed = false; state.writes = [];
    expect(await upsertAgentClientAction({ id, name: "Wrong" })).toMatchObject({ ok: false, code: "ENTITLEMENT_REQUIRED" });
    expect(state.writes).toEqual([]);
  });
  it("does not create when the roster count fails", async () => {
    state.countError = true;
    expect(await upsertAgentClientAction({ name: "New" })).toMatchObject({ ok: false, code: "SERVER_ERROR" });
    expect(state.writes).toEqual([]);
  });
});
