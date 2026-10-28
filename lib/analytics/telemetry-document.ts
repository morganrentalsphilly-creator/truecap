/**
 * One flag per document: has any provider that loads a third-party telemetry
 * script (PostHog, Vercel Web Analytics, Google tags) mounted in it yet?
 *
 * Those scripts cannot be unloaded, so the rule is that a document which may
 * have loaded one must never run on a sensitive URL (lib/sensitive-url.ts).
 * PostHogTracker hard-reloads when that happens anyway; the analyzer reads the
 * flag before a save so it can open the saved deal in a fresh document
 * instead of writing `?savedDeal=` into this one.
 *
 * The flag only ever turns on. A provider marks it when it mounts, before its
 * script is injected, so it is conservative: true can mean "about to load".
 */
let thirdPartyTelemetryMayHaveLoaded = false;

export function markThirdPartyTelemetryMounted(): void {
  thirdPartyTelemetryMayHaveLoaded = true;
}

export function documentMayHaveThirdPartyTelemetry(): boolean {
  return thirdPartyTelemetryMayHaveLoaded;
}
