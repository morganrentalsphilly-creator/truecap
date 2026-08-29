import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Address autocomplete must not report itself broken on a working API.
 *
 * The Maps bootstrap is loaded with `loading=async`. Under that flag Google
 * resolves the script BEFORE attaching library symbols, so `google.maps.places`
 * is still undefined at `script.onload`. The loader used to resolve on onload
 * and the caller then checked for `AutocompleteSuggestion`, never found it, and
 * rendered "Address suggestions are unavailable" — on the hero address field,
 * the single input the entire product and every paid ad click depends on.
 *
 * Two things made it worse than a slow load:
 *   - it LATCHED. `loadStartedRef` was only reset in the `.catch` branch, which
 *     never ran because the script itself loaded fine. No amount of retyping,
 *     blurring or re-focusing recovered it.
 *   - the console message blamed Google Cloud Console. The API was fine the
 *     whole time; calling fetchAutocompleteSuggestions by hand on the same
 *     "failed" page returned real suggestions. The message sent the fix in the
 *     wrong direction.
 *
 * Reproduced deterministically in production 2026-08-28: whichever address
 * field the visitor focused FIRST failed, while a second field focused later
 * worked — because by then the library had finished attaching.
 */

const root = process.cwd();
const source = readFileSync(
  join(root, "components/investcalc/address-autocomplete.tsx"),
  "utf8",
);

describe("Google Places readiness", () => {
  it("loads with loading=async — the flag that makes onload insufficient", () => {
    // If this ever drops, the importLibrary requirement below can be revisited.
    expect(source).toContain("loading=async");
  });

  it("awaits importLibrary('places') rather than resolving on script onload", () => {
    expect(
      source,
      "the loader must await the Places library, not the bootstrap",
    ).toContain('importLibrary("places")');

    // The naive form is what shipped the bug. Both load paths (fresh script and
    // an already-present one) must go through the library await.
    expect(source).not.toContain("script.onload = () => resolve();");
    expect(source).not.toContain('existing.addEventListener("load", () => resolve()');
  });

  it("does not latch: a failed readiness check allows a later retry", () => {
    const branch = source.slice(
      source.indexOf("AutocompleteSuggestion is missing"),
      source.indexOf("AutocompleteSuggestion is missing") + 900,
    );
    expect(
      branch,
      "the missing-library branch must reset loadStartedRef or the field never recovers",
    ).toContain("loadStartedRef.current = false");
  });

  it("stops blaming Google Cloud Console for what was a timing bug", () => {
    expect(source).not.toContain(
      "AutocompleteSuggestion not in Places library - enable 'Places API (New)' in Google Cloud Console.",
    );
  });
});
