import { redirect } from "next/navigation";
export default async function LegacyCompareRedirectPage() {
  redirect("/dashboard/compare");
}
