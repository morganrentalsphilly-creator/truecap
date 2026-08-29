import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Pressing the primary CTA must never do nothing.
 *
 * The analyzer's onSubmit wrapped its work in `try { … } finally { … }` with no
 * catch. Any throw — an offline fetch, a 5xx from a server action — became an
 * unhandled promise rejection: the `finally` reset the spinner, the button
 * re-enabled, and the page was left byte-for-byte unchanged. No error, no
 * retry, no scroll, no console message a user would ever see. Verified in
 * production by forcing both the offline and 500 cases: scrollY never moved,
 * zero role="alert" nodes appeared, and clicking again produced a second
 * silent rejection.
 *
 * The pending state was never the problem — spinners render correctly for the
 * full duration of a slow request. The gap was specifically the missing error
 * branch, which is the one a user hits when something is actually wrong.
 */

const root = process.cwd();
const source = readFileSync(
  join(root, "components/investcalc/investcalc-page.tsx"),
  "utf8",
);

/** The onSubmit body, from its declaration to the onError that follows it. */
function onSubmitBody(): string {
  const start = source.indexOf("const onSubmit = async (validated: InvestmentFormValues) => {");
  expect(start, "onSubmit disappeared or was renamed").toBeGreaterThan(-1);
  const end = source.indexOf("const onError = (errors: FieldErrors<InvestmentFormValues>)", start);
  expect(end, "could not find the end of onSubmit").toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("a failed analyzer run is visible and recoverable", () => {
  it("onSubmit catches, it does not just clean up", () => {
    const body = onSubmitBody();
    const catchAt = body.indexOf("} catch (error) {");
    // onSubmit contains several nested try blocks (the enrichment await, the
    // anonymous-grant claim). Target the OUTER cleanup specifically by the
    // statement only it contains, not the first `finally` in the function.
    const finallyAt = body.indexOf("isCalculatingRef.current = false");

    // The `finally` is correct and should stay — it resets the spinner. The bug
    // was that it was the ONLY handler, so the shape to assert is that a catch
    // sits between the try and that cleanup.
    expect(finallyAt, "the cleanup finally block disappeared").toBeGreaterThan(-1);
    expect(
      catchAt,
      "onSubmit is back to try/finally with no catch — a failed run will be silent again",
    ).toBeGreaterThan(-1);
    expect(
      catchAt,
      "the catch must precede the cleanup finally, not follow it",
    ).toBeLessThan(finallyAt);
  });

  it("tells the user something went wrong, and distinguishes offline", () => {
    const body = onSubmitBody();
    expect(body).toContain("navigator.onLine === false");
    expect(body).toContain("You appear to be offline");
    expect(body).toContain("That run didn’t finish");
    expect(body).toMatch(/variant:\s*"destructive"/);
  });

  it("offers a retry rather than a dead end", () => {
    const body = onSubmitBody();
    expect(body).toContain("Try again");
    expect(body).toContain("altText=\"Run the analysis again\"");
    // The retry must actually re-run the submit, not just dismiss.
    const catchBlock = body.slice(body.indexOf("} catch (error) {"));
    expect(catchBlock).toContain("form.handleSubmit(onSubmit, onError)()");
  });

  it("reports the failure so it is not invisible to us either", () => {
    const body = onSubmitBody();
    expect(body).toContain("Sentry.captureException(error");
    expect(body).toContain('feature: "analyzer-run"');
  });

  it("reassures the user their inputs survived", () => {
    // The form is not cleared on failure; say so, because a blank-looking
    // result after a long form is exactly when people assume they lost work.
    expect(onSubmitBody()).toMatch(/inputs are safe/i);
  });
});
