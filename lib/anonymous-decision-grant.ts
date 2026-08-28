import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { buildEvaluationDealResourceKey } from "@/lib/evaluation-resource-key";

export const ANONYMOUS_DECISION_GRANT_COOKIE =
  "truecap_anonymous_decision_grant_v1";
export const ANONYMOUS_DECISION_GRANT_DAYS = 21;

type AnonymousDecisionGrantPayload = {
  v: 1;
  resourceKey: string;
  expiresAt: number;
};

function signingSecret(): string | null {
  const value = process.env.SHARE_LINK_SECRET?.trim();
  return value && Buffer.byteLength(value, "utf8") >= 32 ? value : null;
}

function encodePayload(payload: AnonymousDecisionGrantPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function signature(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret)
    .update("truecap-anonymous-decision-v1\n")
    .update(encodedPayload)
    .digest("base64url");
}

function decodeAndVerify(
  token: string | null | undefined,
  now: number,
): AnonymousDecisionGrantPayload | null {
  const secret = signingSecret();
  if (!secret || !token) return null;
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;
  const encodedPayload = token.slice(0, separator);
  const suppliedSignature = token.slice(separator + 1);
  const expectedSignature = signature(encodedPayload, secret);
  try {
    const supplied = Buffer.from(suppliedSignature, "base64url");
    const expected = Buffer.from(expectedSignature, "base64url");
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      return null;
    }
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<AnonymousDecisionGrantPayload>;
    if (
      parsed.v !== 1 ||
      typeof parsed.resourceKey !== "string" ||
      !/^deal:[a-f0-9]{64}$/.test(parsed.resourceKey) ||
      typeof parsed.expiresAt !== "number" ||
      !Number.isFinite(parsed.expiresAt) ||
      parsed.expiresAt <= now
    ) {
      return null;
    }
    return parsed as AnonymousDecisionGrantPayload;
  } catch {
    return null;
  }
}

export function mintAnonymousDecisionGrant(
  values: InvestmentFormValues,
  now = Date.now(),
): { token: string; resourceKey: string; expiresAt: number } | null {
  const secret = signingSecret();
  const resourceKey = buildEvaluationDealResourceKey(values);
  if (!secret || !resourceKey) return null;
  const expiresAt = now + ANONYMOUS_DECISION_GRANT_DAYS * 24 * 60 * 60 * 1000;
  const encodedPayload = encodePayload({ v: 1, resourceKey, expiresAt });
  return {
    token: `${encodedPayload}.${signature(encodedPayload, secret)}`,
    resourceKey,
    expiresAt,
  };
}

export function readAnonymousDecisionGrant(
  token: string | null | undefined,
  now = Date.now(),
): { resourceKey: string; expiresAt: number } | null {
  const payload = decodeAndVerify(token, now);
  return payload
    ? { resourceKey: payload.resourceKey, expiresAt: payload.expiresAt }
    : null;
}

export function anonymousDecisionGrantMatches(
  token: string | null | undefined,
  values: InvestmentFormValues,
  now = Date.now(),
): boolean {
  const grant = readAnonymousDecisionGrant(token, now);
  const resourceKey = buildEvaluationDealResourceKey(values);
  return Boolean(grant && resourceKey && grant.resourceKey === resourceKey);
}

export async function activeAnonymousDecisionGrantMatches(
  values: InvestmentFormValues,
): Promise<boolean> {
  const cookieStore = await cookies();
  return anonymousDecisionGrantMatches(
    cookieStore.get(ANONYMOUS_DECISION_GRANT_COOKIE)?.value,
    values,
  );
}
