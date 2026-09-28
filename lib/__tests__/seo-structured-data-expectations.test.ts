import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GLOSSARY_TERM_SET_FRAGMENT,
  HUB_CRUMBS,
  REQUIRED_SCHEMA,
  idPath,
  jsonLdNodes,
  missingSchema,
  structuredDataProblems,
} from "../../scripts/seo/structured-data-expectations.mjs";
import { validateHtml } from "../../seo/scripts/jsonld-validate.ts";

/**
 * scripts/seo/structured-data-expectations.mjs: the F4 values every route
 * family must carry, shared by the production healthcheck and the loop's
 * jsonld-validate. Rendered pages are checked against it in
 * structured-data-f4.test.tsx; this file checks the rules themselves.
 */

const ORIGIN = "https://ci.invalid"; // any origin: rules compare path + fragment
type Node = Record<string, unknown>;
const ld = (...nodes: Node[]) => nodes.map((node) => `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", ...node })}</script>`).join("");
const trail = (...crumbs: Array<[string, string]>) => ({
  "@type": "BreadcrumbList",
  itemListElement: crumbs.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: `${ORIGIN}${path}` })),
});
const problems = (path: string, html: string) => structuredDataProblems(path, jsonLdNodes(html));
const ORG = { "@id": `${ORIGIN}/#organization` };

describe("breadcrumb trails", () => {
  it("requires TrueCap › Hub on each hub", () => {
    // (The glossary hub has its set rule too; only the crumb problems are looked at here.)
    const crumbProblems = (path: string, html: string) => problems(path, html).filter((p: string) => /BreadcrumbList/.test(p));
    for (const [path, name] of Object.entries(HUB_CRUMBS)) {
      expect(crumbProblems(path, ld(trail(["TrueCap", "/"], [name, path]))), path).toEqual([]);
      expect(crumbProblems(path, ld()), path).toEqual(["expected one BreadcrumbList, found 0"]);
      expect(crumbProblems(path, ld(trail(["TrueCap", "/"], ["Elsewhere", "/pricing"])))[0], path).toMatch(/^BreadcrumbList is/);
    }
  });

  it("requires TrueCap › Comparisons › page on /vs pages (the old two-level trail fails)", () => {
    expect(problems("/vs/stessa", ld(trail(["TrueCap", "/"], ["Comparisons", "/vs"], ["TrueCap vs Stessa", "/vs/stessa"])))).toEqual([]);
    expect(problems("/vs/stessa", ld(trail(["TrueCap", "/"], ["TrueCap vs Stessa", "/vs/stessa"])))[0]).toMatch(/expected TrueCap \(\/\) › Comparisons \(\/vs\) › … \(\/vs\/stessa\)/);
  });
});

describe("tool application entities", () => {
  const app = (over: Node = {}) => ({ "@type": "WebApplication", "@id": `${ORIGIN}/tools/x#app`, name: "X", applicationCategory: "FinanceApplication", offers: { "@type": "Offer", price: "0" }, publisher: ORG, ...over });

  it("passes one app with the stable @id and the Organization as publisher", () => {
    expect(problems("/tools/x", ld(app()))).toEqual([]);
  });

  it("fails two entities, a missing or wrong @id, and an inline publisher", () => {
    expect(problems("/tools/x", ld(app(), { ...app(), "@type": "SoftwareApplication", "@id": undefined }))).toContain("expected exactly one application entity, found 2");
    expect(problems("/tools/x", ld(app({ "@id": undefined })))[0]).toMatch(/application @id is null/);
    expect(problems("/tools/x", ld(app({ "@id": `${ORIGIN}/tools/y#app` })))[0]).toMatch(/expected <origin>\/tools\/x#app/);
    expect(problems("/tools/x", ld(app({ publisher: { "@type": "Organization", name: "TrueCap", url: ORIGIN } })))).toEqual([
      "application publisher must be the Organization by @id (<origin>/#organization)",
    ]);
    expect(problems("/tools/x", ld())).toEqual(["expected exactly one application entity, found 0"]);
  });

  it("exempts the spreadsheet (a document, not an app)", () => {
    expect(problems("/tools/rental-property-spreadsheet", ld({ "@type": "SpreadsheetDigitalDocument", name: "x" }))).toEqual([]);
    expect(missingSchema("/tools/rental-property-spreadsheet", jsonLdNodes(ld(trail(["TrueCap", "/"]))))).toEqual([]);
    expect(missingSchema("/tools/x", jsonLdNodes(ld(trail(["TrueCap", "/"]))))).toEqual([{ label: "calculator", missing: ["WebApplication or SoftwareApplication"] }]);
  });
});

describe("/analyze, the product entity and the glossary set", () => {
  it("/analyze must name /#software by @id and declare no app of its own", () => {
    const page = { "@type": "WebPage", name: "Analyze", mainEntity: { "@id": `${ORIGIN}/#software` } };
    expect(problems("/analyze", ld(page))).toEqual([]);
    expect(problems("/analyze", ld({ ...page, mainEntity: undefined }))).toHaveLength(1);
    expect(problems("/analyze", ld(page, { "@type": "SoftwareApplication", name: "TrueCap" }))).toEqual(["declares an application entity instead of referencing /#software"]);
  });

  it("outside the tools, an application entity must be the product (/#software), e.g. /pricing's Offers", () => {
    const product = (over: Node = {}) => ({ "@type": "SoftwareApplication", "@id": `${ORIGIN}/#software`, name: "TrueCap", applicationCategory: "FinanceApplication", offers: [{ "@type": "Offer", price: 0 }], ...over });
    expect(problems("/pricing", ld(product()))).toEqual([]);
    expect(problems("/", ld({ "@graph": [product()] }))).toEqual([]);
    // The pre-fix /pricing: a second "TrueCap" with no @id.
    expect(problems("/pricing", ld(product({ "@id": undefined })))).toEqual([
      'application entity "TrueCap" has @id null; outside /tools/<slug> the only application is the product, <origin>/#software',
    ]);
    expect(problems("/for-agents", ld(product({ "@id": `${ORIGIN}/for-agents#app` })))).toHaveLength(1);
    // A reference is not a declaration, and the tool pages keep their own #app rule.
    expect(problems("/blog/x", ld({ "@type": "WebPage", name: "x", mainEntity: { "@id": `${ORIGIN}/#software` } }))).toEqual([]);
    expect(problems("/tools/x", ld({ "@type": "WebApplication", "@id": `${ORIGIN}/tools/x#app`, name: "X", applicationCategory: "FinanceApplication", offers: {}, publisher: ORG }))).toEqual([]);
    expect(missingSchema("/pricing", jsonLdNodes(ld({ "@type": "FAQPage" })))).toEqual([{ label: "pricing", missing: ["SoftwareApplication"] }]);
  });

  it("the hub's set is /glossary#terms and every term points at it", () => {
    const setId = `${ORIGIN}${GLOSSARY_TERM_SET_FRAGMENT}`;
    const term = (inSet: unknown) => ({ "@type": "DefinedTerm", name: "Cap rate", description: "d", inDefinedTermSet: inSet });
    const hub = (id: string, inSet: unknown) => ({ "@type": "DefinedTermSet", "@id": id, name: "G", hasDefinedTerm: [term(inSet)] });
    const crumbs = trail(["TrueCap", "/"], ["Glossary", "/glossary"]);
    expect(problems("/glossary", ld(crumbs, hub(setId, { "@id": setId })))).toEqual([]);
    expect(problems("/glossary", ld(crumbs, hub(`${ORIGIN}/glossary#set`, { "@id": `${ORIGIN}/glossary#set` })))).toEqual([
      "expected one DefinedTermSet with @id <origin>/glossary#terms",
      "1 DefinedTerm(s) not in the set <origin>/glossary#terms",
    ]);
    expect(problems("/glossary/cap-rate", ld(term({ "@type": "DefinedTermSet", "@id": setId, name: "G" })))).toEqual([]);
    expect(problems("/glossary/cap-rate", ld(term({ "@type": "DefinedTermSet", name: "G" })))).toEqual(["1 DefinedTerm(s) not in the set <origin>/glossary#terms"]);
  });
});

describe("wiring", () => {
  it("compares @ids by path and fragment, whatever the origin", () => {
    expect(idPath("https://usetruecap.com/tools/x#app")).toBe("/tools/x#app");
    expect(idPath("http://127.0.0.1:3172/")).toBe("/");
    expect(idPath("https://ci.invalid/vs/")).toBe("/vs");
    expect(idPath("/relative")).toBeNull();
  });

  it("covers the hubs, /analyze and the calculators in REQUIRED_SCHEMA", () => {
    const labels = REQUIRED_SCHEMA.map((rule: { label: string }) => rule.label);
    for (const label of ["blog hub", "tools hub", "comparisons hub", "markets hub", "states hub", "glossary hub", "analyzer", "calculator", "pricing"]) expect(labels).toContain(label);
  });

  it("the healthcheck and jsonld-validate both use the shared module (no private copy of the table)", () => {
    const healthcheck = readFileSync(join(process.cwd(), "scripts/seo/healthcheck.mjs"), "utf8");
    expect(healthcheck).toContain('import { jsonLdNodes, missingSchema, structuredDataProblems } from "./structured-data-expectations.mjs";');
    expect(healthcheck).not.toMatch(/const REQUIRED_SCHEMA\s*=/);
    expect(healthcheck).toMatch(/structuredDataProblems\(path, ldNodes\)/);
    // jsonld-validate reports the same values as "page" findings.
    const vs = `<html><body>${ld(trail(["TrueCap", "/"], ["TrueCap vs X", "/vs/x"]))}<main><p>x</p></main></body></html>`;
    expect(validateHtml(vs, "/vs/x").map((f) => f.type)).toEqual(["page"]);
    expect(validateHtml(vs, "https://usetruecap.com/vs/x").map((f) => f.type)).toEqual(["page"]);
  });
});
