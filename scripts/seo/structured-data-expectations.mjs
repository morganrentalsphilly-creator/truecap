/**
 * What each route family's JSON-LD must say (F4), shared by the production
 * healthcheck (scripts/seo/healthcheck.mjs, whose findings the loop's
 * crawl.ts ingests) and the loop's rendered-page validator
 * (seo/scripts/jsonld-validate.ts). Plain, dependency-free ESM: the
 * healthcheck job runs without `npm ci`.
 *
 *   REQUIRED_SCHEMA         route pattern -> @type groups the page must emit
 *                           (any type in a group satisfies it).
 *   structuredDataProblems  the values F4 fixed, checked per page:
 *     · the six hubs carry TrueCap › Hub, and /vs/<slug> TrueCap ›
 *       Comparisons (/vs) › page;
 *     · a released tool page has exactly ONE application entity, @id
 *       <origin>/tools/<slug>#app, publisher = the Organization's @id;
 *     · /analyze has a WebPage whose mainEntity is <origin>/#software;
 *     · outside the tool pages the only application entity is the product,
 *       the homepage's SoftwareApplication <origin>/#software (/pricing
 *       declares it again to carry the paid Offers, under that @id);
 *     · /glossary's DefinedTermSet has @id <origin>/glossary#terms, and every
 *       DefinedTerm (hub list and term pages) points at it.
 *
 * @ids and crumb URLs are compared by path + fragment, never by origin: a
 * local build (NEXT_PUBLIC_SITE_URL=https://ci.invalid, served on loopback)
 * must pass the same rules as production.
 */

/**
 * A requirement is satisfied by ANY type in its group. The blog rule is a
 * group because `BlogPosting` is a SUBTYPE of `Article` in schema.org and
 * Google documents them as equivalent for article rich results — this repo's
 * posts emit `Article`, which is correct.
 *
 * Written as a one-element array first and caught on the first real run: it
 * reported all 37 blog posts as "missing JSON-LD @type: BlogPosting" when
 * every one of them carries valid `Article` markup. 37 medium findings that
 * are all wrong is worse than no check at all — it is exactly how a weekly
 * report becomes something nobody opens.
 */
export const REQUIRED_SCHEMA = [
  {
    pattern: /^\/blog\/topics$/,
    types: [["CollectionPage"], ["BreadcrumbList"]],
    label: "topic directory",
  },
  {
    pattern: /^\/blog\/(?!topics$)[^/]+$/,
    types: [["BlogPosting", "Article"], ["BreadcrumbList"]],
    label: "blog post",
  },
  {
    pattern: /^\/tools\/[^/]+$/,
    types: [["BreadcrumbList"]],
    label: "tool page",
  },
  {
    // The spreadsheet is a SpreadsheetDigitalDocument, not an application.
    pattern: /^\/tools\/(?!rental-property-spreadsheet$)[^/]+$/,
    types: [["WebApplication", "SoftwareApplication"]],
    label: "calculator",
  },
  {
    pattern: /^\/vs\/[^/]+$/,
    types: [["BreadcrumbList"]],
    label: "comparison page",
  },
  {
    pattern: /^\/glossary\/[^/]+$/,
    types: [["DefinedTerm"], ["BreadcrumbList"]],
    label: "glossary term",
  },
  // F4: the hubs carry a BreadcrumbList beside their collection type.
  { pattern: /^\/blog$/, types: [["Blog"], ["BreadcrumbList"]], label: "blog hub" },
  { pattern: /^\/tools$/, types: [["CollectionPage"], ["BreadcrumbList"]], label: "tools hub" },
  { pattern: /^\/vs$/, types: [["CollectionPage"], ["BreadcrumbList"]], label: "comparisons hub" },
  { pattern: /^\/markets$/, types: [["CollectionPage"], ["BreadcrumbList"]], label: "markets hub" },
  { pattern: /^\/states$/, types: [["ItemList"], ["BreadcrumbList"]], label: "states hub" },
  { pattern: /^\/glossary$/, types: [["DefinedTermSet"], ["BreadcrumbList"]], label: "glossary hub" },
  { pattern: /^\/analyze$/, types: [["WebPage"]], label: "analyzer" },
  { pattern: /^\/pricing$/, types: [["SoftwareApplication"]], label: "pricing" },
];

/** Hub path -> the name its crumb carries (the /vs pages' middle crumb too). */
export const HUB_CRUMBS = {
  "/blog": "Blog",
  "/tools": "Free Tools",
  "/vs": "Comparisons",
  "/markets": "Markets",
  "/states": "States",
  "/glossary": "Glossary",
};

const APP_TYPES = new Set(["SoftwareApplication", "WebApplication", "MobileApplication"]);
const NON_APP_TOOL_PATHS = new Set(["/tools/rental-property-spreadsheet"]);
export const GLOSSARY_TERM_SET_FRAGMENT = "/glossary#terms";

/** Every JSON-LD node in the page: each block, @graph members and nested objects. Unparseable blocks are skipped. */
export function jsonLdNodes(html) {
  const nodes = [];
  const visit = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (!value || typeof value !== "object") return;
    nodes.push(value);
    for (const child of Object.values(value)) if (child && typeof child === "object") visit(child);
  };
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      visit(JSON.parse(m[1]));
    } catch {
      // The healthcheck and jsonld-validate report parse errors themselves.
    }
  }
  return nodes;
}

const typesOf = (node) => (Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]]).filter((t) => typeof t === "string");

/** Every @type the page declares, sorted and de-duplicated (the healthcheck's per-page schemaTypes). */
export function schemaTypes(nodes) {
  return [...new Set(nodes.flatMap(typesOf))].sort();
}
const isReference = (node) => "@id" in node && Object.keys(node).every((key) => key === "@id" || key === "@type" || key === "@context");

/** "/tools/x#app" for "https://any.origin/tools/x#app"; null when it is not an absolute URL. */
export function idPath(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
    return `${pathname}${url.hash}`;
  } catch {
    return null;
  }
}

/** The @type groups a page at `path` is missing, per REQUIRED_SCHEMA. */
export function missingSchema(path, nodes) {
  const types = new Set(nodes.flatMap(typesOf));
  const out = [];
  for (const rule of REQUIRED_SCHEMA) {
    if (!rule.pattern.test(path)) continue;
    const missing = rule.types.filter((group) => !group.some((t) => types.has(t))).map((group) => group.join(" or "));
    if (missing.length) out.push({ label: rule.label, missing });
  }
  return out;
}

function crumbTrail(nodes) {
  return nodes
    .filter((node) => typesOf(node).includes("BreadcrumbList"))
    .map((node) =>
      (Array.isArray(node.itemListElement) ? node.itemListElement : [])
        .slice()
        .sort((a, b) => (a?.position ?? 0) - (b?.position ?? 0))
        .map((item) => ({ name: item?.name ?? item?.item?.name ?? null, path: idPath(typeof item?.item === "string" ? item.item : item?.item?.["@id"]) })),
    );
}

function expectTrail(nodes, expected, add) {
  const trails = crumbTrail(nodes);
  const shown = (trail) => trail.map((c) => `${c.name ?? "?"} (${c.path ?? "?"})`).join(" › ");
  if (trails.length !== 1) {
    add(`expected one BreadcrumbList, found ${trails.length}`);
    return;
  }
  const [trail] = trails;
  const ok = trail.length === expected.length && expected.every((crumb, i) => trail[i].path === crumb.path && (crumb.name === undefined || trail[i].name === crumb.name));
  if (!ok) add(`BreadcrumbList is ${shown(trail)}; expected ${expected.map((c) => `${c.name ?? "…"} (${c.path})`).join(" › ")}`);
}

/**
 * The F4 values a page at `path` must carry, as human-readable problems
 * (empty when it is fine or when no rule covers the path).
 */
export function structuredDataProblems(path, nodes) {
  const problems = [];
  const add = (detail) => problems.push(detail);
  const home = { name: "TrueCap", path: "/" };

  if (Object.hasOwn(HUB_CRUMBS, path)) expectTrail(nodes, [home, { name: HUB_CRUMBS[path], path }], add);

  if (/^\/vs\/[^/]+$/.test(path)) expectTrail(nodes, [home, { name: HUB_CRUMBS["/vs"], path: "/vs" }, { path }], add);

  if (/^\/tools\/[^/]+$/.test(path) && !NON_APP_TOOL_PATHS.has(path)) {
    const apps = nodes.filter((node) => !isReference(node) && typesOf(node).some((t) => APP_TYPES.has(t)));
    if (apps.length !== 1) add(`expected exactly one application entity, found ${apps.length}`);
    for (const app of apps) {
      if (idPath(app["@id"]) !== `${path}#app`) add(`application @id is ${JSON.stringify(app["@id"] ?? null)}; expected <origin>${path}#app`);
      if (idPath(app.publisher?.["@id"]) !== "/#organization" || !isReference(app.publisher)) add("application publisher must be the Organization by @id (<origin>/#organization)");
    }
  }

  if (path === "/analyze") {
    const pages = nodes.filter((node) => typesOf(node).includes("WebPage") && !isReference(node));
    if (!pages.some((page) => idPath(page.mainEntity?.["@id"]) === "/#software")) add("no WebPage names the homepage SoftwareApplication (<origin>/#software) as mainEntity");
    if (nodes.some((node) => !isReference(node) && typesOf(node).some((t) => APP_TYPES.has(t)))) add("declares an application entity instead of referencing /#software");
  }

  // One product, one entity (F4 review): /pricing used to declare a second
  // "TrueCap" SoftwareApplication with no @id beside the homepage's
  // /#software. Anywhere but a tool page (its own #app) and /analyze (which
  // may only reference it), an application entity must BE /#software.
  if (!/^\/tools\/[^/]+$/.test(path) && path !== "/analyze") {
    for (const app of nodes.filter((node) => !isReference(node) && typesOf(node).some((t) => APP_TYPES.has(t)))) {
      if (idPath(app["@id"]) !== "/#software") add(`application entity ${JSON.stringify(app.name ?? null)} has @id ${JSON.stringify(app["@id"] ?? null)}; outside /tools/<slug> the only application is the product, <origin>/#software`);
    }
  }

  if (path === "/glossary") {
    const sets = nodes.filter((node) => typesOf(node).includes("DefinedTermSet") && !isReference(node) && Array.isArray(node.hasDefinedTerm));
    if (sets.length !== 1 || idPath(sets[0]["@id"]) !== GLOSSARY_TERM_SET_FRAGMENT) add(`expected one DefinedTermSet with @id <origin>${GLOSSARY_TERM_SET_FRAGMENT}`);
  }
  if (path === "/glossary" || /^\/glossary\/[^/]+$/.test(path)) {
    const terms = nodes.filter((node) => typesOf(node).includes("DefinedTerm"));
    const stray = terms.filter((term) => idPath(term.inDefinedTermSet?.["@id"]) !== GLOSSARY_TERM_SET_FRAGMENT);
    if (stray.length) add(`${stray.length} DefinedTerm(s) not in the set <origin>${GLOSSARY_TERM_SET_FRAGMENT}`);
  }

  return problems;
}
