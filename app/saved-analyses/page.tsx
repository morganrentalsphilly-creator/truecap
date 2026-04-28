import { redirect } from "next/navigation";

export default async function SavedAnalysesLegacyRedirectPage() {
  redirect("/dashboard/saved-analyses");
}
