import "server-only";
import { clientMatchSnapshotSchema } from "@/lib/client-deal-match-schema";
import { createHash } from "node:crypto";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireVerifiedEntitlements, hasPlanFeature } from "@/lib/entitlements";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { listAgentClientsAction, type AgentClient } from "@/app/actions/agent-clients";
import { listBuyBoxesAction } from "@/app/actions/user-buy-boxes";
import { normalizeReleasedInvestmentFormSnapshot } from "@/lib/underwriting-model-release";
import { screenDealForClients } from "@/lib/client-deal-screening";
import { applyClientFinancing } from "@/lib/client-underwriting-preferences";
import { TRUECAP_UNDERWRITING_STANDARD_VERSION } from "@/lib/underwriting-methodology";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import type { NamedBuyBox } from "@/lib/buy-box";
import { createIpRateLimit } from "@/lib/ip-rate-limit";

// Per-account best-effort compute brake; ownership and paid gates are separate.
const screeningRateLimit = createIpRateLimit({ windowMs: 60_000, maxPerWindow: 30 });

export async function requireClientUnderwritingAccess() {
  if (!isFeatureEnabled("agent_client_matching")) return { ok: false as const, message: "Client screening is not available on this deployment." };
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Sign in to screen your clients." };
  const verified = await requireVerifiedEntitlements(supabase, user.id);
  if (!verified.ok || !hasPlanFeature(verified.entitlements, "client_buy_box")) return { ok: false as const, message: "Client screening requires Agent Pro." };
  return { ok: true as const, supabase, userId: user.id };
}
export async function loadClientUnderwritingContext(savedDealId: string) {
  const gate = await requireClientUnderwritingAccess();
  if (!gate.ok) return gate;
  if (screeningRateLimit.isOverLimit(gate.userId)) return { ok: false as const, message: "Please wait a minute before screening more client matches." };
  const { supabase, userId } = gate;
  const { data: deal, error } = await supabase.from("saved_analyses")
    .select("form_snapshot").eq("id", savedDealId).eq("user_id", userId).is("deleted_at", null).maybeSingle();
  if (error) return { ok: false as const, message: "Couldn't load the saved assumptions. Try again." };
  if (!deal) return { ok: false as const, message: "This saved deal is unavailable." };
  const values = normalizeReleasedInvestmentFormSnapshot(deal.form_snapshot);
  if (!values) return { ok: false as const, message: "Open and review this deal's assumptions before screening clients." };
  const [clients, boxes] = await Promise.all([listAgentClientsAction(), listBuyBoxesAction()]);
  if (!clients.ok) return { ok: false as const, message: clients.message };
  if (!boxes.ok) return { ok: false as const, message: boxes.message };
  if (!boxes.canUse) return { ok: false as const, message: "Buy Box screening is unavailable for this account." };
  return { ok: true as const, supabase, userId, values, clients: clients.clients, boxes: boxes.boxes };
}
export function clientMatchFingerprint(values: InvestmentFormValues, client: AgentClient, box: NamedBuyBox): string {
  // Notes and contact details are deliberately excluded from snapshots/digests.
  return createHash("sha256").update(JSON.stringify({
    values, clientId: client.id, clientName: client.name, financing: client.financingAssumptions ?? { kind: "deal" },
    box, methodologyVersion: TRUECAP_UNDERWRITING_STANDARD_VERSION,
  })).digest("hex");
}
export function buildClientMatchSnapshot(values: InvestmentFormValues, client: AgentClient, box: NamedBuyBox) {
  if (client.isArchived || client.financingAssumptions === null || !box.isActive || box.clientId !== client.id) return null;
  const screen = screenDealForClients(values, [client], [box])[0];
  if (!screen?.buyBoxId) return null;
  return {
    version: 1 as const,
    values: applyClientFinancing(values, client.financingAssumptions ?? { kind: "deal" }),
    criteria: box,
    screen,
    methodologyVersion: TRUECAP_UNDERWRITING_STANDARD_VERSION,
    screenedAt: new Date().toISOString(),
  };
}

export async function loadOwnedClientMatch(matchId: string) {
  const gate = await requireClientUnderwritingAccess();
  if (!gate.ok) return gate;
  const { data, error } = await gate.supabase.from("agent_deal_matches")
    .select("snapshot, saved_analysis_id").eq("id", matchId).eq("user_id", gate.userId).maybeSingle();
  if (error || !data) return { ok: false as const, message: "This saved client match is unavailable." };
  const { data: deal } = await gate.supabase.from("saved_analyses").select("id")
    .eq("id", data.saved_analysis_id).eq("user_id", gate.userId).is("deleted_at", null).maybeSingle();
  if (!deal) return { ok: false as const, message: "This saved property is unavailable." };
  const parsed = clientMatchSnapshotSchema.safeParse(data.snapshot);
  if (!parsed.success) return { ok: false as const, message: "This saved match needs review before export." };
  return { ok: true as const, snapshot: parsed.data };
}
