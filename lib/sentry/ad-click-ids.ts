/**
 * Ad click ids (gclid, gbraid, wbraid, dclid, msclkid) out of Sentry
 * payloads: browser, server and edge. See lib/analytics/ad-click-ids.ts for
 * why this is its own step and not an entry in the sensitive-parameter list.
 *
 * Sentry traces run without cookie consent. In the 2026-10 audit's Reject
 * run 12 of 17 envelopes carried the landing URL's gclid: in `request.url`,
 * in the page-load span's `url.full` attribute and, once, in the `Referer`
 * request header. Error triage and tracing never need it.
 *
 * Runs AFTER lib/sentry-url-scrubber.ts in each hook and visits the same
 * fields that scrubber does (request URL, query and headers, breadcrumbs,
 * messages, exception text, stack frames, extra, contexts, tags, spans), so
 * it only ever sees plain event data. `utm_*` and every other parameter are
 * left as they were, except a parameter whose value carried a click id of
 * its own (lib/analytics/ad-click-ids.ts says how that value is rewritten).
 *
 * Stack frames: an error thrown by an inline script, or inside `eval`, names
 * the page URL as the frame's `filename` and `abs_path`, with its query. The
 * frames of every exception and thread are walked, and so is
 * `debug_meta.images[].code_file`, which the SDK copies from the frame path
 * and Sentry matches against it to find the source map: both go through the
 * same function, so they still agree afterwards.
 */

import type { Event } from "@sentry/nextjs";
import {
  isAdClickIdParameter,
  stripAdClickIds,
  stripAdClickIdsFromBareQuery,
  stripAdClickIdsFromParameterValue,
} from "@/lib/analytics/ad-click-ids";

/** Span and request attributes that hold a query string with no "?" in front. */
const BARE_QUERY_KEY = /(?:^|[._])query(?:$|[._])/i;
const MAX_DEPTH = 8;

/**
 * A stripped copy of plain event data. `done` remembers each object's copy,
 * so one object referenced from two places is stripped in both. While an
 * object is still being walked it maps to a marker, which ends a cycle
 * without handing back the unstripped original.
 */
function stripDeep(
  value: unknown,
  key = "",
  depth = 0,
  done = new WeakMap<object, unknown>(),
): unknown {
  if (typeof value === "string") {
    return BARE_QUERY_KEY.test(key)
      ? stripAdClickIdsFromBareQuery(value)
      : stripAdClickIds(value);
  }
  if (!value || typeof value !== "object") return value;
  if (done.has(value)) return done.get(value);
  if (depth >= MAX_DEPTH) return value;
  done.set(value, "[circular]");
  const copy = Array.isArray(value)
    ? value.map((entry) => stripDeep(entry, key, depth + 1, done))
    : Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(
          ([childKey, child]) => [
            childKey,
            stripDeep(child, childKey, depth + 1, done),
          ],
        ),
      );
  done.set(value, copy);
  return copy;
}

type QueryString = NonNullable<Event["request"]>["query_string"];

/** A parsed value can carry a click id of its own: `{ next: "/?gclid=x" }`. */
function stripParsedValue<V>(value: V): V {
  return typeof value === "string"
    ? (stripAdClickIdsFromParameterValue(value) as V)
    : value;
}

function stripQueryString(query: QueryString): QueryString {
  if (typeof query === "string") return stripAdClickIdsFromBareQuery(query);
  if (!query || typeof query !== "object") return query;
  if (Array.isArray(query)) {
    return query
      .filter(([name]) => !isAdClickIdParameter(name))
      .map(([name, value]): [string, string] => [name, stripParsedValue(value)]);
  }
  return Object.fromEntries(
    Object.entries(query)
      .filter(([name]) => !isAdClickIdParameter(name))
      .map(([name, value]) => [name, stripParsedValue(value)]),
  );
}

type Frames = NonNullable<
  NonNullable<NonNullable<Event["exception"]>["values"]>[number]["stacktrace"]
>["frames"];

/** Every string field of every frame: `filename`, `abs_path`, context lines, `vars`. */
function stripFrames(frames: Frames): Frames {
  return frames ? (stripDeep(frames) as Frames) : frames;
}

type SpanLike = { data: Record<string, unknown>; description?: string };

/** beforeSendSpan: span attributes (`url`, `http.url`, `http.query`) and the description. */
export function stripAdClickIdsFromSentrySpan<T extends SpanLike>(span: T): T {
  return {
    ...span,
    data: stripDeep(span.data) as T["data"],
    ...(typeof span.description === "string"
      ? { description: stripAdClickIds(span.description) }
      : {}),
  };
}

/**
 * beforeSend and beforeSendTransaction: mutate the event in place, like
 * scrubSentryEventSensitiveData, and return it.
 */
export function stripAdClickIdsFromSentryEvent<T extends Event>(event: T): T {
  const request = event.request;
  if (request) {
    if (typeof request.url === "string") {
      request.url = stripAdClickIds(request.url);
    }
    if (request.query_string !== undefined) {
      request.query_string = stripQueryString(request.query_string);
    }
    if (request.headers) {
      request.headers = stripDeep(request.headers) as typeof request.headers;
    }
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => ({
      ...breadcrumb,
      ...(breadcrumb.data
        ? { data: stripDeep(breadcrumb.data) as typeof breadcrumb.data }
        : {}),
      ...(typeof breadcrumb.message === "string"
        ? { message: stripAdClickIds(breadcrumb.message) }
        : {}),
    }));
  }
  if (typeof event.message === "string") {
    event.message = stripAdClickIds(event.message);
  }
  if (typeof event.transaction === "string") {
    event.transaction = stripAdClickIds(event.transaction);
  }
  if (event.logentry) {
    if (typeof event.logentry.message === "string") {
      event.logentry.message = stripAdClickIds(event.logentry.message);
    }
    if (event.logentry.params) {
      event.logentry.params = event.logentry.params.map((value) =>
        typeof value === "string" ? stripAdClickIds(value) : value,
      );
    }
  }
  for (const exception of event.exception?.values ?? []) {
    if (typeof exception.value === "string") {
      exception.value = stripAdClickIds(exception.value);
    }
    if (exception.stacktrace?.frames) {
      exception.stacktrace.frames = stripFrames(exception.stacktrace.frames);
    }
  }
  for (const thread of event.threads?.values ?? []) {
    if (thread.stacktrace?.frames) {
      thread.stacktrace.frames = stripFrames(thread.stacktrace.frames);
    }
  }
  if (event.debug_meta?.images) {
    event.debug_meta.images = stripDeep(
      event.debug_meta.images,
    ) as typeof event.debug_meta.images;
  }
  if (event.extra) event.extra = stripDeep(event.extra) as typeof event.extra;
  if (event.contexts) {
    event.contexts = stripDeep(event.contexts) as typeof event.contexts;
  }
  if (event.tags) event.tags = stripDeep(event.tags) as typeof event.tags;
  if (event.spans) {
    event.spans = event.spans.map((span) => stripAdClickIdsFromSentrySpan(span));
  }
  return event;
}
