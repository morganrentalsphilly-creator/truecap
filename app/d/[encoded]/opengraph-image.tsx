/**
 * Per-deal dynamic OG image for shared deal links.
 *
 * Decodes the share payload, runs the analysis, and renders a 1200x630
 * preview card with the address, key metrics, and a recommendation
 * badge. Next.js auto-detects this file (App Router convention) and
 * uses it as the page's OG image, overriding any images: [] declared
 * in generateMetadata.
 *
 * Constraints (next/og):
 *  - JSX subset only (basic divs + inline styles + text)
 *  - No Tailwind classes
 *  - No custom fonts unless we fetch them in the handler
 */

import { ImageResponse } from "next/og";
import { decodeShareLink } from "@/lib/share-link";
import { calculateAnalysis } from "@/lib/calc-analysis";
import { investmentFormSchema } from "@/lib/investcalc-schema";

export const runtime = "edge";
export const alt = "Rental property analysis shared via TrueCap";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BRAND_BLUE = "#2563EB";
const TEXT_INK = "#0F172A";
const TEXT_SUB = "#475569";
const SUCCESS = "#16A34A";
const DANGER = "#DC2626";
const WARN = "#D97706";

const fmtMoney = (n: number) => {
  const abs = Math.abs(Math.round(n)).toLocaleString("en-US");
  return n < 0 ? `-$${abs}` : `$${abs}`;
};
const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

/** Headline classifier — mirrors verdict.ts at a glance. */
function classify(cf: number, cap: number, coc: number, dscr: number, isCash: boolean) {
  if (cf < 0 || (!isCash && dscr < 1.0)) {
    return cf < -200 || (!isCash && dscr < 0.9)
      ? { label: "Avoid", color: DANGER }
      : { label: "Risky", color: WARN };
  }
  if (cf >= 400 && (isCash || dscr >= 1.25) && coc >= 10) {
    return { label: "Strong Buy", color: SUCCESS };
  }
  if (cf >= 100 && (isCash || dscr >= 1.15) && coc >= 6) {
    return { label: "Buy", color: SUCCESS };
  }
  return { label: "Neutral", color: WARN };
}

function Fallback({ headline }: { headline: string }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0B1220",
          color: "#FFFFFF",
          fontFamily: "system-ui",
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 700, opacity: 0.75, letterSpacing: "0.04em" }}>
          Truecap<span style={{ color: BRAND_BLUE }}>.</span>
        </div>
        <div style={{ fontSize: 48, fontWeight: 800, marginTop: 16 }}>{headline}</div>
        <div style={{ fontSize: 22, marginTop: 12, opacity: 0.72 }}>
          Real estate investment analyzer
        </div>
      </div>
    ),
    { ...size }
  );
}

type Params = { encoded: string };

export default async function Image({ params }: { params: Promise<Params> }) {
  const { encoded } = await params;
  const payload = decodeShareLink(encoded);
  if (!payload) return Fallback({ headline: "Shared deal" });

  const parsed = investmentFormSchema.safeParse(payload.values);
  if (!parsed.success) return Fallback({ headline: "Shared deal" });

  let result;
  try {
    result = calculateAnalysis(parsed.data);
  } catch {
    return Fallback({ headline: "Shared deal" });
  }

  // Truncate long addresses on a word boundary with an ellipsis instead
  // of a raw .slice(0, 80) which can cut mid-word (e.g. "...Magnolia Ave-
  // nue Sou" looks broken in social previews). Anything ≤ 80 chars
  // renders as-is. Anything longer truncates at the last whole word that
  // fits within ~76 chars (leaves room for the ellipsis without pushing
  // the visible string past 80).
  const truncateAddress = (raw: string): string => {
    if (raw.length <= 80) return raw;
    const limit = 76;
    const sliced = raw.slice(0, limit);
    const lastSpace = sliced.lastIndexOf(" ");
    // If there's a sensible word boundary at least halfway through, cut
    // there; otherwise fall back to the hard limit (handles addresses
    // with no spaces, e.g. a single very long token).
    const cutAt = lastSpace > limit / 2 ? lastSpace : limit;
    return `${sliced.slice(0, cutAt).trimEnd()}…`;
  };
  const address = truncateAddress(parsed.data.address || "Shared deal");
  const purchasePrice = parsed.data.purchasePrice ?? 0;
  const isCash = result.monthlyPayment <= 0;
  const cf = result.netCashFlow;
  const cap = result.capRate;
  const coc = result.cocReturn;
  const dscr = result.dscr;
  const verdict = classify(cf, cap, coc, dscr, isCash);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#F8FAFC",
          fontFamily: "system-ui",
          color: TEXT_INK,
        }}
      >
        {/* top accent bar */}
        <div style={{ height: 10, background: BRAND_BLUE, display: "flex" }} />

        {/* header */}
        <div
          style={{
            padding: "32px 56px 0 56px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.01em", display: "flex" }}>
            Truecap<span style={{ color: BRAND_BLUE }}>.</span>
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: TEXT_SUB,
              display: "flex",
            }}
          >
            Shared deal
          </div>
        </div>

        {/* address + verdict pill */}
        <div
          style={{
            padding: "28px 56px 0 56px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              // Scale headline font down for long addresses so they
              // never overflow the 1088px content box. Short (≤ 40 char)
              // addresses get the full 52px treatment; longer ones step
              // down to 44 / 38 to stay on one or two lines and avoid
              // pushing the verdict pill below the social-preview fold.
              fontSize: address.length <= 40 ? 52 : address.length <= 60 ? 44 : 38,
              fontWeight: 800,
              // Slight bump for the smaller sizes so 2-line addresses
              // still breathe visually.
              lineHeight: address.length <= 40 ? 1.1 : 1.15,
              letterSpacing: "-0.02em",
              maxWidth: 1088,
              display: "flex",
              // Allow wrapping so 2-line addresses render correctly
              // instead of overflowing horizontally past the safe area.
              flexWrap: "wrap",
            }}
          >
            {address}
          </div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 18, gap: 16 }}>
            <div
              style={{
                background: verdict.color,
                color: "#FFFFFF",
                fontSize: 18,
                fontWeight: 800,
                padding: "8px 18px",
                borderRadius: 999,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              {verdict.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 600, color: TEXT_SUB, display: "flex" }}>
              Purchase {fmtMoney(purchasePrice)}
              {isCash ? " · all cash" : ""}
            </div>
          </div>
        </div>

        {/* metric tiles */}
        <div
          style={{
            padding: "40px 56px 0 56px",
            display: "flex",
            gap: 16,
          }}
        >
          <MetricTile
            label="Cash flow / mo"
            value={fmtMoney(cf)}
            tone={cf >= 0 ? "good" : "bad"}
          />
          <MetricTile label="Cap rate" value={fmtPct(cap)} tone={cap >= 6 ? "good" : "neutral"} />
          <MetricTile
            label="CoC return"
            value={fmtPct(coc)}
            tone={coc >= 8 ? "good" : coc >= 4 ? "neutral" : "bad"}
          />
          <MetricTile
            label="DSCR"
            value={isCash ? "—" : dscr.toFixed(2)}
            sub={isCash ? "Cash" : dscr >= 1.25 ? "Bankable" : "Tight"}
            tone={isCash ? "neutral" : dscr >= 1.25 ? "good" : "bad"}
          />
        </div>

        {/* footer */}
        <div
          style={{
            marginTop: "auto",
            padding: "0 56px 36px 56px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: TEXT_SUB,
            fontSize: 18,
          }}
        >
          <div style={{ display: "flex" }}>Real estate investment analyzer</div>
          <div style={{ fontWeight: 700, color: BRAND_BLUE, display: "flex" }}>usetruecap.com</div>
        </div>
      </div>
    ),
    { ...size }
  );
}

function MetricTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: "good" | "bad" | "neutral";
}) {
  const valueColor = tone === "good" ? SUCCESS : tone === "bad" ? DANGER : TEXT_INK;
  return (
    <div
      style={{
        flex: 1,
        background: "#FFFFFF",
        borderRadius: 16,
        border: "1px solid #E2E8F0",
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 4px 16px rgba(15,23,42,0.04)",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: TEXT_SUB,
          display: "flex",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 42,
          fontWeight: 800,
          color: valueColor,
          marginTop: 6,
          display: "flex",
        }}
      >
        {value}
      </div>
      {sub ? (
        <div style={{ fontSize: 14, color: TEXT_SUB, marginTop: 2, display: "flex" }}>{sub}</div>
      ) : null}
    </div>
  );
}
