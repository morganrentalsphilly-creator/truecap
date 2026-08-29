import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { unusableToolRoutes } from "./unreleased-tool-routes";

/**
 * The /vs comparison pages are competitor-term landing pages, so they are
 * generated from a shared skeleton. Two failure modes follow from that.
 *
 * 1. A retargeted tool link can land on a calculator that is not released.
 *    Those pages call notFound(), so the CTA sends a competitor-search visitor
 *    to a 404 at the exact moment they were evaluating us.
 *
 * 2. The differentiating sentence gets copy-pasted. Ten pages once opened the
 *    free-tool CTA with the byte-identical "Want to see just the underwriting
 *    half?", and eight of them pointed at the same calculator, so the pages
 *    that were supposed to speak to ten different competitors read as one page.
 *
 * The shared CTA feature list ("TrueCap Free covers cap rate, CoC, DSCR...")
 * is deliberately identical everywhere and is NOT what this guards — a product
 * description that varies per page is a product description that drifts.
 * What must differ is the lead-in that frames the tool for that competitor.
 */

const VS_DIR = "app/vs";
// Derived from the pages, NOT from the registry list. The list is a subset:
// it omits brrrr-calculator (notFound) and rental-property-tax-calculator
// (permanentRedirect to a blog post). Trusting it let a /vs CTA labelled
// "rental property tax calculator" ship pointing at that redirect.
const UNRELEASED = new Set<string>(unusableToolRoutes().keys());

function vsPages(): string[] {
  return readdirSync(VS_DIR)
    .map((entry) => join(VS_DIR, entry))
    .filter((path) => statSync(path).isDirectory())
    .map((path) => join(path, "page.tsx"))
    .filter((path) => {
      try {
        return statSync(path).isFile();
      } catch {
        return false;
      }
    });
}

/** Text of the CTA lead-in: the prose right before the first /tools/ link. */
function toolLeadIn(source: string): string | null {
  const flat = source.replace(/\{"\s*"\}/g, " ").replace(/\s+/g, " ");
  const linkAt = flat.indexOf('<Link href="/tools/');
  if (linkAt === -1) return null;
  const before = flat
    .slice(0, linkAt)
    .replace(/<[^>]+>/g, " ")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  // Take the last SUBSTANTIAL sentence, not simply the last one. The framing
  // sentence is usually a question, so a plain sentence split returns the
  // fragment after the question mark ("The free") — identical everywhere and
  // under any word floor, so it is skipped and the test passes vacuously. A
  // fixed window of trailing words fails the other way: it reaches back into
  // the previous sentence, which is page-specific, so identical openers still
  // hash differently. Both mistakes were made here; this is the version that
  // actually fails on a reintroduced duplicate.
  const sentences = before
    .split(/(?<=[.?!])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.split(" ").filter(Boolean).length >= 4);
  return sentences.length > 0 ? sentences[sentences.length - 1].toLowerCase() : null;
}

describe("/vs comparison pages", () => {
  it("never link to a calculator that is not released", () => {
    const offenders: string[] = [];
    for (const file of vsPages()) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/href="\/tools\/([a-z0-9-]+)"/g)) {
        if (UNRELEASED.has(match[1])) offenders.push(`${file} -> /tools/${match[1]}`);
      }
    }
    expect(
      offenders,
      // Not all of these 404 — one permanentRedirects to a blog post, which is
      // worse for a CTA because it looks like it worked.
      `these CTAs point at /tools routes a visitor cannot use (404 or redirected away):\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("do not share one copy-pasted lead-in across three or more pages", () => {
    const byLeadIn = new Map<string, string[]>();
    for (const file of vsPages()) {
      const leadIn = toolLeadIn(readFileSync(file, "utf8"));
      if (leadIn == null || leadIn.split(" ").length < 5) continue;
      byLeadIn.set(leadIn, [...(byLeadIn.get(leadIn) ?? []), file]);
    }
    const shared = [...byLeadIn.entries()].filter(([, files]) => files.length >= 3);
    const report = shared
      .map(([text, files]) => `  "${text.slice(0, 70)}" on ${files.length} pages`)
      .join("\n");
    expect(shared, `copy-pasted competitor lead-ins:\n${report}`).toEqual([]);
  });

  it("extracts lead-ins long enough for the comparison to be real", () => {
    // Guard the guard. The uniqueness test skips anything under five words, so
    // an extraction that degrades to a short fragment makes it pass vacuously —
    // which is exactly what happened before. Assert on the COMPARED set, not
    // merely on non-null.
    const compared = vsPages()
      .map((f) => toolLeadIn(readFileSync(f, "utf8")))
      .filter((t): t is string => t != null && t.split(" ").length >= 5);
    // Half the /vs pages carry no /tools/ link at all, so the comparable set
    // is ~20 of 40. The floor catches extraction breakage without tracking the
    // exact count, which would go red every time a page gains or loses a link.
    expect(compared.length).toBeGreaterThanOrEqual(15);
  });
});
