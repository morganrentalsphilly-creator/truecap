"use server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { rentEvidenceInputSchema, type RentEvidence } from "@/lib/manual-rent-evidence";

type Result = { ok: true; evidence: RentEvidence[] } | { ok: false; message: string };
async function ownedDeal(savedDealId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Sign in to review comparable evidence." };
  const { data, error } = await supabase.from("saved_analyses").select("id").eq("id", savedDealId).eq("user_id", user.id).is("deleted_at", null).maybeSingle();
  if (error || !data) return { ok: false as const, message: "This saved property is unavailable." };
  return { ok: true as const, supabase, userId: user.id };
}
export async function listRentEvidenceAction(input: unknown): Promise<Result> {
  const parsed = z.object({ savedDealId: z.string().uuid() }).strict().safeParse(input);
  if (!parsed.success) return { ok: false, message: "Choose a saved property." };
  const gate = await ownedDeal(parsed.data.savedDealId); if (!gate.ok) return gate;
  const { data, error } = await gate.supabase.from("deal_rent_evidence").select("*").eq("user_id", gate.userId).eq("saved_analysis_id", parsed.data.savedDealId).order("created_at", { ascending: false }).limit(100);
  if (error) return { ok: false, message: "Comparable evidence is temporarily unavailable. Your saved data is unchanged." };
  return { ok: true, evidence: (data ?? []).map(row => ({ id: row.id, savedDealId: row.saved_analysis_id, address: row.address, sourceLabel: row.source_label, sourceUrl: row.source_url, observedOn: row.observed_on, monthlyRent: Number(row.monthly_rent), bedrooms: row.bedrooms == null ? null : Number(row.bedrooms), bathrooms: row.bathrooms == null ? null : Number(row.bathrooms), sqft: row.sqft == null ? null : Number(row.sqft), monthlyAdjustment: Number(row.monthly_adjustment), adjustmentNotes: row.adjustment_notes, isArchived: row.is_archived })) };
}
export async function saveRentEvidenceAction(input: unknown): Promise<Result> {
  const parsed = rentEvidenceInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Review the comparable inputs." };
  const value = parsed.data;
  const gate = await ownedDeal(value.savedDealId); if (!gate.ok) return gate;
  const { error } = await gate.supabase.from("deal_rent_evidence").insert({ user_id: gate.userId, saved_analysis_id: value.savedDealId, address: value.address, source_label: value.sourceLabel, source_url: value.sourceUrl, observed_on: value.observedOn, monthly_rent: value.monthlyRent, bedrooms: value.bedrooms, bathrooms: value.bathrooms, sqft: value.sqft, monthly_adjustment: value.monthlyAdjustment, adjustment_notes: value.adjustmentNotes });
  if (error) return { ok: false, message: "Couldn't save this reference. Your inputs are still here; try again." };
  return listRentEvidenceAction({ savedDealId: value.savedDealId });
}
export async function archiveRentEvidenceAction(input: unknown): Promise<Result> {
  const parsed = z.object({ savedDealId: z.string().uuid(), id: z.string().uuid(), archived: z.boolean() }).strict().safeParse(input);
  if (!parsed.success) return { ok: false, message: "Choose a comparable reference." };
  const gate = await ownedDeal(parsed.data.savedDealId); if (!gate.ok) return gate;
  const { data, error } = await gate.supabase.from("deal_rent_evidence").update({ is_archived: parsed.data.archived }).eq("id", parsed.data.id).eq("user_id", gate.userId).eq("saved_analysis_id", parsed.data.savedDealId).select("id");
  if (error || !data?.length) return { ok: false, message: "This comparable reference is unavailable." };
  return listRentEvidenceAction({ savedDealId: parsed.data.savedDealId });
}
