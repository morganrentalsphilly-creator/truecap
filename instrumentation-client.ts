// Client instrumentation entry (Next.js loads this on every page).
//
// LAZY SENTRY (docs/site-overhaul.md Phase 7): the Sentry browser SDK is the
// single largest chunk the site ships (~166 KB gzipped, in the shared 2217-*
// chunk on every page). It is now loaded AFTER the page is interactive —
// on the first user interaction, on browser idle, or after 4 seconds,
// whichever comes first — from lib/sentry/client-init.ts, which holds the
// full previous configuration (PII scrubbing, Replay off, tracing on, the
// triaged ignoreErrors list). Errors that happen before the SDK is up are
// buffered here and reported once it loads, so nothing is lost.
//
// Router transitions are forwarded to Sentry's App Router instrumentation
// once loaded (Next reads the `onRouterTransitionStart` export).

type Buffered = { kind: "error" | "unhandledrejection"; error: unknown };

const buffered: Buffered[] = [];
let loading: Promise<typeof import("@/lib/sentry/client-init")> | null = null;
let sentry: typeof import("@/lib/sentry/client-init") | null = null;
const pendingTransitions: Array<[string, string]> = [];

function loadSentry(): Promise<typeof import("@/lib/sentry/client-init")> {
  if (!loading) {
    loading = import("@/lib/sentry/client-init").then((mod) => {
      mod.initSentryClient();
      sentry = mod;
      for (const item of buffered.splice(0)) mod.captureBufferedError(item.error, item.kind);
      for (const [href, navigationType] of pendingTransitions.splice(0)) {
        mod.routerTransitionStart(href, navigationType);
      }
      return mod;
    });
  }
  return loading;
}

if (typeof window !== "undefined") {
  const onError = (event: ErrorEvent) => {
    if (!sentry) buffered.push({ kind: "error", error: event.error ?? event.message });
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    if (!sentry) buffered.push({ kind: "unhandledrejection", error: event.reason });
  };
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    for (const type of ["pointerdown", "keydown", "touchstart", "scroll"] as const) {
      window.removeEventListener(type, start);
    }
    void loadSentry().finally(() => {
      // The SDK installs its own global handlers; ours only bridged the gap.
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    });
  };
  for (const type of ["pointerdown", "keydown", "touchstart", "scroll"] as const) {
    window.addEventListener(type, start, { passive: true, once: true });
  }
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number })
    .requestIdleCallback;
  if (typeof idle === "function") idle.call(window, start, { timeout: 4000 });
  else window.setTimeout(start, 4000);
}

export function onRouterTransitionStart(href: string, navigationType: string): void {
  if (sentry) {
    sentry.routerTransitionStart(href, navigationType);
    return;
  }
  pendingTransitions.push([href, navigationType]);
  void loadSentry();
}
