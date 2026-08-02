// Legacy route. The Pro compare view moved under /dashboard.
//
// permanentRedirect (308), not redirect (307): a temporary redirect tells
// Google to keep the OLD url indexed and passes no signal to the new one.
// These moves are permanent, so the link equity should transfer.
import { permanentRedirect } from "next/navigation";

export default async function LegacyCompareRedirectPage() {
  permanentRedirect("/dashboard/compare");
}
