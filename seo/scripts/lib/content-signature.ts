/**
 * Content signature: what a page SAYS, extracted from its TypeScript source
 * with the compiler API, so that `lastmod.ts seed` can tell a content change
 * from a presentation change.
 *
 * A signature is the page's visible text and data: JSX text, string literals
 * and template-literal text, numbers and booleans, href/src and other content
 * attributes, JSON-LD object values and FAQ arrays. It leaves out:
 *
 *   · className/style (attributes, properties, cn()/clsx()/cva() arguments,
 *     and consts named like `cardClass` / `STYLES`) and other presentation or
 *     configuration attributes (key, id, role, kind, variant, size, target,
 *     rel, sizes, width, height, data-*, on*): they choose how a component
 *     renders, not what the page says (a text prop like heading= still counts);
 *   · import/export-from lines, type declarations and type annotations,
 *     directives ("use client") and route segment config (revalidate, dynamic…);
 *   · whitespace (all of it, so a Prettier reflow is not a change);
 *   · the dates themselves: PUBLISHED_AT/MODIFIED_AT-style consts, the
 *     publishedAt/modifiedAt/datePublished/dateModified/lastmod-style fields,
 *     dates written into text ("August 27, 2026", "2026-08-27"), lookups in
 *     the lastmod map (lastmodFor(...), lastmodOrPublished(...)),
 *     `new Date(...)` and date-formatting calls, and any text whose presence
 *     depends on a date (`post.modifiedAt ? "Updated " : ""`) — a date moving
 *     is never itself a content change;
 *   · social/robots/canonical metadata (openGraph, twitter, robots,
 *     alternates, icons, keywords), which is not the page's main content.
 *
 * Every top-level statement becomes one signature string; a file's signature
 * is the MULTISET of its statement strings, so moving a declaration between
 * files (the F2 registry lift) or reordering declarations is not a change.
 *
 * Pure: no disk, no git. Native-TS rules apply (lib/cli.ts).
 */

import ts from "typescript";

/** PUBLISHED_AT, MODIFIED_AT, POST_MODIFIED_AT … */
export const DATE_CONST_RE = /^[A-Z0-9_]*(?:PUBLISHED|MODIFIED)[A-Z0-9_]*$/;

/** Date fields (object keys, JSX props, property accesses). */
export const DATE_KEYS: ReadonlySet<string> = new Set([
  "publishedAt",
  "modifiedAt",
  "updatedAt",
  "datePublished",
  "dateModified",
  "dateCreated",
  "lastmod",
  "lastModified",
  "publishedTime",
  "modifiedTime",
]);

/** Keys whose value is styling, wherever they appear. */
const PRESENTATION_KEYS: ReadonlySet<string> = new Set(["className", "class", "classes", "classNames", "style", "styles"]);

/** Next metadata keys that are not main content (social cards, robots, canonical). */
const METADATA_ONLY_KEYS: ReadonlySet<string> = new Set([
  "openGraph",
  "twitter",
  "icons",
  "robots",
  "alternates",
  "keywords",
  "other",
  "verification",
  "appleWebApp",
  "formatDetection",
  "manifest",
  "generator",
]);

/** JSX attributes that carry presentation or behaviour, not content. */
const PRESENTATION_ATTRS: ReadonlySet<string> = new Set([
  "className",
  "class",
  "style",
  "key",
  "id",
  "role",
  "tabIndex",
  // A component's configuration, not its words: `<RelatedContent kind="blog" …>`
  // renders links from lib/related-content.ts, so adding or moving the widget
  // is markup (counting it dated two otherwise unchanged posts to 6b4ddb2).
  "kind",
  "variant",
  "size",
  "tone",
  "align",
  "color",
  "as",
  "asChild",
  // Which element a part renders its title as (Note titleAs="h2"), and the
  // element id a part gives its heading (CloseSection headingId="..."): the
  // same kind of choice as `as` and `id` above, passed through a prop.
  "titleAs",
  "headingId",
  "prefetch",
  "target",
  "rel",
  "loading",
  "decoding",
  "priority",
  "sizes",
  "width",
  "height",
  "fill",
  "stroke",
  "strokeWidth",
  "strokeLinecap",
  "strokeLinejoin",
  "viewBox",
  "d",
  "xmlns",
  "type",
  "method",
  "hidden",
  "suppressHydrationWarning",
  "aria-hidden",
  "aria-expanded",
  "aria-controls",
  "aria-describedby",
  "aria-labelledby",
  "aria-current",
  "aria-live",
]);

/** Route segment config exports: how a module runs, not what it says. */
const ROUTE_CONFIG_EXPORTS: ReadonlySet<string> = new Set([
  "dynamic",
  "dynamicParams",
  "revalidate",
  "fetchCache",
  "runtime",
  "preferredRegion",
  "maxDuration",
  "experimental_ppr",
]);

/** Class-name helpers: their arguments are Tailwind classes. */
const CLASS_HELPERS: ReadonlySet<string> = new Set(["cn", "clsx", "cva", "twMerge", "classNames", "classnames"]);

/** A const that holds class names or styles (`cardClass`, `LINK_CLASSES`, `styles`). */
const CLASS_CONST_RE = /(?:class|classes|classname|classnames|style|styles)$/i;

/** A date written into prose ("August 27, 2026", "Aug 27, 2026") or ISO (2026-08-27): stripped, like the date consts. */
const LONG_DATE_RE = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.? \d{1,2}, \d{4}\b/g;
const ISO_DATE_RE = /\b\d{4}-\d{2}-\d{2}\b/g;

/** Methods that format a date for display. */
const DATE_FORMAT_METHODS: ReadonlySet<string> = new Set([
  "toLocaleDateString",
  "toLocaleTimeString",
  "toLocaleString",
  "toISOString",
  "toUTCString",
  "toDateString",
]);

function parse(fileName: string, source: string): ts.SourceFile {
  const kind = fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, kind);
}

function nameText(name: ts.PropertyName | ts.JsxAttributeName | ts.BindingName | undefined): string | null {
  if (!name) return null;
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)) return name.text;
  if (ts.isPrivateIdentifier(name)) return name.text;
  if (ts.isJsxNamespacedName(name)) return `${name.namespace.text}:${name.name.text}`;
  return null;
}

function isDateName(text: string): boolean {
  return DATE_KEYS.has(text) || DATE_CONST_RE.test(text);
}

/** True when a subtree mentions a date const or date field (identifier or property access). */
export function referencesDate(node: ts.Node): boolean {
  let found = false;
  const visit = (n: ts.Node): void => {
    if (found) return;
    if (ts.isIdentifier(n) && isDateName(n.text)) {
      found = true;
      return;
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return found;
}

function calleeName(expr: ts.Expression): string | null {
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr)) return expr.name.text;
  return null;
}

/**
 * `new Date(...)`, `x.toLocaleDateString(...)`, `formatDate(...)`: a date
 * rendered as text; `lastmodFor(...)` / `lastmodOrPublished(...)`: a date
 * looked up in the lastmod map. Either way the call IS a date.
 */
function isDateFormatting(node: ts.Node): boolean {
  if (ts.isNewExpression(node)) return calleeName(node.expression) === "Date";
  if (ts.isCallExpression(node)) {
    const name = calleeName(node.expression);
    if (!name) return false;
    return DATE_FORMAT_METHODS.has(name) || /^format\w*Date/.test(name) || /^lastmod/i.test(name);
  }
  return false;
}

function hasExport(node: ts.Node): boolean {
  return ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
}

/**
 * The content pieces inside `node`, in source order, whitespace collapsed
 * (readable, for evidence). `inMetadata` is true inside `export const
 * metadata` / `generateMetadata`. A signature removes ALL whitespace (sig()).
 */
function tokensOf(root: ts.Node, inMetadataRoot: boolean): string[] {
  const out: string[] = [];
  const push = (text: string): void => {
    // Collapse whitespace BEFORE stripping dates: a reflow that splits
    // "January\n 19, 2025" across lines is whitespace, not content.
    const flat = text.replace(/\s+/g, " ").replace(LONG_DATE_RE, "").replace(ISO_DATE_RE, "").replace(/\s+/g, " ").trim();
    if (flat) out.push(flat);
  };
  const visit = (node: ts.Node, inMetadata: boolean): void => {
    // Types say nothing a reader sees.
    if (ts.isTypeNode(node) || ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeParameterDeclaration(node)) return;
    if (ts.isImportDeclaration(node) || ts.isImportEqualsDeclaration(node)) return;
    if (ts.isExportDeclaration(node) && node.moduleSpecifier) return;
    if (ts.isRegularExpressionLiteral(node)) return;

    // The dates themselves, and text that only exists to label a date.
    if (ts.isVariableDeclaration(node)) {
      const name = nameText(node.name);
      if (name && (isDateName(name) || CLASS_CONST_RE.test(name))) return;
      if (name && ts.isIdentifier(node.name)) {
        const meta = inMetadata || name === "metadata";
        if (node.initializer) visit(node.initializer, meta);
        return;
      }
    }
    if (ts.isFunctionDeclaration(node) && node.name?.text === "generateMetadata") {
      if (node.body) visit(node.body, true);
      return;
    }
    if (ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) {
      const key = nameText(node.name);
      if (key && (DATE_KEYS.has(key) || PRESENTATION_KEYS.has(key))) return;
      if (key && inMetadata && METADATA_ONLY_KEYS.has(key)) return;
      if (ts.isPropertyAssignment(node)) {
        // A key is structure; only a computed key can carry text.
        if (ts.isComputedPropertyName(node.name)) visit(node.name, inMetadata);
        visit(node.initializer, inMetadata);
      }
      return;
    }
    if (ts.isJsxAttribute(node)) {
      const name = nameText(node.name);
      if (!name || PRESENTATION_ATTRS.has(name) || DATE_KEYS.has(name) || name.startsWith("data-") || /^on[A-Z]/.test(name)) return;
      if (node.initializer) visit(node.initializer, inMetadata);
      return;
    }
    if (ts.isConditionalExpression(node) && referencesDate(node.condition)) return;
    if (
      ts.isBinaryExpression(node) &&
      (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
        node.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
        node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) &&
      referencesDate(node.left)
    ) {
      return;
    }
    if (isDateFormatting(node)) return;
    if (ts.isCallExpression(node)) {
      const name = calleeName(node.expression);
      if (name && CLASS_HELPERS.has(name)) return;
    }

    // Leaves: the text and data a reader sees.
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      push(node.text);
      return;
    }
    if (ts.isTemplateExpression(node)) {
      push(node.head.text);
      for (const span of node.templateSpans) {
        visit(span.expression, inMetadata);
        push(span.literal.text);
      }
      return;
    }
    if (ts.isNumericLiteral(node) || ts.isBigIntLiteral(node)) {
      push(node.text);
      return;
    }
    if (node.kind === ts.SyntaxKind.TrueKeyword) {
      push("true");
      return;
    }
    if (node.kind === ts.SyntaxKind.FalseKeyword) {
      push("false");
      return;
    }
    if (ts.isJsxText(node)) {
      push(node.text);
      return;
    }
    ts.forEachChild(node, (child) => visit(child, inMetadata));
  };
  visit(root, inMetadataRoot);
  return out;
}

/** Tokens → signature text: every whitespace character removed, pieces concatenated. */
function sig(tokens: readonly string[]): string {
  return tokens.map((t) => t.replace(/\s+/g, "")).join("");
}

/** A top-level statement that is config, a directive, or an import: never content. */
function isNonContentStatement(stmt: ts.Statement): boolean {
  if (ts.isImportDeclaration(stmt) || ts.isImportEqualsDeclaration(stmt)) return true;
  if (ts.isExportDeclaration(stmt) && stmt.moduleSpecifier) return true;
  if (ts.isTypeAliasDeclaration(stmt) || ts.isInterfaceDeclaration(stmt)) return true;
  if (ts.isExpressionStatement(stmt) && ts.isStringLiteral(stmt.expression)) return true; // "use client"
  if (ts.isVariableStatement(stmt) && hasExport(stmt)) {
    const names = stmt.declarationList.declarations.map((d) => nameText(d.name));
    if (names.length > 0 && names.every((n) => n !== null && ROUTE_CONFIG_EXPORTS.has(n))) return true;
  }
  return false;
}

/** The names a top-level statement declares. */
function declaredNames(stmt: ts.Statement): string[] {
  if ((ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt)) && stmt.name) return [stmt.name.text];
  if (ts.isVariableStatement(stmt)) {
    return stmt.declarationList.declarations.flatMap((d) => (ts.isIdentifier(d.name) ? [d.name.text] : []));
  }
  return [];
}

/**
 * Content tokens of each top-level statement of a whole file (statements with
 * no content dropped), or of the named top-level declarations plus every
 * file-local declaration they reference.
 */
export function statementTokens(fileName: string, source: string, names?: readonly string[]): string[][] {
  const sf = parse(fileName, source);
  let statements: ts.Statement[] = sf.statements.filter((s) => !isNonContentStatement(s));
  if (names) {
    const byName = new Map<string, ts.Statement>();
    for (const stmt of statements) for (const name of declaredNames(stmt)) byName.set(name, stmt);
    const keep = new Set<ts.Statement>();
    const queue = names.filter((n) => byName.has(n));
    const seen = new Set<string>(queue);
    while (queue.length) {
      const stmt = byName.get(queue.shift() as string) as ts.Statement;
      if (keep.has(stmt)) continue;
      keep.add(stmt);
      const visit = (n: ts.Node): void => {
        if (ts.isIdentifier(n) && byName.has(n.text) && !seen.has(n.text)) {
          seen.add(n.text);
          queue.push(n.text);
        }
        ts.forEachChild(n, visit);
      };
      visit(stmt);
    }
    statements = statements.filter((s) => keep.has(s));
  }
  return statements.map((stmt) => tokensOf(stmt, false)).filter((tokens) => sig(tokens).length > 0);
}

/** One signature string per content-bearing statement (see statementTokens). */
export function statementSignatures(fileName: string, source: string, names?: readonly string[]): string[] {
  return statementTokens(fileName, source, names).map(sig);
}

function unwrap(expr: ts.Expression): ts.Expression {
  let e = expr;
  while (ts.isAsExpression(e) || ts.isSatisfiesExpression(e) || ts.isParenthesizedExpression(e) || ts.isTypeAssertionExpression(e)) e = e.expression;
  return e;
}

function stringProp(obj: ts.ObjectLiteralExpression, key: string): string | null {
  for (const p of obj.properties) {
    if (ts.isPropertyAssignment(p) && nameText(p.name) === key) {
      const v = unwrap(p.initializer);
      if (ts.isStringLiteral(v) || ts.isNoSubstitutionTemplateLiteral(v)) return v.text;
    }
  }
  return null;
}

export type EntryFields = {
  /** Only these keys count (the fields the page template renders). */
  fields?: readonly string[];
  /** These keys never count. */
  omit?: readonly string[];
};

/** `[key, tokens]` for every counted field of an entry, sorted by key (field order in a record is not content). */
function entryFields(obj: ts.ObjectLiteralExpression, opts: EntryFields): Array<[string, string[]]> {
  const parts: Array<[string, string[]]> = [];
  for (const p of obj.properties) {
    if (!ts.isPropertyAssignment(p) && !ts.isShorthandPropertyAssignment(p)) continue;
    const key = nameText(p.name);
    if (!key) continue;
    if (opts.fields && !opts.fields.includes(key)) continue;
    if (opts.omit && opts.omit.includes(key)) continue;
    if (DATE_KEYS.has(key)) continue;
    parts.push([key, ts.isPropertyAssignment(p) ? tokensOf(p.initializer, false) : []]);
  }
  return parts.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

/** `slug → field` for the string field of every entry in `container` (e.g. BLOG_POSTS publishedAt). */
export function entryStringField(fileName: string, source: string, container: string, field: string): Map<string, string> {
  const out = new Map<string, string>();
  const sf = parse(fileName, source);
  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || decl.name.text !== container || !decl.initializer) continue;
      const init = unwrap(decl.initializer);
      const values = ts.isArrayLiteralExpression(init)
        ? init.elements.map((el) => unwrap(el as ts.Expression))
        : ts.isObjectLiteralExpression(init)
          ? init.properties.flatMap((p) => (ts.isPropertyAssignment(p) ? [unwrap(p.initializer)] : []))
          : [];
      for (const value of values) {
        if (!ts.isObjectLiteralExpression(value)) continue;
        const slug = stringProp(value, "slug");
        const text = stringProp(value, field);
        if (slug !== null && text !== null) out.set(slug, text);
      }
    }
  }
  return out;
}

/**
 * The entries of `container` (a top-level const holding an object-literal
 * record or an array of object literals), keyed by the entry's `slug` field,
 * or by its property name when the entry has no slug (a record keyed by slug,
 * like HUD_RENTS).
 */
function entryObjects(fileName: string, source: string, container: string): Map<string, ts.ObjectLiteralExpression> {
  const sf = parse(fileName, source);
  const out = new Map<string, ts.ObjectLiteralExpression>();
  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || decl.name.text !== container || !decl.initializer) continue;
      const init = unwrap(decl.initializer);
      if (ts.isObjectLiteralExpression(init)) {
        for (const p of init.properties) {
          if (!ts.isPropertyAssignment(p)) continue;
          const value = unwrap(p.initializer);
          if (!ts.isObjectLiteralExpression(value)) continue;
          const slug = stringProp(value, "slug") ?? nameText(p.name);
          if (slug !== null) out.set(slug, value);
        }
      } else if (ts.isArrayLiteralExpression(init)) {
        for (const el of init.elements) {
          const value = unwrap(el as ts.Expression);
          if (!ts.isObjectLiteralExpression(value)) continue;
          const slug = stringProp(value, "slug");
          if (slug !== null) out.set(slug, value);
        }
      }
    }
  }
  return out;
}

/** `slug → signature` of every entry of `container` (only the counted fields). */
export function entrySignatures(fileName: string, source: string, container: string, opts: EntryFields = {}): Map<string, string> {
  const out = new Map<string, string>();
  for (const [slug, obj] of entryObjects(fileName, source, container)) {
    out.set(slug, entryFields(obj, opts).map(([key, tokens]) => `${key}=${sig(tokens)}`).join("\u0002"));
  }
  return out;
}

/** `slug → readable tokens` of every entry of `container` ("key: text"), for evidence. */
export function entryTokens(fileName: string, source: string, container: string, opts: EntryFields = {}): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const [slug, obj] of entryObjects(fileName, source, container)) {
    out.set(slug, entryFields(obj, opts).flatMap(([key, tokens]) => tokens.map((t) => `${key}: ${t}`)));
  }
  return out;
}
