import "server-only";

import { headers } from "next/headers";
import { internalNextPathOrNull } from "@/lib/auth-schema";

/** Exact site-relative URL forwarded by proxy.ts for auth return continuity. */
export async function getCurrentRequestPath(fallback: string): Promise<string> {
  const requestHeaders = await headers();
  return internalNextPathOrNull(requestHeaders.get("x-truecap-request-path")) ?? fallback;
}
