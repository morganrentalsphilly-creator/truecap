/**
 * Weekly summary email — a compact per-user recap of their portfolio:
 * active pipeline, owned equity, the week's biggest rate mover, due-
 * diligence deadlines, and buy-box fit. Rendered server-side by
 * app/api/cron/send-weekly-summary/route.ts via @react-email/render;
 * sent as individual Resend emails (NOT a broadcast — content is
 * per-user). Every number comes from lib/weekly-summary.ts, which reuses
 * the dashboard's own libs — the email can never disagree with the app.
 *
 * Brand: matches emails/rate-alert.tsx — #5248D4 primary, white card on
 * #F1F5F9, "TrueCap." wordmark.
 */

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { WeeklySummaryPayload } from "@/lib/weekly-summary";

const BRAND = "#5248D4";
const INK = "#0F172A";
const SUB = "#475569";
const POSITIVE = "#16A34A";
const NEGATIVE = "#DC2626";

export type WeeklySummaryEmailProps = {
  payload: WeeklySummaryPayload;
  siteUrl: string;
};

const fmtMoney = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

const fmtSignedMoney = (n: number) => `${n >= 0 ? "+" : "-"}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

const rowStyle = {
  border: "1px solid #E2E8F0",
  borderRadius: 12,
  padding: "12px 16px",
} as const;

const rowTitleStyle = {
  color: SUB,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
  margin: "0 0 4px",
};

const rowMainStyle = {
  color: INK,
  fontSize: 14,
  fontWeight: 600,
  lineHeight: "21px",
  margin: 0,
};

const rowSubStyle = {
  color: SUB,
  fontSize: 12,
  lineHeight: "18px",
  margin: "4px 0 0",
};

export default function WeeklySummaryEmail({ payload, siteUrl }: WeeklySummaryEmailProps) {
  const { pipeline, owned, rateMover, dueItems, buyBox } = payload;
  return (
    <Html>
      <Head />
      <Preview>
        {"Your week in deals — the numbers on your pipeline and portfolio, recomputed."}
      </Preview>
      <Body style={{ backgroundColor: "#F1F5F9", margin: 0, fontFamily: "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: "32px 16px" }}>
          <Section style={{ backgroundColor: "#FFFFFF", borderRadius: 16, overflow: "hidden" }}>
            <Section style={{ backgroundColor: BRAND, height: 6, fontSize: 6, lineHeight: "6px" }}>&nbsp;</Section>
            <Section style={{ padding: "28px 32px 8px" }}>
              <Link href={siteUrl} style={{ color: INK, fontWeight: 800, fontSize: 20, textDecoration: "none" }}>
                TrueCap<span style={{ color: BRAND }}>.</span>
              </Link>
              <Heading as="h1" style={{ color: INK, fontSize: 22, lineHeight: "30px", margin: "20px 0 4px" }}>
                Your week in deals
              </Heading>
              <Text style={{ color: SUB, fontSize: 14, lineHeight: "22px", margin: "0 0 8px" }}>
                The numbers on your saved deals, recomputed with the same engine
                as your dashboard.
              </Text>
            </Section>

            {pipeline ? (
              <Section style={{ padding: "8px 32px" }}>
                <Section style={rowStyle}>
                  <Text style={rowTitleStyle}>Active pipeline</Text>
                  <Text style={rowMainStyle}>
                    {pipeline.count === 1 ? "1 deal" : `${pipeline.count} deals`} ·{" "}
                    {fmtMoney(pipeline.monthlyCashFlow)}/mo projected cash flow
                  </Text>
                  <Text style={rowSubStyle}>
                    <Link href={`${siteUrl}/dashboard`} style={{ color: BRAND }}>
                      See your pipeline →
                    </Link>
                  </Text>
                </Section>
              </Section>
            ) : null}

            {owned ? (
              <Section style={{ padding: "8px 32px" }}>
                <Section style={rowStyle}>
                  <Text style={rowTitleStyle}>Owned portfolio</Text>
                  <Text style={rowMainStyle}>
                    {owned.count === 1 ? "1 property" : `${owned.count} properties`} ·{" "}
                    {fmtMoney(owned.monthlyCashFlow)}/mo cash flow
                  </Text>
                  {owned.totalEquity != null ? (
                    <Text style={rowSubStyle}>
                      Estimated equity {fmtMoney(owned.totalEquity)}
                      {owned.equityGain != null ? (
                        <span style={{ color: owned.equityGain >= 0 ? POSITIVE : NEGATIVE, fontWeight: 600 }}>
                          {" "}({fmtSignedMoney(owned.equityGain)} since close)
                        </span>
                      ) : null}
                      {owned.datedCount < owned.count
                        ? ` · ${owned.datedCount} of ${owned.count} with close dates`
                        : ""}
                    </Text>
                  ) : null}
                </Section>
              </Section>
            ) : null}

            {rateMover ? (
              <Section style={{ padding: "8px 32px" }}>
                <Section style={rowStyle}>
                  <Text style={rowTitleStyle}>Rates this week</Text>
                  <Text style={rowMainStyle}>
                    30-yr fixed {rateMover.currentRatePct.toFixed(2)}%{" "}
                    <span style={{ color: rateMover.weeklyMovePp <= 0 ? POSITIVE : NEGATIVE, fontWeight: 600 }}>
                      ({rateMover.weeklyMovePp >= 0 ? "+" : ""}
                      {rateMover.weeklyMovePp.toFixed(2)}pp)
                    </span>
                  </Text>
                  {rateMover.topDeal ? (
                    <>
                      <Text style={{ ...rowSubStyle, color: INK, fontWeight: 600 }}>
                        Biggest mover: {rateMover.topDeal.label}
                      </Text>
                      {rateMover.topDeal.changes.slice(0, 2).map((change) => (
                        <Text
                          key={change}
                          style={{
                            color: rateMover.topDeal!.improved ? POSITIVE : NEGATIVE,
                            fontSize: 12,
                            fontWeight: 600,
                            margin: "2px 0 0",
                          }}
                        >
                          {rateMover.topDeal!.improved ? "▲" : "▼"} {change}
                        </Text>
                      ))}
                    </>
                  ) : (
                    <Text style={rowSubStyle}>
                      No saved-deal verdicts flipped at this week&apos;s rate
                      ({rateMover.monitoredCount === 1
                        ? "1 deal monitored"
                        : `${rateMover.monitoredCount} deals monitored`}).
                    </Text>
                  )}
                </Section>
              </Section>
            ) : null}

            {dueItems.length > 0 ? (
              <Section style={{ padding: "8px 32px" }}>
                <Section style={rowStyle}>
                  <Text style={rowTitleStyle}>Due this week</Text>
                  {dueItems.map((item) => (
                    <Text
                      key={`${item.dealId}-${item.itemLabel}-${item.dueDate}`}
                      style={{ ...rowSubStyle, margin: "2px 0 0" }}
                    >
                      <span style={{ color: item.status === "overdue" ? NEGATIVE : INK, fontWeight: 600 }}>
                        {item.status === "overdue" ? "Overdue" : "Due soon"}
                      </span>{" "}
                      · {item.itemLabel} — {item.dealLabel} ({item.dueDate})
                    </Text>
                  ))}
                  <Text style={rowSubStyle}>
                    <Link href={`${siteUrl}/dashboard/saved-analyses`} style={{ color: BRAND }}>
                      Open your deals →
                    </Link>
                  </Text>
                </Section>
              </Section>
            ) : null}

            {buyBox ? (
              <Section style={{ padding: "8px 32px" }}>
                <Section style={rowStyle}>
                  <Text style={rowTitleStyle}>Buy-box fit</Text>
                  <Text style={rowMainStyle}>
                    {buyBox.passingCount} of {buyBox.evaluatedCount} active{" "}
                    {buyBox.evaluatedCount === 1 ? "deal meets" : "deals meet"} your buy box
                    {buyBox.boxCount > 1 ? ` (${buyBox.boxCount} boxes)` : ""}.
                  </Text>
                </Section>
              </Section>
            ) : null}

            <Section style={{ padding: "16px 32px 28px" }}>
              <Link
                href={`${siteUrl}/dashboard`}
                style={{
                  display: "inline-block",
                  backgroundColor: BRAND,
                  color: "#FFFFFF",
                  fontWeight: 700,
                  fontSize: 14,
                  padding: "12px 20px",
                  borderRadius: 12,
                  textDecoration: "none",
                }}
              >
                Open your dashboard
              </Link>
              <Text style={{ color: SUB, fontSize: 11, lineHeight: "17px", margin: "18px 0 0" }}>
                You get this weekly summary because you&apos;re a TrueCap Pro
                member and opted in. Numbers are recomputed from your own saved
                assumptions — not financial advice. Turn it off any time in{" "}
                <Link href={`${siteUrl}/settings`} style={{ color: SUB, textDecoration: "underline" }}>
                  Settings
                </Link>
                , or reply to this email to stop receiving it.
              </Text>
            </Section>
          </Section>
          <Text style={{ color: "#94A3B8", fontSize: 11, textAlign: "center" as const, margin: "16px 0 0" }}>
            TrueCap · Underwrite rentals in 60 seconds · <Link href={siteUrl} style={{ color: "#94A3B8" }}>usetruecap.com</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
