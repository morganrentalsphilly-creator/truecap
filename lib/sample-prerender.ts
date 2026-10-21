/**
 * The flag that shows the sample's server-rendered decision before first
 * paint (audit A2; components/investcalc/sample-decision-prerender.tsx).
 *
 * The head script sets it on <html> when /analyze is opened with ?sample=1;
 * AnalyzeEntryFromQuery sets it too on a client-side navigation, where no
 * head script runs. app/globals.css shows the card and hides the analyzer
 * while it is set, and swaps them the moment the live result has settled (its
 * Offer Ceiling resolved: [data-decision-settled]); the live card then clears
 * it (clearSamplePrerenderFlag) and skips its entrance over an answer that is
 * already on screen (isSamplePrerenderShown).
 *
 * CSP: inline, like the root layout's other head bootstraps. The policy is
 * report-only with 'unsafe-inline' today; a nonce policy must cover this
 * script along with them.
 */
export const SAMPLE_PRERENDER_ATTRIBUTE = "data-sample";

export function samplePrerenderBootstrapScript(): string {
  return `(function(){try{var l=window.location;if(l.pathname!=="/analyze")return;if(new URLSearchParams(l.search).get("sample")!=="1")return;document.documentElement.setAttribute(${JSON.stringify(SAMPLE_PRERENDER_ATTRIBUTE)},"");}catch(_){}})();`;
}

/** True while the server-rendered sample decision stands in for the live one. */
export function isSamplePrerenderShown(): boolean {
  return (
    typeof document !== "undefined" &&
    document.documentElement.hasAttribute(SAMPLE_PRERENDER_ATTRIBUTE)
  );
}

export function setSamplePrerenderFlag(): void {
  document.documentElement.setAttribute(SAMPLE_PRERENDER_ATTRIBUTE, "");
}

/**
 * Hand the page back to the analyzer. Deferred a frame so every effect of
 * the commit that mounted the live card still sees the flag (and skips the
 * entrance) before it goes.
 */
export function clearSamplePrerenderFlag(afterClear?: () => void): void {
  if (!isSamplePrerenderShown()) return;
  window.requestAnimationFrame(() => {
    document.documentElement.removeAttribute(SAMPLE_PRERENDER_ATTRIBUTE);
    afterClear?.();
  });
}
