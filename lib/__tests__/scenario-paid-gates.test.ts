import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  getEntitlementsForUser: vi.fn(),
  getSavedDealLimitLabel: vi.fn(),
  hasPaidPlanSubscription: vi.fn(),
  hasPlanFeature: vi.fn(),
  hasSavedDealCapacity: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));
vi.mock("@/lib/entitlements", () => ({
  getEntitlementsForUser: mocks.getEntitlementsForUser,
  getSavedDealLimitLabel: mocks.getSavedDealLimitLabel,
  hasPaidPlanSubscription: mocks.hasPaidPlanSubscription,
  hasPlanFeature: mocks.hasPlanFeature,
  hasSavedDealCapacity: mocks.hasSavedDealCapacity,
}));

import { addScenarioAction, listScenariosAction } from "@/app/actions/scenarios";
import { saveDealAction } from "@/app/actions/saved-analyses";
import { defaultValues } from "@/lib/investcalc-schema";
import { resolveOwnedScenarioPropertyGroup } from "@/lib/scenario-property-group";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

function section(source: string, start: string, end: string): string {
  const startAt = source.indexOf(start);
  const endAt = source.indexOf(end, startAt + start.length);
  expect(startAt).toBeGreaterThanOrEqual(0);
  expect(endAt).toBeGreaterThan(startAt);
  return source.slice(startAt, endAt);
}

describe("scenario server-action paid gates", () => {
  const dealId = "11111111-1111-4111-8111-111111111111";

  beforeEach(() => {
    vi.clearAllMocks();
    const from = vi.fn(() => {
      throw new Error("Free scenario requests must not reach deal data");
    });
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-free", email: "free@example.com" } },
        }),
      },
      from,
    });
    mocks.hasPaidPlanSubscription.mockResolvedValue(false);
  });

  it("blocks scenario reads before querying saved deals", async () => {
    const result = await listScenariosAction(dealId);
    expect(result).toMatchObject({ ok: false, code: "ENTITLEMENT_REQUIRED" });
    const supabase = await mocks.createServerSupabaseClient.mock.results[0]?.value;
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("blocks scenario creation before loading or cloning the source deal", async () => {
    const result = await addScenarioAction({
      sourceDealId: dealId,
      scenarioName: "BRRRR",
      strategyKind: "brrrr",
    });
    expect(result).toMatchObject({ ok: false, code: "ENTITLEMENT_REQUIRED" });
    const supabase = await mocks.createServerSupabaseClient.mock.results[0]?.value;
    expect(supabase.from).not.toHaveBeenCalled();
    expect(mocks.getEntitlementsForUser).not.toHaveBeenCalled();
  });

  it("blocks duplicate-address scenario saves before any deal lookup or insert", async () => {
    const result = await saveDealAction({}, null, undefined, {
      saveAsNewScenario: true,
    });

    expect(result).toMatchObject({
      ok: false,
      code: "ENTITLEMENT_SAVE",
      message: expect.stringContaining("TrueCap Pro"),
    });
    const supabase = await mocks.createServerSupabaseClient.mock.results[0]?.value;
    expect(supabase.from).not.toHaveBeenCalled();
    expect(mocks.getEntitlementsForUser).not.toHaveBeenCalled();
  });
});

describe("duplicate-address scenario grouping", () => {
  it("links the existing deal and lists the current-form save as its sibling", async () => {
    vi.clearAllMocks();
    const userId = "user-paid";
    const sourceId = "11111111-1111-4111-8111-111111111111";
    const insertedId = "22222222-2222-4222-8222-222222222222";
    const propertyId = "33333333-3333-4333-8333-333333333333";
    const address = "123 Main St, Philadelphia, PA 19101";
    const source: Record<string, unknown> = {
      id: sourceId,
      user_id: userId,
      property_id: null,
      scenario_name: null,
      strategy_kind: null,
      address,
      title: address,
      form_snapshot: { address, purchasePrice: 250_000, monthlyRent: 2_000 },
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
    };
    let inserted: Record<string, unknown> | null = null;

    function fluent(
      result: () => { data: unknown; error: unknown; count?: number | null },
      effects: {
        insert?: (payload: Record<string, unknown>) => void;
        update?: (payload: Record<string, unknown>) => void;
      } = {}
    ) {
      const builder: Record<string, ReturnType<typeof vi.fn>> & {
        then?: PromiseLike<unknown>["then"];
      } = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        is: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        order: vi.fn(() => builder),
        insert: vi.fn((payload: Record<string, unknown>) => {
          effects.insert?.(payload);
          return builder;
        }),
        update: vi.fn((payload: Record<string, unknown>) => {
          effects.update?.(payload);
          return builder;
        }),
        maybeSingle: vi.fn(() => Promise.resolve(result())),
        single: vi.fn(() => Promise.resolve(result())),
      };
      builder.then = (onfulfilled, onrejected) =>
        Promise.resolve(result()).then(onfulfilled, onrejected);
      return builder;
    }

    let savedCalls = 0;
    let propertyCalls = 0;
    const from = vi.fn((table: string) => {
      if (table === "properties") {
        propertyCalls += 1;
        if (propertyCalls === 1) {
          return fluent(() => ({ data: null, error: null }));
        }
        if (propertyCalls === 2) {
          return fluent(
            () => ({ data: { id: propertyId }, error: null }),
            { insert: () => undefined }
          );
        }
      }

      if (table === "saved_analyses") {
        savedCalls += 1;
        if (savedCalls === 1) {
          return fluent(() => ({
            data: [{ ...source, form_address: address }],
            error: null,
          }));
        }
        if (savedCalls === 2) {
          return fluent(() => ({ data: null, error: null, count: 1 }));
        }
        if (savedCalls === 3) {
          return fluent(
            () => ({ data: { id: sourceId }, error: null }),
            { update: (payload) => Object.assign(source, payload) }
          );
        }
        if (savedCalls === 4) {
          return fluent(
            () => ({ data: { id: insertedId }, error: null }),
            {
              insert: (payload) => {
                inserted = {
                  ...payload,
                  id: insertedId,
                  deleted_at: null,
                  created_at: "2026-01-02T00:00:00.000Z",
                };
              },
            }
          );
        }
        if (savedCalls === 5) {
          return fluent(() => ({ data: source, error: null }));
        }
        if (savedCalls === 6) {
          return fluent(() => ({ data: [source, inserted], error: null }));
        }
      }

      throw new Error(`Unexpected ${table} query #${table === "properties" ? propertyCalls : savedCalls}`);
    });
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: userId, email: "paid@example.com" } },
        }),
      },
      from,
    };
    mocks.createServerSupabaseClient.mockResolvedValue(supabase);
    mocks.hasPaidPlanSubscription.mockResolvedValue(true);
    mocks.getEntitlementsForUser.mockResolvedValue({});
    mocks.hasPlanFeature.mockReturnValue(true);
    mocks.hasSavedDealCapacity.mockReturnValue(true);

    const saveResult = await saveDealAction(
      {
        ...defaultValues,
        propertyType: "single-family",
        address,
        purchasePrice: 315_000,
        bedrooms: 3,
        monthlyRent: 2_450,
      },
      null,
      undefined,
      { saveAsNewScenario: true, strategyKind: "brrrr" }
    );

    expect(saveResult).toEqual({ ok: true, id: insertedId, mode: "inserted" });
    expect(source).toMatchObject({
      property_id: propertyId,
      scenario_name: "Base case",
    });
    expect(inserted).toMatchObject({
      property_id: propertyId,
      scenario_name: "Scenario 2",
      strategy_kind: "brrrr",
      form_snapshot: expect.objectContaining({
        purchasePrice: 315_000,
        monthlyRent: 2_450,
      }),
    });

    const listResult = await listScenariosAction(sourceId);
    expect(listResult).toMatchObject({
      ok: true,
      propertyId,
      scenarios: [
        { id: sourceId, scenarioName: "Base case", isSource: true },
        { id: insertedId, scenarioName: "Scenario 2", strategyKind: "brrrr" },
      ],
    });
  });

  it("rejects a source's inaccessible property group before any saved-deal write", async () => {
    const eq = vi.fn();
    const propertyQuery = {
      select: vi.fn(),
      eq,
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    propertyQuery.select.mockReturnValue(propertyQuery);
    eq.mockReturnValue(propertyQuery);
    const supabase = {
      from: vi.fn((table: string) => {
        if (table !== "properties") throw new Error("Saved-deal writes must not run");
        return propertyQuery;
      }),
    };

    await expect(
      resolveOwnedScenarioPropertyGroup({
        supabase: supabase as unknown as SupabaseClient,
        userId: "user-paid",
        source: {
          id: "11111111-1111-4111-8111-111111111111",
          property_id: "44444444-4444-4444-8444-444444444444",
          scenario_name: "Base case",
          address: "123 Main St",
        },
      })
    ).rejects.toThrow("not owned by the current user");
    expect(eq).toHaveBeenCalledWith("id", "44444444-4444-4444-8444-444444444444");
    expect(eq).toHaveBeenCalledWith("user_id", "user-paid");
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });
});

describe("scenario paid-feature source contract", () => {
  it("checks the canonical paid entitlement in each scenario action before deal access", () => {
    const actions = read("app/actions/scenarios.ts");
    const listAction = section(
      actions,
      "export async function listScenariosAction",
      "const addSchema"
    );
    const addAction = actions.slice(actions.indexOf("export async function addScenarioAction"));

    for (const action of [listAction, addAction]) {
      const entitlementAt = action.indexOf("hasPaidPlanSubscription(supabase, user.id)");
      expect(entitlementAt).toBeGreaterThanOrEqual(0);
      expect(action).toContain('code: "ENTITLEMENT_REQUIRED"');
      expect(entitlementAt).toBeLessThan(action.indexOf('.from("saved_analyses")'));
    }
  });

  it("never carries paid workflow ownership or a stale PDF into a clone", () => {
    const actions = read("app/actions/scenarios.ts");
    const clone = section(actions, "const clone: Record<string, unknown>", "// Apply the (conservative)");
    expect(clone).toContain("clone.pipeline_stage = null");
    expect(clone).toContain("clone.tags = []");
    expect(clone).toContain("clone.template_id = null");
    expect(clone).toContain("clone.client_id = null");
    expect(clone).toContain("clone.pdf_url = null");
    expect(clone).toContain("clone.pdf_generated_at = null");
    expect(clone).toContain("clone.pdf_snapshot_version = 0");
    expect(clone).toContain("clone.is_completed = false");
    expect(clone).toContain("clone.is_archived = false");
    expect(clone).toContain("clone.close_date = null");
    expect(clone).toContain("clone.last_activity_at = new Date().toISOString()");
  });

  it("gates same-address scenario inserts before duplicate lookup or insert", () => {
    const actions = read("app/actions/saved-analyses.ts");
    const saveAction = section(
      actions,
      "export async function saveDealAction",
      "export async function getSavedDealForEditingAction"
    );
    const paidGateAt = saveAction.indexOf("hasPaidPlanSubscription(supabase, user.id)");

    expect(saveAction).toContain("options?.saveAsNewScenario === true");
    expect(saveAction).toContain('code: "ENTITLEMENT_SAVE"');
    expect(paidGateAt).toBeGreaterThanOrEqual(0);
    expect(paidGateAt).toBeLessThan(saveAction.indexOf("findSavedAnalysesByAddress"));
    expect(paidGateAt).toBeLessThan(saveAction.indexOf('.insert({'));
  });

  it("keeps compare-scenarios independently behind its paid compare entitlement", () => {
    const compare = read("app/actions/compare.ts");
    const action = section(
      compare,
      "export async function compareScenariosAction",
      "export async function removeCompareDealAction"
    );
    const entitlementAt = action.indexOf('hasPlanFeature(entitlements, "compare_deals")');
    expect(entitlementAt).toBeGreaterThanOrEqual(0);
    expect(action).toContain('code: "ENTITLEMENT_REQUIRED"');
    expect(entitlementAt).toBeLessThan(action.indexOf('.from("saved_analyses")'));
  });

  it("renders an upgrade state for Free and only mounts the manager for paid users", () => {
    const card = read("components/investcalc/scenarios-card.tsx");
    const page = read("app/dashboard/saved-analyses/[id]/page.tsx");
    expect(card).toContain("if (!isPremium) return <ScenarioUpgradeState />");
    expect(card).toContain("Unlock scenarios with Pro");
    expect(card).toContain("return <PaidScenariosCard savedDealId={savedDealId} />");
    expect(page).toContain(
      "<ScenariosCard savedDealId={dealRow.id} isPremium={isPremium} />"
    );
  });

  it("shows Free users an upgrade state instead of duplicate-address mutation choices", () => {
    const dialog = read("components/investcalc/duplicate-address-dialog.tsx");
    const analyzer = read("components/investcalc/investcalc-page.tsx");
    const paidChoices = section(dialog, "{canUpdateSavedDeals ? (", ") : (");
    const upgradeState = section(dialog, ") : (", "</DialogFooter>");

    expect(paidChoices).toContain("onUpdateExisting");
    expect(paidChoices).toContain("onSaveAsScenario");
    expect(upgradeState).toContain("Unlock updates and scenarios");
    expect(upgradeState).toContain('href="/pricing#plans"');
    expect(upgradeState).not.toContain("onUpdateExisting");
    expect(upgradeState).not.toContain("onSaveAsScenario");
    expect(analyzer).toContain("canUpdateSavedDeals={canUpdateSavedDeals}");
    expect(analyzer).toContain("if (!duplicateCollision || !canUpdateSavedDeals) return");
  });

  it("threads an allowlisted analyzer strategy into the grouped current-form insert", () => {
    const analyzer = read("components/investcalc/investcalc-page.tsx");
    const saveAction = read("app/actions/saved-analyses.ts");

    expect(analyzer).toContain(
      "strategyKind: scenarioKindFromAnalyzerStrategy(activeStrategyKey)"
    );
    expect(saveAction).toContain("resolveOwnedScenarioPropertyGroup({");
    expect(saveAction).toContain("property_id: propertyId");
    expect(saveAction).toContain("scenario_name: scenarioName");
    expect(saveAction).toContain(
      "strategy_kind: isStrategyKind(options?.strategyKind) ? options.strategyKind : null"
    );
    expect(saveAction).toContain("...payload,");
    expect(saveAction).toContain("...scenarioFields,");
  });
});
