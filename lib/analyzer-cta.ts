export const ANALYZER_FORM_SELECTOR = '[data-calc-form="true"]';

type AnalyzerTarget = Pick<Element, "matches" | "querySelector">;

/**
 * A generic `#main` landmark exists on most marketing pages. Only treat the
 * target as an in-page analyzer destination when it actually owns the form.
 */
export function containsAnalyzerForm(target: AnalyzerTarget | null): boolean {
  return Boolean(
    target?.matches(ANALYZER_FORM_SELECTOR) ||
      target?.querySelector(ANALYZER_FORM_SELECTOR)
  );
}
