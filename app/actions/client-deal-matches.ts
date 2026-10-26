"use server";
import { clientMatchSnapshotSchema } from "@/lib/client-deal-match-schema";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { buildClientMatchSnapshot, clientMatchFingerprint, loadClientUnderwritingContext, requireClientUnderwritingAccess } from "@/lib/client-underwriting-server";
import type { ClientDealScreen } from "@/lib/client-deal-screening";

export type SavedClientMatch = { id: string; createdAt: string; methodologyVersion: string; screen: ClientDealScreen };
export type ClientMatchesResult = { ok: true; matches: SavedClientMatch[] } | { ok: false; message: string };
const dealIdSchema = z.object({ savedDealId: z.string().uuid() }).strict();
const saveSchema = z.object({ savedDealId: z.string().uuid(), clientId: z.string().uuid(), buyBoxId: z.string().uuid(), sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
function unavailable(error: { code?: string }): { ok: false; message: string } {
  return { ok: false, message: error.code === "42P01" || error.code === "PGRST205"
    ? "Saving client matches is being enabled. You can still screen clients."
    : "Couldn't save or load matches. Your property and existing matches are unchanged." };
}
export async function listSavedClientMatchesAction(input: unknown): Promise<ClientMatchesResult> {
  const parsed = dealIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Choose a saved property." };
  const gate = await requireClientUnderwritingAccess();
  if (!gate.ok) return gate;
  const { data: deal } = await gate.supabase.from("saved_analyses").select("id")
    .eq("id", parsed.data.savedDealId).eq("user_id", gate.userId).is("deleted_at", null).maybeSingle();
  if (!deal) return { ok: false, message: "This saved property is unavailable." };
  const { data, error } = await gate.supabase.from("agent_deal_matches")
    .select("id, created_at, snapshot").eq("user_id", gate.userId)
    .eq("saved_analysis_id", parsed.data.savedDealId).order("created_at", { ascending: false }).limit(100);
  if (error) return unavailable(error);
  const matches: SavedClientMatch[] = [];
  for (const row of data ?? []) {
    const parsed = clientMatchSnapshotSchema.safeParse(row.snapshot);
    if (!parsed.success) return { ok: false, message: "A saved match needs review before it can be displayed. Existing snapshots are preserved." };
    matches.push({ id: row.id, createdAt: row.created_at, methodologyVersion: parsed.data.methodologyVersion, screen: parsed.data.screen });
  }
  return { ok: true, matches };
}
export async function saveClientDealMatchAction(input: unknown): Promise<ClientMatchesResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Refresh screening before saving this match." };
  const context = await loadClientUnderwritingContext(parsed.data.savedDealId);
  if (!context.ok) return context;
  const client = context.clients.find(client => client.id === parsed.data.clientId);
  const box = context.boxes.find(box => box.id === parsed.data.buyBoxId);
  if (!client || !box) return { ok: false, message: "This client or Buy Box is unavailable." };
  const fingerprint = clientMatchFingerprint(context.values, client, box);
  if (fingerprint !== parsed.data.sourceFingerprint) return { ok: false, message: "The property or client criteria changed. Refresh screening and review the updated result before saving." };
  const snapshot = buildClientMatchSnapshot(context.values, client, box);
  if (!snapshot) return { ok: false, message: "Review this client's financing and criteria before saving a match." };
  // The privileged writer accepts no browser-calculated outputs. Both the
  // context loader and database ownership trigger enforce all three owners.
  const { error } = await createAdminSupabaseClient().from("agent_deal_matches")
    .insert({ user_id: context.userId, saved_analysis_id: parsed.data.savedDealId,
      client_id: client.id, buy_box_id: box.id, source_fingerprint: fingerprint, snapshot });
  if (error && error.code !== "23505") {
    Sentry.captureException(error, { tags: { feature: "client-deal-matches", stage: "save" } });
    return unavailable(error);
  }
  return listSavedClientMatchesAction({ savedDealId: parsed.data.savedDealId });
}

export async function exportSavedClientMatchAction(input: unknown) {
  const parsed = z.object({ matchId: z.string().uuid() }).strict().safeParse(input);
  if (!parsed.success) return { ok: false as const, message: "Choose a saved client match." };
  const { loadOwnedClientMatch } = await import("@/lib/client-underwriting-server");
  const match = await loadOwnedClientMatch(parsed.data.matchId);
  if (!match.ok) return match;
  const { generateReportPdfAction } = await import("@/app/actions/generate-report-pdf");
  return generateReportPdfAction({ values: match.snapshot.values, clientMatchId: parsed.data.matchId, mode: "agent" });
}

/** Prepare one owned frozen scenario for the existing disclosure/revocation
 * dialog. No public link is created by loading this data. Private roster
 * names, notes and contacts never enter the public share payload. */
export async function prepareClientMatchShareAction(input: unknown) {
  const parsed = z.object({ matchId: z.string().uuid() }).strict().safeParse(input);
  if (!parsed.success) return { ok: false as const, message: "Choose a saved client match." };
  const { loadOwnedClientMatch } = await import("@/lib/client-underwriting-server");
  const match = await loadOwnedClientMatch(parsed.data.matchId);
  if (!match.ok) return match;
  const { TRUECAP_UNDERWRITING_STANDARD_VERSION } = await import("@/lib/underwriting-methodology");
  if (match.snapshot.methodologyVersion !== TRUECAP_UNDERWRITING_STANDARD_VERSION) {
    return { ok: false as const, message: "This historical match uses an older methodology. Screen and save a new match before sharing. The original remains unchanged." };
  }
  if (match.snapshot.screen.checks.some(check => (check.id === "state" || check.id === "propertyType") && check.pass !== true)) {
    return { ok: false as const, message: "The property's market or type does not meet verified client criteria. Export the client PDF to show these gaps; a financial-only link would omit them." };
  }
  const { chooseMaoTargetFromBuyBox } = await import("@/lib/mao-targets");
  const { calculateAnalysis } = await import("@/lib/calc-analysis");
  return { ok: true as const, values: match.snapshot.values,
    maoTarget: chooseMaoTargetFromBuyBox(match.snapshot.criteria, { isCashPurchase: calculateAnalysis(match.snapshot.values).monthlyPayment <= 0 }) };
}
