import { ImageResponse } from "next/og";
import {
  loadNewsprintFonts,
  NEWSPRINT,
  NewsprintFrame,
  OG_SIZE,
  ogFamily,
} from "@/lib/og/newsprint";
import { buildSampleDealLedger, formatLedgerDollars } from "@/lib/sample-deal-ledger";
import { formatDscr } from "@/lib/financial-presentation";

/**
 * GET /og/home — the homepage OG card, drawn the way the hero is: the
 * headline beside the sample deal's Verdict Ledger, every figure read from
 * the engine (lib/sample-deal-ledger.ts, the same pure calculation the page
 * uses; CLAUDE.md §3.6 allows it here). No screenshot, so the card never
 * shows a stale capture. If the ledger cannot be built the card degrades to
 * the headline alone, never to a placeholder.
 *
 * public/home.jpg, the image of every page with no card of its own, is a
 * snapshot of this card: scripts/render-default-social-card.ts calls this
 * handler and writes the JPEG. Re-run it when the headline, the sample deal
 * or the frame changes, so the default card and this one stay the same card.
 *
 * A route handler rather than the app/opengraph-image file convention on
 * purpose: a root-level file image is inherited by every child segment and
 * would override the per-page OG images the tools, blog, and /vs pages set.
 */

const HEADLINE = "Stop forwarding listings. Start sending deals that already pencil.";
const URL_TEXT = "usetruecap.com";

export async function GET() {
  const ledger = buildSampleDealLedger();
  const rows = ledger
    ? [
        { label: "Price", asking: formatLedgerDollars(ledger.askingPrice), ceiling: formatLedgerDollars(ledger.offerCeiling), band: false },
        {
          label: "Cash flow after reserves",
          asking: `${formatLedgerDollars(ledger.cashFlowMonthly.asking)}/mo`,
          ceiling: `${formatLedgerDollars(ledger.cashFlowMonthly.ceiling)}/mo`,
          band: true,
        },
        { label: "DSCR", asking: formatDscr(ledger.dscr.asking, true), ceiling: formatDscr(ledger.dscr.ceiling, true), band: false },
      ]
    : [];
  const verdict = ledger
    ? { asking: ledger.meetsTargets.asking, ceiling: ledger.meetsTargets.ceiling }
    : null;
  const total = ledger ? formatLedgerDollars(ledger.offerCeiling) : "";
  const fonts = await loadNewsprintFonts({
    display: `TrueCap. ${HEADLINE} Offer Ceiling`,
    text: `Sample deal At asking At the Offer Ceiling Meets the Buy Box Yes No Free. No account. ${rows.map((r) => r.label).join(" ")}`,
    mono: `${rows.map((r) => `${r.asking}${r.ceiling}`).join("")}${total}${URL_TEXT}`,
  });

  const figure = { display: "flex", justifyContent: "flex-end", width: 150, fontFamily: ogFamily("mono") } as const;

  return new ImageResponse(
    (
      <NewsprintFrame label="Sample deal" footerLeft="Free. No account." footerRight={URL_TEXT}>
        <div style={{ display: "flex", flexGrow: 1, alignItems: "center", gap: 48 }}>
          <div
            style={{
              display: "flex",
              width: ledger ? 430 : 1072,
              fontFamily: ogFamily("display"),
              fontSize: ledger ? 54 : 76,
              lineHeight: 1.02,
              letterSpacing: "-0.012em",
            }}
          >
            {HEADLINE}
          </div>
          {ledger && verdict ? (
            <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, fontSize: 24 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  paddingBottom: 8,
                  borderBottom: `1px solid ${NEWSPRINT.rule}`,
                  color: NEWSPRINT.ink2,
                  fontSize: 20,
                }}
              >
                <div style={{ ...figure, fontFamily: ogFamily("text") }}>At asking</div>
                <div style={{ ...figure, width: 190, fontFamily: ogFamily("text") }}>At the Offer Ceiling</div>
              </div>
              {rows.map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    padding: "12px 8px",
                    margin: "0 -8px",
                    background: row.band ? NEWSPRINT.band : "transparent",
                    borderBottom: `1px solid ${NEWSPRINT.ruleSoft}`,
                  }}
                >
                  <div style={{ display: "flex", flexGrow: 1 }}>{row.label}</div>
                  <div style={figure}>{row.asking}</div>
                  <div style={{ ...figure, width: 190 }}>{row.ceiling}</div>
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "baseline", padding: "12px 0" }}>
                <div style={{ display: "flex", flexGrow: 1 }}>Meets the Buy Box</div>
                <div style={{ ...figure, fontFamily: ogFamily("text"), color: verdict.asking ? NEWSPRINT.positive : NEWSPRINT.miss }}>
                  {verdict.asking ? "Yes" : "No"}
                </div>
                <div style={{ ...figure, width: 190, fontFamily: ogFamily("text"), color: verdict.ceiling ? NEWSPRINT.positive : NEWSPRINT.miss }}>
                  {verdict.ceiling ? "Yes" : "No"}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  paddingTop: 14,
                  borderTop: `1px solid ${NEWSPRINT.ink}`,
                }}
              >
                <div style={{ display: "flex", fontFamily: ogFamily("display"), fontSize: 32 }}>Offer Ceiling</div>
                {/* The one total, over a double rule: two 1px ink lines 3px apart. */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <div style={{ display: "flex", fontFamily: ogFamily("mono"), fontSize: 56, letterSpacing: "-0.02em", lineHeight: 1 }}>
                    {total}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      width: "100%",
                      height: 5,
                      marginTop: 6,
                      borderTop: `1px solid ${NEWSPRINT.ink}`,
                      borderBottom: `1px solid ${NEWSPRINT.ink}`,
                    }}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </NewsprintFrame>
    ),
    { ...OG_SIZE, fonts, headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
  );
}
