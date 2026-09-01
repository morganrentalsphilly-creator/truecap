/**
 * Deterministic field extraction from deal documents (v1).
 *
 * Scope is deliberately narrow and honest: three numeric fields with strong
 * textual signatures — monthly rent (leases), annual property tax (tax
 * bills), and insurance premium (declaration pages) — extracted from a PDF's
 * TEXT LAYER only. No OCR, no model calls, no guessing: a scanned image PDF
 * yields zero candidates and the UI says so instead of pretending.
 *
 * Extraction PROPOSES; the user CONFIRMS. Nothing here writes to a deal —
 * candidates carry the exact source snippet so the person can verify the
 * number against their own document before applying it, and the applied
 * value is labeled with the source filename in the analyzer.
 *
 * Pure text-in/candidates-out so the whole matcher battery is unit-testable
 * without a PDF in sight; the server action owns download + text layer.
 */

export type ExtractableField =
  | "monthlyRent"
  | "propertyTaxAnnual"
  | "insuranceMonthly";

export interface ExtractionCandidate {
  field: ExtractableField;
  /** Normalized numeric value in the analyzer's unit for that field. */
  value: number;
  /** Human label for the field, for the review UI. */
  label: string;
  /** The exact text neighborhood the number came from (trimmed, <=160 chars). */
  snippet: string;
  /** Crude confidence: "strong" = keyword adjacent to the amount; "weak" =
   *  keyword in the same line but with intervening text. Weak candidates
   *  render with an explicit "verify this" nudge. */
  confidence: "strong" | "weak";
}

const FIELD_LABELS: Record<ExtractableField, string> = {
  monthlyRent: "Monthly rent",
  propertyTaxAnnual: "Annual property tax",
  insuranceMonthly: "Monthly insurance",
};

/** $1,234.56 / 1234 / $1 234 — money-ish token. */
const MONEY = String.raw`\$?\s*([0-9]{1,3}(?:[,\s][0-9]{3})*|[0-9]+)(?:\.([0-9]{2}))?`;

function parseMoney(whole: string, cents: string | undefined): number | null {
  const n = Number(whole.replace(/[,\s]/g, "")) + (cents ? Number(cents) / 100 : 0);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

interface Matcher {
  field: ExtractableField;
  /** Keyword+amount patterns, tried in order; first hit per field wins. */
  strong: RegExp[];
  weak: RegExp[];
  /** Sanity range for the normalized value — a "monthly rent" of $950,000 is
   *  a purchase price the regex wandered into, not a rent. */
  min: number;
  max: number;
  /** Optional transform from matched amount to the analyzer's unit. */
  normalize?: (value: number, matchedText: string) => number;
}

const rx = (s: string) => new RegExp(s, "i");

const MATCHERS: Matcher[] = [
  {
    field: "monthlyRent",
    strong: [
      rx(String.raw`monthly\s+rent(?:\s+(?:of|is|shall\s+be|:))?\s*(?:is\s+)?${MONEY}`),
      rx(String.raw`rent(?:\s+(?:of|is|shall\s+be|:))\s*${MONEY}\s*(?:per|\/|a\s+)\s*month`),
      rx(String.raw`${MONEY}\s*(?:per|\/|a)\s*month(?:[^a-z]|$)`),
      rx(String.raw`base\s+rent[:\s]+${MONEY}`),
    ],
    weak: [rx(String.raw`rent[^.\n]{0,40}?${MONEY}`)],
    min: 200,
    max: 50_000,
  },
  {
    field: "propertyTaxAnnual",
    strong: [
      rx(String.raw`(?:annual\s+)?(?:property\s+|real\s+estate\s+)tax(?:es)?(?:\s+(?:due|billed|of|total|:))?\s*(?:is\s+)?${MONEY}`),
      rx(String.raw`total\s+tax(?:es)?\s+due[:\s]*${MONEY}`),
      rx(String.raw`tax\s+amount[:\s]*${MONEY}`),
    ],
    weak: [rx(String.raw`tax[^.\n]{0,40}?${MONEY}`)],
    min: 100,
    max: 200_000,
  },
  {
    field: "insuranceMonthly",
    strong: [
      rx(String.raw`(?:annual\s+|yearly\s+)premium[:\s]*(?:is\s+)?${MONEY}`),
      rx(String.raw`premium(?:\s+(?:of|is|total|:))\s*${MONEY}`),
      rx(String.raw`total\s+premium[:\s]*${MONEY}`),
    ],
    weak: [rx(String.raw`insurance[^.\n]{0,40}?${MONEY}`)],
    min: 10,
    max: 30_000,
    // Dec pages quote ANNUAL premiums; the analyzer stores monthly. When the
    // matched neighborhood says annual/yearly/12 months (or the raw number is
    // implausibly large for a monthly premium), divide by 12.
    normalize: (value, matched) =>
      /annual|yearly|12\s*month|per\s+year|\/\s*yr/i.test(matched) || value > 2_000
        ? Math.round((value / 12) * 100) / 100
        : value,
  },
];

function snippetAround(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 60);
  const end = Math.min(text.length, index + length + 60);
  return text
    .slice(start, end)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

/**
 * Run every matcher over the document text. At most ONE candidate per field
 * (the first strong hit, else the first sane weak hit) — a review UI listing
 * nine rent guesses would be worse than none.
 */
export function extractDealDocumentCandidates(
  rawText: string,
): ExtractionCandidate[] {
  // Normalize whitespace but keep line structure: the weak patterns bound
  // their search to a line so a rent keyword can't pair with a price four
  // paragraphs later.
  const text = rawText.replace(/[\t\f\r]+/g, " ");
  const out: ExtractionCandidate[] = [];
  for (const matcher of MATCHERS) {
    let found: ExtractionCandidate | null = null;
    for (const [confidence, patterns] of [
      ["strong", matcher.strong],
      ["weak", matcher.weak],
    ] as const) {
      if (found) break;
      for (const pattern of patterns) {
        const match = pattern.exec(text);
        if (!match) continue;
        const value = parseMoney(match[1] ?? "", match[2]);
        if (value == null) continue;
        const normalized = matcher.normalize
          ? matcher.normalize(value, match[0])
          : value;
        if (normalized < matcher.min || normalized > matcher.max) continue;
        found = {
          field: matcher.field,
          value: normalized,
          label: FIELD_LABELS[matcher.field],
          snippet: snippetAround(text, match.index, match[0].length),
          confidence,
        };
        break;
      }
    }
    if (found) out.push(found);
  }
  return out;
}
