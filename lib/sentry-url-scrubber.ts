import type { Breadcrumb, Event } from "@sentry/nextjs";
import {
  SENSITIVE_PUBLIC_SHARE_ROUTE_PATTERN,
  redactSensitiveQueryValuesInText,
  sanitizeSensitiveQuery,
  sanitizeSensitiveUrl,
} from "@/lib/sensitive-url";

type RequestWithUrl = {
  url?: string;
  query_string?: string | Record<string, string> | Array<[string, string]>;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
};

const SECRET_HEADER_KEY = /^(?:authorization|stripe-signature)$/i;
const URL_HEADER_KEY =
  /^(?:referer|referrer|location|content-location|x-original-url|x-rewrite-url|x-forwarded-uri|next-url)$/i;

/**
 * Request headers are independent of `event.request.url`. In particular, a
 * same-origin Referer can contain an encoded analysis snapshot even after the
 * destination URL has been scrubbed. Cookies are never useful for error
 * triage, so the raw Cookie header is removed wholesale.
 */
export function scrubSentryRequestHeaders(
  headers: Record<string, string> | undefined
): void {
  if (!headers) return;
  for (const [key, value] of Object.entries(headers)) {
    if (SECRET_HEADER_KEY.test(key) || /^cookie$/i.test(key)) {
      headers[key] = "[scrubbed]";
    } else if (URL_HEADER_KEY.test(key)) {
      headers[key] = sanitizeSensitiveUrl(value);
    } else {
      headers[key] = redactSensitiveQueryValuesInText(value);
    }
  }
}

/** Parsed cookie maps can be attached separately from the Cookie header. */
export function scrubSentryRequestCookies(
  cookies: Record<string, string> | undefined
): void {
  if (!cookies) return;
  for (const key of Object.keys(cookies)) cookies[key] = "[scrubbed]";
}

/** Mutate the event request at Sentry's final beforeSend boundary. */
export function scrubSentryRequestUrl(request: RequestWithUrl | undefined): void {
  if (!request) return;
  if (typeof request.url === "string") {
    request.url = sanitizeSensitiveUrl(request.url);
  }
  request.query_string = sanitizeSensitiveQuery(request.query_string) as
    | string
    | Record<string, string>
    | Array<[string, string]>
    | undefined;
  scrubSentryRequestHeaders(request.headers);
  scrubSentryRequestCookies(request.cookies);
}

const BREADCRUMB_URL_KEY = /^(?:url|href|from|to|referrer|request_url)$/i;
const STRUCTURED_URL_KEY =
  /(?:^|[_.$-])(?:url|uri|href|referrer|referer|path|pathname|location|route)$/i;

function scrubStructuredTelemetryValue(
  value: unknown,
  key = "",
  seen = new WeakSet<object>()
): unknown {
  if (typeof value === "string") {
    return STRUCTURED_URL_KEY.test(key)
      ? sanitizeSensitiveUrl(value)
      : redactSensitiveQueryValuesInText(value);
  }
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) return "[scrubbed-cycle]";
  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((entry) =>
      scrubStructuredTelemetryValue(entry, key, seen)
    );
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([childKey, child]) => [
      childKey,
      scrubStructuredTelemetryValue(child, childKey, seen),
    ])
  );
}

/**
 * Scrub navigation/fetch/xhr breadcrumbs. Return a fresh object so Sentry
 * integrations retaining the original hint cannot reattach the raw URL.
 */
export function scrubSentryBreadcrumbUrl(
  breadcrumb: Breadcrumb,
  currentUrl?: string
): Breadcrumb | null {
  if (
    typeof currentUrl === "string" &&
    SENSITIVE_PUBLIC_SHARE_ROUTE_PATTERN.test(currentUrl) &&
    /^ui(?:\.|$)/i.test(breadcrumb.category ?? "")
  ) {
    return null;
  }
  const data = breadcrumb.data ? { ...breadcrumb.data } : undefined;
  if (data) {
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === "string" && BREADCRUMB_URL_KEY.test(key)) {
        data[key] = sanitizeSensitiveUrl(value);
      }
    }
  }
  return {
    ...breadcrumb,
    ...(data ? { data } : {}),
    ...(typeof breadcrumb.message === "string"
      ? { message: redactSensitiveQueryValuesInText(breadcrumb.message) }
      : {}),
  };
}

const SPAN_QUERY_KEY = /(?:^|[._])query(?:$|[._])/i;
const SPAN_URL_KEY =
  /(?:^|[._])(?:url|href|referrer|target|path)(?:$|[._])/i;

type SentrySpanWithUrlData = {
  data: Record<string, unknown>;
  description?: string;
};

/** Scrub URL/query attributes emitted through Sentry performance tracing. */
export function scrubSentrySpanUrl<T extends SentrySpanWithUrlData>(span: T): T {
  const data = { ...span.data };
  for (const [key, value] of Object.entries(data)) {
    if (typeof value !== "string") continue;
    if (SPAN_QUERY_KEY.test(key)) {
      data[key] = sanitizeSensitiveQuery(value) ?? "";
    } else if (SPAN_URL_KEY.test(key)) {
      data[key] = sanitizeSensitiveUrl(value);
    } else {
      // Stripe SDK descriptions/attributes can contain a Checkout Session id
      // without labeling the field as a URL.
      data[key] = redactSensitiveQueryValuesInText(value);
    }
  }
  return {
    ...span,
    data,
    ...(typeof span.description === "string"
      ? { description: redactSensitiveQueryValuesInText(span.description) }
      : {}),
  } as T;
}

/**
 * Final common boundary for both error events and performance transactions.
 * This also strips Stripe ids from exception text (Stripe errors commonly
 * echo the requested Checkout Session id).
 */
export function scrubSentryEventSensitiveData<T extends Event>(event: T): T {
  scrubSentryRequestUrl(event.request);
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.flatMap((breadcrumb) => {
      const scrubbed = scrubSentryBreadcrumbUrl(
        breadcrumb,
        event.request?.url
      );
      return scrubbed ? [scrubbed] : [];
    });
  }
  if (typeof event.message === "string") {
    event.message = redactSensitiveQueryValuesInText(event.message);
  }
  if (typeof event.transaction === "string") {
    event.transaction = redactSensitiveQueryValuesInText(event.transaction);
  }
  if (event.logentry) {
    if (typeof event.logentry.message === "string") {
      event.logentry.message = redactSensitiveQueryValuesInText(event.logentry.message);
    }
    if (event.logentry.params) {
      event.logentry.params = event.logentry.params.map((value) =>
        typeof value === "string" ? redactSensitiveQueryValuesInText(value) : value
      );
    }
  }
  for (const exception of event.exception?.values ?? []) {
    if (typeof exception.value === "string") {
      exception.value = redactSensitiveQueryValuesInText(exception.value);
    }
  }
  if (event.extra) {
    event.extra = scrubStructuredTelemetryValue(event.extra) as typeof event.extra;
  }
  if (event.contexts) {
    event.contexts = scrubStructuredTelemetryValue(
      event.contexts
    ) as typeof event.contexts;
  }
  if (event.tags) {
    event.tags = scrubStructuredTelemetryValue(event.tags) as typeof event.tags;
  }
  if (event.spans) event.spans = event.spans.map(scrubSentrySpanUrl);
  return event;
}
