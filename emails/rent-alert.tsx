/**
 * Rent-alert email — sent to a Pro user when the local market rent moved
 * enough to change the story on one or more of their saved deals. Rendered
 * server-side by app/api/cron/send-rent-alerts/route.ts via
 * @react-email/render; sent as individual Resend emails (NOT a broadcast —
 * content is per-user).
 *
 * Sibling to emails/rate-alert.tsx. Brand: #5248D4 primary, white card on
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
import type { RentAlertDeal } from "@/lib/rent-alerts";

const BRAND = "#5248D4";
const INK = "#0F172A";
const SUB = "#475569";
const POSITIVE = "#16A34A";
const NEGATIVE = "#DC2626";

export type RentAlertEmailProps = {
  deals: RentAlertDeal[];
  siteUrl: string;
};

const fmtMoney = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

export default function RentAlertEmail({ deals, siteUrl }: RentAlertEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {`Market rents shifted — here's what changed on ${
          deals.length === 1 ? "a saved deal" : `${deals.length} saved deals`
        }.`}
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
                Market rents moved on your saved deals
              </Heading>
              <Text style={{ color: SUB, fontSize: 14, lineHeight: "22px", margin: "0 0 8px" }}>
                We re-ran your saved deals against the latest local market rent —{" "}
                {deals.length === 1 ? "this one" : `these ${deals.length}`} changed enough
                to matter:
              </Text>
            </Section>

            {deals.map((deal) => {
              const hasDebt = deal.before.dscrBand !== null && deal.after.dscrBand !== null;
              return (
                <Section key={deal.id} style={{ padding: "8px 32px" }}>
                  <Section style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 16px" }}>
                    <Text style={{ color: INK, fontWeight: 700, fontSize: 15, margin: "0 0 2px" }}>
                      {deal.label}
                    </Text>
                    <Text style={{ color: SUB, fontSize: 12, margin: "0 0 8px" }}>
                      You assumed {fmtMoney(deal.savedRentMonthly)}/mo · market now ~
                      {fmtMoney(deal.currentMarketRentMonthly)}/mo
                    </Text>
                    {deal.changes.map((change) => (
                      <Text
                        key={change}
                        style={{
                          color: deal.improved ? POSITIVE : NEGATIVE,
                          fontSize: 13,
                          fontWeight: 600,
                          margin: "0 0 4px",
                        }}
                      >
                        {deal.improved ? "▲" : "▼"} {change}
                      </Text>
                    ))}
                    <Text style={{ color: SUB, fontSize: 12, margin: "6px 0 0" }}>
                      Cash flow {fmtMoney(deal.before.monthlyCashFlow)} → {fmtMoney(deal.after.monthlyCashFlow)}/mo
                      {hasDebt ? <>{" · "}DSCR {deal.before.dscr.toFixed(2)} → {deal.after.dscr.toFixed(2)}</> : null}
                    </Text>
                  </Section>
                </Section>
              );
            })}

            <Section style={{ padding: "16px 32px 28px" }}>
              <Link
                href={`${siteUrl}/dashboard/saved-analyses`}
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
                Open your saved deals
              </Link>
              <Text style={{ color: SUB, fontSize: 11, lineHeight: "17px", margin: "18px 0 0" }}>
                You get deal alerts because you&apos;re a TrueCap Pro member with saved
                deals. Numbers are recomputed from your own saved assumptions with only
                the monthly rent updated to the current market estimate — not financial
                advice. Reply to this email to stop receiving deal alerts.
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
