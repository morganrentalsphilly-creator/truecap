/**
 * Lifecycle email template — one flexible layout for every lifecycle
 * message: welcome, the onboarding drip (day-NN), the free->Pro nudge,
 * and win-back. Content comes from JSON
 * (emails/lifecycle-content/*.json and emails/daily-campaign-content/
 * day-NN.json) and is rendered server-side by lib/email/render-lifecycle.ts.
 * Sent as individual Resend emails by app/api/cron/send-lifecycle-emails.
 *
 * Brand mirrors emails/rate-alert.tsx — #5248D4 primary, white card on
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

const BRAND = "#5248D4";
const INK = "#0F172A";
const SUB = "#475569";

export type LifecycleEmailProps = {
  preheader: string;
  headline: string;
  body: string[];
  ctaText: string;
  ctaUrl: string;
  signatureNote?: string | null;
  siteUrl: string;
  /** Link to the email-preferences page (CAN-SPAM unsubscribe path). */
  manageUrl: string;
};

export default function LifecycleEmail({
  preheader,
  headline,
  body,
  ctaText,
  ctaUrl,
  signatureNote,
  siteUrl,
  manageUrl,
}: LifecycleEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{preheader}</Preview>
      <Body
        style={{
          backgroundColor: "#F1F5F9",
          margin: 0,
          fontFamily: "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif",
        }}
      >
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: "32px 16px" }}>
          <Section style={{ backgroundColor: "#FFFFFF", borderRadius: 16, overflow: "hidden" }}>
            <Section style={{ backgroundColor: BRAND, height: 6, fontSize: 6, lineHeight: "6px" }}>
              &nbsp;
            </Section>
            <Section style={{ padding: "28px 32px 8px" }}>
              <Link
                href={siteUrl}
                style={{ color: INK, fontWeight: 800, fontSize: 20, textDecoration: "none" }}
              >
                TrueCap<span style={{ color: BRAND }}>.</span>
              </Link>
              <Heading
                as="h1"
                style={{ color: INK, fontSize: 22, lineHeight: "30px", margin: "20px 0 12px" }}
              >
                {headline}
              </Heading>
              {body.map((paragraph, i) => (
                <Text
                  key={i}
                  style={{ color: SUB, fontSize: 15, lineHeight: "24px", margin: "0 0 14px" }}
                >
                  {paragraph}
                </Text>
              ))}
            </Section>
            <Section style={{ padding: "4px 32px 28px" }}>
              <Link
                href={ctaUrl}
                style={{
                  display: "inline-block",
                  backgroundColor: BRAND,
                  color: "#FFFFFF",
                  fontWeight: 700,
                  fontSize: 15,
                  padding: "12px 22px",
                  borderRadius: 10,
                  textDecoration: "none",
                }}
              >
                {ctaText}
              </Link>
              {signatureNote ? (
                <Text style={{ color: SUB, fontSize: 14, lineHeight: "22px", margin: "20px 0 0" }}>
                  {signatureNote}
                </Text>
              ) : null}
            </Section>
          </Section>
          <Text
            style={{
              color: "#94A3B8",
              fontSize: 12,
              lineHeight: "18px",
              textAlign: "center",
              margin: "16px 0 0",
            }}
          >
            TrueCap · Underwrite rentals in 60 seconds
            <br />
            <Link href={manageUrl} style={{ color: "#94A3B8", textDecoration: "underline" }}>
              Manage email preferences
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
