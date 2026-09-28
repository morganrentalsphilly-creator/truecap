/**
 * The one way this site emits JSON-LD (F4).
 *
 *   <JsonLd data={articleLd} />
 *
 * renders `<script type="application/ld+json">` with the data serialized by
 * JSON.stringify and then made safe for an HTML script element: every `<`,
 * `>` and `&` becomes its JSON unicode escape (a backslash, "u" and the code
 * point in four hex digits: 003c, 003e, 0026), and so do U+2028 and U+2029
 * (2028, 2029). Those escapes are still valid JSON and parse back to the
 * same string, so what a crawler reads is unchanged, but no string value can
 * spell `</script>` or `<!--` in the page's HTML: a dataset string that
 * happens to contain either would otherwise end the script early and turn
 * the rest of the "JSON" into live markup (JSON.stringify escapes neither).
 * U+2028/U+2029 are escaped because they are line terminators to older
 * JavaScript parsers.
 *
 * Pages and components must not write `<script type="application/ld+json">`
 * themselves: the SEO loop's fence (seo/scripts/verify-static.ts) accepts
 * JSON-LD only through this component, imported by name, un-aliased, from
 * this module. A server component: it has no state and reads nothing, so it
 * also renders inside a client tree.
 */

/** One JSON-LD object (usually with "@context"), or several in one block. */
export type JsonLdData = Readonly<Record<string, unknown>> | ReadonlyArray<Readonly<Record<string, unknown>>>;

/** Code units escaped in the serialized JSON: < > & and the two JS line terminators. */
const ESCAPED_CODE_UNITS: ReadonlySet<number> = new Set([0x3c, 0x3e, 0x26, 0x2028, 0x2029]);

/** Backslash + "u": built from pieces so no tool or editor ever reads it as an escape in this file. */
const UNICODE_ESCAPE_PREFIX = "\\" + "u";

/**
 * JSON.stringify(data) with <, >, & and U+2028/U+2029 written as \uXXXX.
 * JSON.parse of the result deep-equals `data` (after JSON's own rules:
 * undefined values dropped, and so on).
 */
export function serializeJsonLd(data: JsonLdData): string {
  const json = JSON.stringify(data);
  if (typeof json !== "string") throw new TypeError("JSON-LD data must serialize to JSON");
  let out = "";
  for (let i = 0; i < json.length; i += 1) {
    const code = json.charCodeAt(i);
    out += ESCAPED_CODE_UNITS.has(code) ? `${UNICODE_ESCAPE_PREFIX}${code.toString(16).padStart(4, "0")}` : json[i];
  }
  return out;
}

export function JsonLd({ data }: { data: JsonLdData }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
