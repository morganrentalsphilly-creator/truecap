// Client instrumentation entry (Next.js loads this on every page).
//
// LAZY SENTRY (docs/site-overhaul.md Phase 7): the Sentry browser SDK is the
// single largest chunk the site ships (~166 KB gzipped, in the shared 2217-*
// chunk on every page). It loads on the visitor's first input (a pointer, a
// key or a touch), from lib/sentry/client-init.ts, which holds the full
// previous configuration (PII scrubbing, Replay off, tracing on, the
// triaged ignoreErrors list; sample rates unchanged). Until then nothing of it
// runs: the idle and 4 s triggers used to load it inside the page's first
// seconds, about 400 ms of script on a throttled phone (trust pass A20,
// founder decision 2026-10-21). An error before the first input is buffered
// here and is itself a trigger: the SDK then loads on the next idle moment
// and reports it, so a visitor who never touches the page still reports a
// load-time error.
//
// Router transitions are forwarded to Sentry's App Router instrumentation
// once loaded (Next reads the `onRouterTransitionStart` export).

type Buffered = { kind: "error" | "unhandledrejection"; error: unknown };

/** The visitor's first input. Scroll is not one: it starts no task the visitor asked for. */
const FIRST_INPUT = ["pointerdown", "keydown", "touchstart"] as const;

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
    if (sentry) return;
    buffered.push({ kind: "error", error: event.error ?? event.message });
    startWhenIdle();
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    if (sentry) return;
    buffered.push({ kind: "unhandledrejection", error: event.reason });
    startWhenIdle();
  };
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    for (const type of FIRST_INPUT) window.removeEventListener(type, start);
    void loadSentry().finally(() => {
      // The SDK installs its own global handlers; ours only bridged the gap.
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    });
  };
  for (const type of FIRST_INPUT) window.addEventListener(type, start, { passive: true, once: true });
  // Only with an error waiting to be reported: the next idle moment.
  function startWhenIdle() {
    if (started) return;
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number })
      .requestIdleCallback;
    if (typeof idle === "function") idle.call(window, start, { timeout: 4000 });
    else window.setTimeout(start, 1000);
  }
}

export function onRouterTransitionStart(href: string, navigationType: string): void {
  if (sentry) {
    sentry.routerTransitionStart(href, navigationType);
    return;
  }
  pendingTransitions.push([href, navigationType]);
  void loadSentry();
}
