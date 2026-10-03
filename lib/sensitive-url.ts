import {
  CHECKOUT_PLAN_SLUGS,
  buildCheckoutReturnPath,
} from "@/lib/pricing-checkout-resume";

/**
 * Query parameters that can carry credentials, checkout capabilities, or
 * OAuth grants. They must never be retained in analytics/error-reporting
 * URLs. Keep this list deliberately small and security-oriented so ordinary
 * campaign attribution (utm_*) remains intact.
 */
export const SENSITIVE_QUERY_PARAMETER_NAMES = Object.freeze([
  "pdf_purchase",
  "pdf_claim",
  "checkout_session_id",
  "session_id",
  "access_token",
  "refresh_token",
  "id_token",
  "token_hash",
  "auth_token",
  // Bare `token`: the emailed feedback-form token (/feedback/testimonial),
  // the one-click unsubscribe token (/email/unsubscribe), and the founder's
  // testimonial veto token (/api/testimonials/unpublish) all travel under it.
  "token",
  "user_id",
  "owner_id",
  "deal_id",
  "customer_id",
  "subscription_id",
  // Private workspace/search locators. A dashboard search may be a street
  // address or user-authored deal label; savedDeal is an account-owned UUID;
  // next can nest either value inside an auth return path.
  "q",
  "savedDeal",
  "next",
  "email",
  "phone",
  "listing",
  "listing_url",
  "listingUrl",
  "purchasePrice",
  "monthlyRent",
  "interestRate",
  "propertyTaxPct",
  "downPayment",
  "downPaymentPct",
  "price",
  "rent",
  "beds",
  "rate",
  "tax",
  "address",
  "code",
] as const);

const SENSITIVE_QUERY_PARAMETER_SET = new Set<string>(
  SENSITIVE_QUERY_PARAMETER_NAMES.map((name) => name.toLowerCase()),
);

/** Stripe Checkout Session ids are bearer-like even when embedded in a path. */
const STRIPE_CHECKOUT_SESSION_PATTERN = /\bcs_(?:test|live)_[A-Za-z0-9_]+\b/gi;

/** Database UUIDs in private workspace paths are property/account locators. */
const UUID_PATH_SEGMENT_PATTERN =
  /(\/)[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?=\/|[?#\s]|$)/gi;

/** Shared snapshots and bearer-token pages must never use DOM autocapture. */
export const SENSITIVE_PUBLIC_SHARE_ROUTE_PATTERN =
  /\/(?:d|s|portal|memo)\/[^/?#\s]+|\/embed(?:\/|[?#\s]|$)/i;

/** True when a location contains any query value that must not be visible to
 * an arbitrary third-party script (GTM containers can read location directly,
 * outside every analytics before-send hook). */
export function hasSensitiveQueryParameter(value: string): boolean {
  try {
    const parsed = new URL(value, "https://truecap.invalid");
    return Array.from(parsed.searchParams.keys()).some((key) =>
      SENSITIVE_QUERY_PARAMETER_SET.has(key.toLowerCase()),
    );
  } catch {
    // A malformed URL cannot be proven clean. This predicate controls whether
    // third-party code loads, so fail privacy-first.
    return value.includes("?");
  }
}

export function isSensitiveTelemetryLocation(value: string): boolean {
  return (
    SENSITIVE_PUBLIC_SHARE_ROUTE_PATTERN.test(value) ||
    hasSensitiveQueryParameter(value)
  );
}

/**
 * Once a document has rendered a sensitive public route, third-party scripts
 * stay off for the rest of that SPA document. They cannot be reliably
 * unloaded before browser-history listeners observe a later route change.
 */
export function shouldKeepThirdPartyTelemetryDisabled(
  location: string,
  wasDisabled: boolean,
): boolean {
  return wasDisabled || isSensitiveTelemetryLocation(location);
}

/**
 * The only auth pages, and the only `next` values, on which cookieless page
 * analytics may stay mounted although `next` is a sensitive parameter
 * (founder decision 2026-10-03, audit row P1-49). The analyzer and result-page
 * sign-up prompts, the sign-up card, and the /pricing and /for-agents plan
 * buttons link to /auth/sign-up with next=/dashboard/new (the plan buttons
 * add plan= and billing=), and the pricing checkout return
 * (/pricing?checkout=<plan>#plans) is the other fixed return path, so with
 * the gate above those sign-ups had no transport at all. Prompts that pass
 * any other next (the share dialog, a saved-deal return) stay off. These
 * values are fixed strings that name a public route and a catalog plan slug;
 * they cannot hold an address, a deal id, a share token or another site.
 */
const COUNTED_NEXT_AUTH_PATHS: ReadonlySet<string> = new Set([
  "/auth/sign-up",
  "/auth/login",
]);

/** Exact decoded `next` values. Built from the checkout slug list so a plan
 * that is not sold cannot be counted and a new one is picked up. */
export const COUNTED_NEXT_DESTINATIONS: ReadonlySet<string> = new Set([
  "/dashboard/new",
  ...CHECKOUT_PLAN_SLUGS.map((slug) => buildCheckoutReturnPath(slug, "")),
]);

/**
 * True when the location is /auth/sign-up or /auth/login, carries exactly one
 * `next` whose decoded value is on the list above, and carries no other
 * sensitive parameter. Whole-string equality only: no prefix match, no
 * normalisation, no case folding. Anything that cannot be parsed is false.
 */
export function isCountedNextLocation(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value, "https://truecap.invalid");
  } catch {
    return false;
  }
  if (parsed.origin !== "https://truecap.invalid") return false;
  if (!COUNTED_NEXT_AUTH_PATHS.has(parsed.pathname)) return false;
  let nextCount = 0;
  for (const key of parsed.searchParams.keys()) {
    if (key === "next") {
      nextCount += 1;
      continue;
    }
    if (SENSITIVE_QUERY_PARAMETER_SET.has(key.toLowerCase())) return false;
  }
  if (nextCount !== 1) return false;
  return COUNTED_NEXT_DESTINATIONS.has(parsed.searchParams.get("next") ?? "");
}

/**
 * The gate for the Vercel Web Analytics mount ONLY
 * (components/analytics/vercel-analytics.tsx). Identical to
 * `shouldKeepThirdPartyTelemetryDisabled` except that a counted `next`
 * location does not switch it off. GTM, the Google Ads tag and PostHog keep
 * using the strict predicate, so they stay off on every `next` URL.
 * `sanitizeSensitiveUrl` still removes `next` from every URL that is
 * reported, counted or not.
 */
export function shouldKeepCookielessPageAnalyticsDisabled(
  location: string,
  wasDisabled: boolean,
): boolean {
  if (wasDisabled) return true;
  if (isCountedNextLocation(location)) return false;
  return isSensitiveTelemetryLocation(location);
}

/**
 * Public share routes carry either an encoded analysis snapshot or a bearer
 * token in the path. The browser still needs the original route to render the
 * page, but analytics and error telemetry must only receive the route shape.
 */
const SENSITIVE_ROUTE_SEGMENTS = Object.freeze([
  {
    pattern: /\/d\/[^/?#\s]+/gi,
    replacement: "/d/[shared-analysis]",
  },
  {
    // Opaque revocable share (app/s/[token]). The token IS the credential —
    // only sha256(token) is stored server-side — so the raw value must never
    // reach an analytics vendor. Added late: this route shipped after the
    // list above and inherited no redaction.
    pattern: /\/s\/[^/?#\s]+/gi,
    replacement: "/s/[token]",
  },
  {
    // A memo lead's own decision (app/memo/[token]); the signed token is the
    // only credential for that row.
    pattern: /\/memo\/[^/?#\s]+/gi,
    replacement: "/memo/[token]",
  },
  {
    pattern: /\/portal\/[^/?#\s]+\/d\/[^/?#\s]+/gi,
    replacement: "/portal/[token]/d/[deal]",
  },
  {
    pattern: /\/portal\/[^/?#\s]+/gi,
    replacement: "/portal/[token]",
  },
  {
    pattern: /\/embed\/brand\/[^/?#\s]+/gi,
    replacement: "/embed/brand/[token]",
  },
  {
    pattern: /\/dashboard\/saved-analyses\/[^/?#\s]+/gi,
    replacement: "/dashboard/saved-analyses/[deal]",
  },
] as const);

export function redactSensitiveOpaqueIdentifiers(value: string): string {
  let sanitized = value.replace(
    STRIPE_CHECKOUT_SESSION_PATTERN,
    "cs_[redacted]",
  );
  for (const { pattern, replacement } of SENSITIVE_ROUTE_SEGMENTS) {
    sanitized = sanitized.replace(pattern, replacement);
  }
  return sanitized.replace(UUID_PATH_SEGMENT_PATTERN, "$1[id]");
}

function removeSensitiveParameters(params: URLSearchParams): void {
  for (const key of Array.from(params.keys())) {
    if (SENSITIVE_QUERY_PARAMETER_SET.has(key.toLowerCase())) {
      params.delete(key);
    }
  }
}

/**
 * Remove security-sensitive query values while preserving non-sensitive
 * attribution parameters, path, and hash. Malformed input fails privacy-first
 * to a query-free string rather than returning the original secret.
 */
export function sanitizeSensitiveUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  const isAbsolute = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed);
  const isProtocolRelative = trimmed.startsWith("//");
  const isQueryOnly = trimmed.startsWith("?");
  const isPathLike = trimmed.startsWith("/") || isQueryOnly;

  try {
    const parsed = new URL(trimmed, "https://truecap.invalid");
    removeSensitiveParameters(parsed.searchParams);

    if (isAbsolute) return redactSensitiveOpaqueIdentifiers(parsed.toString());
    if (isProtocolRelative) {
      return redactSensitiveOpaqueIdentifiers(
        `//${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`,
      );
    }
    if (isQueryOnly) {
      return redactSensitiveOpaqueIdentifiers(`${parsed.search}${parsed.hash}`);
    }
    if (isPathLike) {
      return redactSensitiveOpaqueIdentifiers(
        `${parsed.pathname}${parsed.search}${parsed.hash}`,
      );
    }
    return redactSensitiveOpaqueIdentifiers(
      `${parsed.pathname.replace(/^\//, "")}${parsed.search}${parsed.hash}`,
    );
  } catch {
    // Never echo a malformed value that may contain a credential. Retaining
    // the path is not worth a token accidentally escaping to telemetry.
    return "[redacted-url]";
  }
}

/** Remove sensitive keys from a raw query-string or query object. */
export function sanitizeSensitiveQuery(
  query: string | Record<string, unknown> | Array<[string, string]> | undefined,
): string | Record<string, unknown> | Array<[string, string]> | undefined {
  if (typeof query === "string") {
    const prefixed = query.startsWith("?") ? query : `?${query}`;
    const sanitized = sanitizeSensitiveUrl(prefixed);
    return sanitized.startsWith("?") ? sanitized.slice(1) : sanitized;
  }
  if (!query || typeof query !== "object") return query;

  if (Array.isArray(query)) {
    return query
      .filter(([key]) => !SENSITIVE_QUERY_PARAMETER_SET.has(key.toLowerCase()))
      .map(([key, value]): [string, string] => [
        key,
        redactSensitiveOpaqueIdentifiers(value),
      ]);
  }

  return Object.fromEntries(
    Object.entries(query)
      .filter(([key]) => !SENSITIVE_QUERY_PARAMETER_SET.has(key.toLowerCase()))
      .map(([key, value]) => [
        key,
        typeof value === "string"
          ? redactSensitiveOpaqueIdentifiers(value)
          : value,
      ]),
  );
}

/**
 * Last-resort scrub for breadcrumb messages which sometimes embed a URL in a
 * larger sentence instead of exposing it as structured `data.url`.
 */
export function redactSensitiveQueryValuesInText(value: string): string {
  let sanitized = redactSensitiveOpaqueIdentifiers(value);
  for (const name of SENSITIVE_QUERY_PARAMETER_NAMES) {
    const pattern = new RegExp(`([?&]${name}=)[^&#\\s]*`, "gi");
    sanitized = sanitized.replace(pattern, "$1[redacted]");
  }
  return sanitized;
}

const URL_PROPERTY_PATTERN =
  /(?:^|[_$])(?:url|referrer|href|path|pathname|landing_page)$/i;

/**
 * Scrub URL-bearing PostHog properties, including SDK-generated
 * `$current_url` / `$initial_current_url` fields from autocapture events.
 */
export function sanitizeAnalyticsUrlProperties<
  T extends Record<string, unknown>,
>(properties: T | undefined): T | undefined {
  if (!properties) return properties;
  const sanitized: Record<string, unknown> = { ...properties };
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === "string" && URL_PROPERTY_PATTERN.test(key)) {
      sanitized[key] = sanitizeSensitiveUrl(value);
    }
  }
  return sanitized as T;
}
