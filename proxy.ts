/**
 * Next.js 16+ request boundary (replaces middleware.ts). Refreshes Supabase session cookies for SSR.
 * Production builds use webpack via package.json (`next build --webpack`).
 */
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
