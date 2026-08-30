import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const card = readFileSync(
  join(process.cwd(), "components/investcalc/scenarios-card.tsx"),
  "utf8",
);
const presets = readFileSync(
  join(process.cwd(), "lib/scenario-presets.ts"),
  "utf8",
);
const workspacePolicies = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260830130000_reconcile_workspace_write_policies.sql",
  ),
  "utf8",
);

describe("strategy scenario setup guidance", () => {
  it("turns an incomplete destination into an actionable created-scenario flow", () => {
    expect(card).toContain("result.strategySetupRequired && strategyAtSubmit");
    expect(card).toContain(
      "edit assumptions, and choose ${strategyLabel(strategyAtSubmit)}",
    );
    expect(card).toContain(
      "open it to verify and complete the strategy inputs",
    );
  });

  it("explains House Hack, BRRRR, Flip, and STR setup in the picker", () => {
    expect(presets).toContain("choose House Hack");
    expect(presets).toContain("choose BRRRR");
    expect(presets).toContain("choose Fix & Flip");
    expect(presets).toContain("choose Short-Term Rental");
    expect(presets).not.toContain(
      "Requires a Short-term analysis with nightly rate and occupancy",
    );
  });

  it("lets authenticated owners create the property grouping used by scenarios", () => {
    const propertiesPolicies = workspacePolicies.slice(
      workspacePolicies.indexOf("-- Scenarios: properties"),
      workspacePolicies.indexOf("-- Due diligence:"),
    );
    expect(propertiesPolicies).toContain(
      'create policy "properties_insert_own"',
    );
    expect(propertiesPolicies).toContain("with check (auth.uid() = user_id)");
    expect(propertiesPolicies).toContain(
      'create policy "properties_update_own"',
    );
    expect(propertiesPolicies).toContain(
      'create policy "properties_delete_own"',
    );
    expect(propertiesPolicies).not.toContain(
      "truecap_current_user_has_paid_plan",
    );
  });
});
