import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getEntitlementsForUser, hasDashboardAccess } from "@/lib/entitlements";
import { getTypeLabel, type PropertyType } from "@/lib/compare-metrics";

export const runtime = "nodejs";

type SavedSuggestionRow = {
  id: string;
  address: string | null;
  title: string | null;
  property_type: PropertyType | null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ suggestions: [] }, { status: 401 });
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!hasDashboardAccess(entitlements)) {
    return NextResponse.json({ suggestions: [] }, { status: 403 });
  }

  // Sanitize before building the filter string:
  //   - escape the LIKE wildcards (% _) so they aren't user-controlled
  //   - strip PostgREST filter syntax chars (, ( ) *) which would break
  //     the .or() parser or, worse, splice in extra conditions
  //   - cap length so a 2KB query string can't blow up the DB plan
  const safeQuery = query
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_")
    .replaceAll(",", " ")
    .replaceAll("(", " ")
    .replaceAll(")", " ")
    .replaceAll("*", " ")
    .slice(0, 100);
  const like = `%${safeQuery}%`;
  const { data, error } = await supabase
    .from("saved_analyses")
    .select("id, address, title, property_type")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .or(`address.ilike.${like},title.ilike.${like},property_type.ilike.${like}`)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }

  const suggestions = ((data ?? []) as SavedSuggestionRow[]).map((row) => ({
    id: row.id,
    address: row.address?.trim() || row.title?.trim() || "Untitled Property",
    propertyType: getTypeLabel(row.property_type),
  }));

  return NextResponse.json({ suggestions });
}
