"use server";

import { cookies } from "next/headers";

import {
  ANONYMOUS_DECISION_GRANT_COOKIE,
  ANONYMOUS_DECISION_GRANT_DAYS,
  mintAnonymousDecisionGrant,
  readAnonymousDecisionGrant,
} from "@/lib/anonymous-decision-grant";
import { buildEvaluationDealResourceKey } from "@/lib/evaluation-resource-key";
import { releasedInvestmentFormSchema } from "@/lib/underwriting-model-release";
import { createIpRateLimit, getRequestIp } from "@/lib/ip-rate-limit";

export type ClaimAnonymousDecisionResult =
  | { ok: true; expiresAt: number; repeated: boolean }
  | {
      ok: false;
      code:
        | "INVALID_INPUT"
        | "LIMIT_REACHED"
        | "RATE_LIMITED"
        | "UNAVAILABLE";
      message: string;
    };

const anonymousClaimRateLimit = createIpRateLimit({
  windowMs: 60 * 60 * 1000,
  maxPerWindow: 5,
});

/**
 * Bind this browser's one no-signup decision to one exact released input set.
 * The signed, HttpOnly cookie is an authorization credential, not a client
 * capability hint: Offer Ceiling and report actions independently verify it.
 */
export async function claimAnonymousDecisionAction(
  input: unknown,
): Promise<ClaimAnonymousDecisionResult> {
  const parsed = releasedInvestmentFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "Review the assumptions before completing this decision.",
    };
  }

  const resourceKey = buildEvaluationDealResourceKey(parsed.data);
  if (!resourceKey) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "Review the assumptions before completing this decision.",
    };
  }

  const cookieStore = await cookies();
  const current = readAnonymousDecisionGrant(
    cookieStore.get(ANONYMOUS_DECISION_GRANT_COOKIE)?.value,
  );
  if (current) {
    if (current.resourceKey !== resourceKey) {
      return {
        ok: false,
        code: "LIMIT_REACHED",
        message:
          "This browser's no-signup decision has been used. Create a free account for three complete Pro deals and one comparison — no card.",
      };
    }
    return { ok: true, expiresAt: current.expiresAt, repeated: true };
  }

  // Clearing or withholding the browser cookie cannot become an unbounded
  // report-minting endpoint. This is an abuse brake; the signed exact-resource
  // cookie remains the authorization control.
  if (anonymousClaimRateLimit.isOverLimit(await getRequestIp())) {
    return {
      ok: false,
      code: "RATE_LIMITED",
      message: "Too many no-signup decision requests. Try again later.",
    };
  }

  const grant = mintAnonymousDecisionGrant(parsed.data);
  if (!grant) {
    return {
      ok: false,
      code: "UNAVAILABLE",
      message:
        "The no-signup decision credential is not configured. The preliminary screen is still available.",
    };
  }
  cookieStore.set(ANONYMOUS_DECISION_GRANT_COOKIE, grant.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ANONYMOUS_DECISION_GRANT_DAYS * 24 * 60 * 60,
  });
  return { ok: true, expiresAt: grant.expiresAt, repeated: false };
}
