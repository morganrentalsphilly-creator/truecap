import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { JsonLd, serializeJsonLd } from "@/components/seo/json-ld";
import { extractLdJsonBlocks, validateHtml } from "../../seo/scripts/jsonld-validate.ts";

/**
 * F4: components/seo/json-ld.tsx is the one JSON-LD emitter. It escapes
 * < > & and U+2028/U+2029 so no string value can close the <script>, and no
 * page or component writes a JSON-LD <script> of its own.
 */

const ROOT = process.cwd();
const HELPER = "components/seo/json-ld.tsx";
/** A backslash, built so no editor or tool ever reads "\" + "u…" in this file as an escape. */
const BS = "\\";
const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);
const RAW_UNSAFE = ["<", ">", "&", LINE_SEPARATOR, PARAGRAPH_SEPARATOR];

const HOSTILE = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: `Q&A: is 1 < 2 > 0?${LINE_SEPARATOR}next`,
      acceptedAnswer: { "@type": "Answer", text: `</script><script>alert(1)</script><!-- x -->${PARAGRAPH_SEPARATOR}end` },
    },
  ],
};

describe("serializeJsonLd", () => {
  it("escapes < > & U+2028 U+2029 as \\uXXXX and nothing else", () => {
    const out = serializeJsonLd(HOSTILE);
    for (const ch of RAW_UNSAFE) expect(out.includes(ch), `raw U+${ch.charCodeAt(0).toString(16).padStart(4, "0")} left in the output`).toBe(false);
    expect(out).toContain(`${BS}u003c/script${BS}u003e`);
    expect(out).toContain(`Q${BS}u0026A`);
    expect(out).toContain(`${BS}u003c!--`);
    expect(out).toContain(`${BS}u2028next`);
    expect(out).toContain(`${BS}u2029end`);
    // Everything else is JSON.stringify's own output, byte for byte.
    const plain = { "@context": "https://schema.org", "@type": "Thing", name: "Cap rate — 6.5% (2026) “quoted” é 😀" };
    expect(serializeJsonLd(plain)).toBe(JSON.stringify(plain));
  });

  it("parses back to exactly the data it was given", () => {
    expect(JSON.parse(serializeJsonLd(HOSTILE))).toEqual(HOSTILE);
    const list = [{ "@context": "https://schema.org", "@type": "Thing", name: "a & b" }, { "@type": "Thing", name: "<c>" }];
    expect(JSON.parse(serializeJsonLd(list))).toEqual(list);
  });
});

describe("<JsonLd />", () => {
  it("renders one application/ld+json script whose text cannot break out of the element", () => {
    const html = renderToStaticMarkup(<JsonLd data={HOSTILE} />);
    expect(html.startsWith('<script type="application/ld+json">')).toBe(true);
    expect(html.endsWith("</script>")).toBe(true);
    expect(html.match(/<\/script/gi)).toHaveLength(1);
    expect(html).not.toContain("<!--");
    const blocks = extractLdJsonBlocks(html);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].critical).toEqual([]);
    expect(blocks[0].value).toEqual(HOSTILE);
    // The loop's validator (the loopback backstop) sees no breakout either.
    expect(validateHtml(`<html><body><main>${html}<p>Q&amp;A: is 1 &lt; 2 &gt; 0? next</p></main></body></html>`, "/x").filter((f) => f.severity === "critical")).toEqual([]);
  });
});

// ------------------------------------------------------------ the one emitter

function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...tsxFiles(rel));
    else if (/\.tsx$/.test(entry.name)) out.push(rel);
  }
  return out;
}

/** `file:line` of every JSX <script type="application/ld+json"> and every dangerouslySetInnerHTML carrying JSON.stringify. */
function rawJsonLdEmitters(file: string): string[] {
  const source = readFileSync(join(ROOT, file), "utf8");
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: string[] = [];
  const at = (node: ts.Node) => `${file}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1}`;
  const visit = (node: ts.Node): void => {
    if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && node.tagName.getText(sf) === "script") {
      const type = node.attributes.properties.find((a) => ts.isJsxAttribute(a) && a.name.getText(sf) === "type");
      if (type && ts.isJsxAttribute(type) && type.initializer && /application\/ld\+json/.test(type.initializer.getText(sf))) found.push(at(node));
    }
    if (ts.isJsxAttribute(node) && node.name.getText(sf) === "dangerouslySetInnerHTML" && /JSON\.stringify/.test(node.getText(sf))) found.push(at(node));
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

describe("the helper is the only JSON-LD emitter in app/ and components/", () => {
  const files = [...tsxFiles("app"), ...tsxFiles("components")];

  it("finds the helper's own script (the scan works)", () => {
    expect(rawJsonLdEmitters(HELPER)).toHaveLength(1);
  });

  it("no page or component writes a JSON-LD <script> or JSON.stringify into dangerouslySetInnerHTML", () => {
    const offenders = files.filter((file) => file !== HELPER).flatMap(rawJsonLdEmitters);
    expect(offenders, "use <JsonLd data={…} /> from @/components/seo/json-ld").toEqual([]);
  });

  it("imports the helper un-aliased wherever <JsonLd> is used", () => {
    const users = files.filter((file) => file !== HELPER && /<JsonLd\b/.test(readFileSync(join(ROOT, file), "utf8")));
    expect(users.length).toBeGreaterThan(150);
    for (const file of users) {
      expect(readFileSync(join(ROOT, file), "utf8"), file).toMatch(/^import \{ JsonLd \} from "@\/components\/seo\/json-ld";$/m);
    }
  });
});
