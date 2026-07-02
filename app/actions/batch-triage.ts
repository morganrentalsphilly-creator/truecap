"use server";
import { toServerErrorResult } from "@/lib/db-error";

/**
 * Batch triage (Phase 4) — screen a paste of listings against the current
 * market + the user's buy box, server-side. Pro-gated (compare_deals — the
 * other power tool). The heavy lifting is the pure lib/batch-triage engine;
 * this action only supplies the two IO pieces the engine can't: the current
 * FRED rate + state property tax (via the existing enrichPropertyAction, one
 * call per DISTINCT state — rate is address-independent, tax is per-state),
 * and the user's active buy boxes. Rent comes from the paste itself, so no
 * per-address geocoding / HUD lookup is needed for v1.
 */

import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getEntitlementsForUser, hasPlanFeature } from "@/lib/entitlements";
import { buyBoxHasCriteria, deriveStateFromAddress, type NamedBuyBox } from "@/lib/buy-box";
import { listBuyBoxesAction } from "@/app/actions/user-buy-boxes";
import { enrichPropertyAction } from "@/app/actions/enrich-property";
import {
  MAX_TRIAGE_ROWS,
  parseTriageInput,
  rankTriageRows,
  triageListing,
  type TriageEnrichment,
  type TriageParseError,
  type TriageRowResult,
  type TriageSort,
} from "@/lib/batch-triage";

export type BatchTriageResult =
  | {
      ok: true;
      rows: TriageRowResult[];
      parseErrors: TriageParseError[];
      sort: TriageSort;
      /** True when the user's active buy box screened the batch. */
      buyBoxActive: boolean;
      /** How many rows were screened (after the MAX_TRIAGE_ROWS cap). */
      screenedCount: number;
      /** True when the paste exceeded the cap and was trimmed. */
      truncated: boolean;
    }
  | {
      ok: false;
      code: "SIGN_IN_REQUIRED" | "ENTITLEMENT_REQUIRED" | "EMPTY" | "SERVER_ERROR";
      message: string;
    };

const inputSchema = z.object({
  text: z.string().max(20_000),
  sort: z.enum(["score", "cashFlow", "fit"]).optional(),
});

export async function screenBatchAction(rawInput: unknown): Promise<BatchTriageResult> {
  const parsedInput = inputSchema.safeParse(rawInput);
  if (!parsedInput.success) {
    return { ok: false, code: "EMPTY", message: "Paste some listings to screen." };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!hasPlanFeature(entitlements, "compare_deals")) {
    return {
      ok: false,
      code: "ENTITLEMENT_REQUIRED",
      message: "Batch triage is a Pro feature — upgrade to screen listings in bulk.",
    };
  }

  try {
    const { rows: allRows, errors: parseErrors } = parseTriageInput(parsedInput.data.text);
    if (allRows.length === 0) {
      // Only errors (or nothing) — surface the parse errors so the user can fix.
      if (parseErrors.length === 0) {
        return { ok: false, code: "EMPTY", message: "Paste some listings to screen." };
      }
      return {
        ok: true,
        rows: [],
        parseErrors,
        sort: parsedInput.data.sort ?? "score",
        buyBoxActive: false,
        screenedCount: 0,
        truncated: false,
      };
    }

    const truncated = allRows.length > MAX_TRIAGE_ROWS;
    const rows = allRows.slice(0, MAX_TRIAGE_ROWS);

    // The user's active buy boxes (only when they can use them).
    let boxes: NamedBuyBox[] | null = null;
    const bb = await listBuyBoxesAction();
    if (bb.ok && bb.canUse) {
      const usable = bb.boxes.filter((b) => b.isActive && buyBoxHasCriteria(b));
      if (usable.length > 0) boxes = usable;
    }

    // Enrich once per DISTINCT state (rate is the same everywhere; tax is
    // per-state). Failures degrade to engine defaults — never block.
    const enrichmentByState = new Map<string, TriageEnrichment>();
    const distinctStates = Array.from(
      new Set(rows.map((r) => deriveStateFromAddress(r.address)).filter((s): s is string => !!s))
    );
    for (const state of distinctStates) {
      try {
        const e = await enrichPropertyAction({ state });
        enrichmentByState.set(state, {
          interestRate: e.interestRate,
          propertyTaxPct: e.propertyTaxPct,
        });
      } catch {
        // Leave this state unenriched — the engine defaults still produce a
        // valid underwrite; a triage screen is directional, not a wire-money
        // number.
      }
    }

    const triaged = rows.map((row) => {
      const state = deriveStateFromAddress(row.address);
      const enrichment = state ? enrichmentByState.get(state) : undefined;
      return triageListing(row, { enrichment, buyBoxes: boxes });
    });

    const sort: TriageSort = parsedInput.data.sort ?? (boxes ? "fit" : "score");
    return {
      ok: true,
      rows: rankTriageRows(triaged, sort),
      parseErrors,
      sort,
      buyBoxActive: boxes !== null,
      screenedCount: rows.length,
      truncated,
    };
  } catch (err) {
    return toServerErrorResult(err, "batch-triage");
  }
}
