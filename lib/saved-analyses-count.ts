import type { SupabaseClient } from "@supabase/supabase-js";

export async function getSavedAnalysesTotalCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("saved_analyses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (error) return 0;
  return count ?? 0;
}
