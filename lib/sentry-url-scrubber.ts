import type { Breadcrumb, Event } from "@sentry/nextjs";
import {
  redactSensitiveQueryValuesInText,
  sanitizeSensitiveQuery,
  sanitizeSensitiveUrl,
} from "@/lib/sensitive-url";

type RequestWithUrl = {
  url?: string;
  query_string?: string | Record<string, string> | Array<[string, string]>;
};

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
}

const BREADCRUMB_URL_KEY = /^(?:url|href|from|to|referrer|request_url)$/i;

/**
 * Scrub navigation/fetch/xhr breadcrumbs. Return a fresh object so Sentry
 * integrations retaining the original hint cannot reattach the raw URL.
 */
export function scrubSentryBreadcrumbUrl(breadcrumb: Breadcrumb): Breadcrumb {
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
    event.breadcrumbs = event.breadcrumbs.map(scrubSentryBreadcrumbUrl);
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
  if (event.spans) event.spans = event.spans.map(scrubSentrySpanUrl);
  return event;
}
