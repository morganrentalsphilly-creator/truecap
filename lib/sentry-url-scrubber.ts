import type { Breadcrumb, Event } from "@sentry/nextjs";
import {
  SENSITIVE_PUBLIC_SHARE_ROUTE_PATTERN,
  SENSITIVE_QUERY_PARAMETER_NAMES,
  redactSensitiveQueryValuesInText,
  sanitizeSensitiveQuery,
  sanitizeSensitiveUrl,
} from "@/lib/sensitive-url";

/*
 * A credential nested inside another parameter.
 *
 * lib/sensitive-url.ts removes a parameter by its NAME. A token can also sit
 * inside the VALUE of a parameter that is not on the list: as plain text
 * (`return_to=/email/unsubscribe?token=...`), percent-encoded
 * (`return_to=%2Femail%2Funsubscribe%3Ftoken%3D...`), or as a bearer path
 * (`return_to=%2Fs%2F<token>`). Every string this file scrubs goes through
 * the name-based pass first and then through `redactNestedIn*` below, which
 * decodes each remaining value one level at a time (up to MAX_NESTING) and
 * runs the same redaction on what it finds. A value is rewritten, with
 * `encodeURIComponent`, only when something inside it was redacted; every
 * other value is left byte for byte. A value that does not decode (a
 * malformed `%` sequence) is not decoded further; only what the plain-text
 * pass finds in it is redacted.
 *
 * This lives here, not in lib/sensitive-url.ts, because that module also
 * decides whether the measurement scripts load (`hasSensitiveQueryParameter`)
 * and that decision must not change.
 */

const SENSITIVE_NAME_SET = new Set<string>(
  SENSITIVE_QUERY_PARAMETER_NAMES.map((name) => name.toLowerCase()),
);

/** A query string inside any text: "?" up to whitespace, "#" or a quote. */
const QUERY_IN_TEXT = /\?[^\s#"'<>]*/g;
/** A decoded value that starts like a bare query: "token=abc&x=1". */
const BARE_QUERY_HEAD = /^[\w.\-[\]%]+=/;
/** How many levels of "a URL inside a parameter value" are followed. */
const MAX_NESTING = 4;
const REDACTED = "[redacted]";

function decodeOrNull(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function isSensitiveName(name: string): boolean {
  return SENSITIVE_NAME_SET.has((decodeOrNull(name) ?? name).toLowerCase());
}

/** `name=value` pairs: a listed name loses its value, any other value is searched. */
function redactPairs(pairs: string, depth: number): string {
  return pairs
    .split("&")
    .map((pair) => {
      const eq = pair.indexOf("=");
      if (eq < 0) return pair;
      const name = pair.slice(0, eq);
      const value = pair.slice(eq + 1);
      if (isSensitiveName(name)) {
        return value === REDACTED ? pair : `${name}=${REDACTED}`;
      }
      const scrubbed = redactNestedValue(value, depth);
      return scrubbed === value ? pair : `${name}=${scrubbed}`;
    })
    .join("&");
}

/** Every "?query" in `text`: the values of its parameters, one level down. */
function redactNestedInText(text: string, depth = 0): string {
  if (!text.includes("?")) return text;
  return text.replace(
    QUERY_IN_TEXT,
    (query) => `?${redactPairs(query.slice(1), depth)}`,
  );
}

/** The same for a query string that has no leading "?". */
function redactNestedInBareQuery(query: string): string {
  return query.startsWith("?")
    ? redactNestedInText(query)
    : redactPairs(query, 0);
}

/**
 * One parameter's value: scrubbed as plain text, then percent-decoded and
 * scrubbed again, one level at a time.
 */
function redactNestedValue(value: string, depth: number): string {
  if (depth >= MAX_NESTING) return value;
  let plain = redactSensitiveQueryValuesInText(value);
  const at = plain.indexOf("?");
  const head = at < 0 ? plain : plain.slice(0, at);
  if (BARE_QUERY_HEAD.test(head)) {
    plain = redactPairs(head, depth + 1) + (at < 0 ? "" : plain.slice(at));
  }
  plain = redactNestedInText(plain, depth + 1);
  if (!plain.includes("%")) return plain;
  const decoded = decodeOrNull(plain);
  if (decoded === null || decoded === plain) return plain;
  const scrubbed = redactNestedValue(decoded, depth + 1);
  return scrubbed === decoded ? plain : encodeURIComponent(scrubbed);
}

/** A URL-typed field: parameters removed by name, then nested values. */
function scrubUrl(value: string): string {
  return redactNestedInText(sanitizeSensitiveUrl(value));
}

/** Free text that may embed a URL: values redacted by name, then nested values. */
function scrubText(value: string): string {
  return redactNestedInText(redactSensitiveQueryValuesInText(value));
}

type SensitiveQuery = Parameters<typeof sanitizeSensitiveQuery>[0];

/** A raw or parsed query: keys removed by name, then nested values. */
function scrubQuery(query: SensitiveQuery): SensitiveQuery {
  const sanitized = sanitizeSensitiveQuery(query);
  if (typeof sanitized === "string") return redactNestedInBareQuery(sanitized);
  if (!sanitized || typeof sanitized !== "object") return sanitized;
  if (Array.isArray(sanitized)) {
    return sanitized.map(([key, value]): [string, string] => [
      key,
      typeof value === "string" ? redactNestedValue(value, 0) : value,
    ]);
  }
  return Object.fromEntries(
    Object.entries(sanitized).map(([key, value]) => [
      key,
      typeof value === "string" ? redactNestedValue(value, 0) : value,
    ]),
  );
}

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
      headers[key] = scrubUrl(value);
    } else {
      headers[key] = scrubText(value);
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
    request.url = scrubUrl(request.url);
  }
  request.query_string = scrubQuery(request.query_string) as
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
      ? scrubUrl(value)
      : scrubText(value);
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
        data[key] = scrubUrl(value);
      }
    }
  }
  return {
    ...breadcrumb,
    ...(data ? { data } : {}),
    ...(typeof breadcrumb.message === "string"
      ? { message: scrubText(breadcrumb.message) }
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
      data[key] = scrubQuery(value) ?? "";
    } else if (SPAN_URL_KEY.test(key)) {
      data[key] = scrubUrl(value);
    } else {
      // Stripe SDK descriptions/attributes can contain a Checkout Session id
      // without labeling the field as a URL.
      data[key] = scrubText(value);
    }
  }
  return {
    ...span,
    data,
    ...(typeof span.description === "string"
      ? { description: scrubText(span.description) }
      : {}),
  } as T;
}

type StackFrames = NonNullable<
  NonNullable<NonNullable<Event["exception"]>["values"]>[number]["stacktrace"]
>["frames"];
type StackFrame = NonNullable<StackFrames>[number];

/**
 * Paths that name files, never a visitor's token: the app's own build output
 * (`/_next/static/...` in the browser, `.next/server/...` on the server,
 * whose route FOLDERS read `app/d/[encoded]/page.js`) and installed packages.
 * Sentry matches these against the uploaded source maps, so the path is kept
 * as it is and only a query string, if there is one, is scrubbed.
 */
const FILE_PATH = /(?:^|\/)(?:_next|\.next|node_modules)\//;

/**
 * A stack frame's `filename` / `abs_path`, and the `code_file` the SDK
 * copies from it. An error thrown by an inline script or inside `eval`
 * names the PAGE URL here: a share link's bearer path, or a query carrying
 * a token. Scrubbed as text, not through `sanitizeSensitiveUrl`: that
 * parses its input as a URL and would rewrite `node:internal/...` and
 * `<anonymous>`.
 */
function scrubFrameLocation(value: string): string {
  const at = value.indexOf("?");
  return FILE_PATH.test(at < 0 ? value : value.slice(0, at))
    ? redactNestedInText(value)
    : scrubText(value);
}

/**
 * One frame. The location is scrubbed as above, and `vars` (local variable
 * values, when an SDK option captures them) gets the same treatment as
 * `event.extra`. The function and module names and the source context lines
 * are program text and are left as they are: the Node SDK reads the context
 * lines from the built files, the browser SDK's context-lines integration is
 * not installed, and the redaction patterns would rewrite code such as
 * `"/s/" + token` or a minified `e?q=1:t` while removing nothing a visitor
 * supplied.
 */
function scrubStackFrame(frame: StackFrame): StackFrame {
  const scrubbed: StackFrame = { ...frame };
  if (typeof frame.filename === "string") {
    scrubbed.filename = scrubFrameLocation(frame.filename);
  }
  if (typeof frame.abs_path === "string") {
    scrubbed.abs_path = scrubFrameLocation(frame.abs_path);
  }
  if (frame.vars) {
    scrubbed.vars = scrubStructuredTelemetryValue(
      frame.vars
    ) as StackFrame["vars"];
  }
  return scrubbed;
}

function scrubStackFrames(frames: StackFrames): StackFrames {
  return frames ? frames.map(scrubStackFrame) : frames;
}

/**
 * Final common boundary for both error events and performance transactions.
 * This also strips Stripe ids from exception text (Stripe errors commonly
 * echo the requested Checkout Session id) and scrubs the stack frames of
 * every exception and thread. `debug_meta.images[].code_file` goes through
 * the same function as the frame path it was copied from, so Sentry can
 * still pair the two to find the source map.
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
    event.message = scrubText(event.message);
  }
  if (typeof event.transaction === "string") {
    event.transaction = scrubText(event.transaction);
  }
  if (event.logentry) {
    if (typeof event.logentry.message === "string") {
      event.logentry.message = scrubText(event.logentry.message);
    }
    if (event.logentry.params) {
      event.logentry.params = event.logentry.params.map((value) =>
        typeof value === "string" ? scrubText(value) : value
      );
    }
  }
  for (const exception of event.exception?.values ?? []) {
    if (typeof exception.value === "string") {
      exception.value = scrubText(exception.value);
    }
    if (exception.stacktrace?.frames) {
      exception.stacktrace.frames = scrubStackFrames(
        exception.stacktrace.frames
      );
    }
  }
  for (const thread of event.threads?.values ?? []) {
    if (thread.stacktrace?.frames) {
      thread.stacktrace.frames = scrubStackFrames(thread.stacktrace.frames);
    }
  }
  if (event.debug_meta?.images) {
    event.debug_meta.images = event.debug_meta.images.map((image) =>
      typeof image.code_file === "string"
        ? { ...image, code_file: scrubFrameLocation(image.code_file) }
        : image
    );
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
