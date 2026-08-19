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
  "code",
] as const);

const SENSITIVE_QUERY_PARAMETER_SET = new Set<string>(
  SENSITIVE_QUERY_PARAMETER_NAMES.map((name) => name.toLowerCase())
);

/** Stripe Checkout Session ids are bearer-like even when embedded in a path. */
const STRIPE_CHECKOUT_SESSION_PATTERN = /\bcs_(?:test|live)_[A-Za-z0-9_]+\b/gi;

/** Shared snapshots and bearer-token pages must never use DOM autocapture. */
export const SENSITIVE_PUBLIC_SHARE_ROUTE_PATTERN =
  /\/(?:d|s|portal)\/[^/?#\s]+|\/embed\/brand\/[^/?#\s]+/i;

/**
 * Once a document has rendered a sensitive public route, third-party scripts
 * stay off for the rest of that SPA document. They cannot be reliably
 * unloaded before browser-history listeners observe a later route change.
 */
export function shouldKeepThirdPartyTelemetryDisabled(
  pathname: string,
  wasDisabled: boolean
): boolean {
  return wasDisabled || SENSITIVE_PUBLIC_SHARE_ROUTE_PATTERN.test(pathname);
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
    pattern: /\/portal\/[^/?#\s]+/gi,
    replacement: "/portal/[token]",
  },
  {
    pattern: /\/embed\/brand\/[^/?#\s]+/gi,
    replacement: "/embed/brand/[token]",
  },
] as const);

export function redactSensitiveOpaqueIdentifiers(value: string): string {
  let sanitized = value.replace(
    STRIPE_CHECKOUT_SESSION_PATTERN,
    "cs_[redacted]"
  );
  for (const { pattern, replacement } of SENSITIVE_ROUTE_SEGMENTS) {
    sanitized = sanitized.replace(pattern, replacement);
  }
  return sanitized;
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
        `//${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`
      );
    }
    if (isQueryOnly) {
      return redactSensitiveOpaqueIdentifiers(`${parsed.search}${parsed.hash}`);
    }
    if (isPathLike) {
      return redactSensitiveOpaqueIdentifiers(
        `${parsed.pathname}${parsed.search}${parsed.hash}`
      );
    }
    return redactSensitiveOpaqueIdentifiers(
      `${parsed.pathname.replace(/^\//, "")}${parsed.search}${parsed.hash}`
    );
  } catch {
    // Never echo a malformed value that may contain a credential. Retaining
    // the path is not worth a token accidentally escaping to telemetry.
    return "[redacted-url]";
  }
}

/** Remove sensitive keys from a raw query-string or query object. */
export function sanitizeSensitiveQuery(
  query: string | Record<string, unknown> | Array<[string, string]> | undefined
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
      .map(
        ([key, value]): [string, string] => [
          key,
          redactSensitiveOpaqueIdentifiers(value),
        ]
      );
  }

  return Object.fromEntries(
    Object.entries(query)
      .filter(([key]) => !SENSITIVE_QUERY_PARAMETER_SET.has(key.toLowerCase()))
      .map(([key, value]) => [
        key,
        typeof value === "string" ? redactSensitiveOpaqueIdentifiers(value) : value,
      ])
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
export function sanitizeAnalyticsUrlProperties<T extends Record<string, unknown>>(
  properties: T | undefined
): T | undefined {
  if (!properties) return properties;
  const sanitized: Record<string, unknown> = { ...properties };
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === "string" && URL_PROPERTY_PATTERN.test(key)) {
      sanitized[key] = sanitizeSensitiveUrl(value);
    }
  }
  return sanitized as T;
}
