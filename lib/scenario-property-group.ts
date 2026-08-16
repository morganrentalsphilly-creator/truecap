import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type ScenarioGroupSource = {
  id: string;
  property_id: string | null;
  scenario_name: string | null;
  address?: string | null;
  form_snapshot?: Record<string, unknown> | null;
};

function sourceAddress(source: ScenarioGroupSource): string | null {
  const topLevel = source.address?.trim();
  if (topLevel) return topLevel;
  const snapshotAddress = source.form_snapshot?.address;
  return typeof snapshotAddress === "string" && snapshotAddress.trim()
    ? snapshotAddress.trim()
    : null;
}

/**
 * Resolve an owned property group for an owned saved analysis and ensure the
 * source row is linked to it. Every query carries both the resource id and
 * user id, so a stale/cross-owner property reference fails closed rather than
 * becoming a grouping oracle. Throws the original database error for callers
 * to map through their normal safe server-action error handling.
 */
export async function resolveOwnedScenarioPropertyGroup(args: {
  supabase: SupabaseClient;
  userId: string;
  source: ScenarioGroupSource;
}): Promise<string> {
  const { supabase, userId, source } = args;
  let propertyId = source.property_id;
  if (propertyId) {
    const { data: ownedProperty, error } = await supabase
      .from("properties")
      .select("id")
      .eq("id", propertyId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!ownedProperty) throw new Error("Scenario property group is not owned by the current user");
  } else {
    const address = sourceAddress(source);
    if (!address) throw new Error("Scenario source has no address");
    const { data: existingProperty, error: findError } = await supabase
      .from("properties")
      .select("id")
      .eq("user_id", userId)
      .eq("address", address)
      .limit(1)
      .maybeSingle();
    if (findError) throw findError;

    propertyId = (existingProperty?.id as string | undefined) ?? null;
    if (!propertyId) {
      const { data: createdProperty, error: createError } = await supabase
        .from("properties")
        .insert({ user_id: userId, address })
        .select("id")
        .single();
      if (createError) throw createError;
      if (!createdProperty?.id) throw new Error("Scenario property group was not created");
      propertyId = createdProperty.id as string;
    }
  }

  if (!source.property_id || !source.scenario_name?.trim()) {
    const { data: linkedSource, error: linkError } = await supabase
      .from("saved_analyses")
      .update({
        property_id: propertyId,
        scenario_name: source.scenario_name?.trim() || "Base case",
      })
      .eq("id", source.id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();
    if (linkError) throw linkError;
    if (!linkedSource) throw new Error("Scenario source could not be linked to its property group");
  }

  return propertyId;
}
