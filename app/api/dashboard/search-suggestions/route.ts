import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
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

  const like = `%${query.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
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
