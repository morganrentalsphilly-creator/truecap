/**
 * Lifecycle email template — one flexible layout for every lifecycle
 * message: welcome, the onboarding drip (day-NN), the free->Pro nudge,
 * and win-back. Content comes from JSON
 * (emails/lifecycle-content/*.json and emails/daily-campaign-content/
 * day-NN.json) and is rendered server-side by lib/email/render-lifecycle.ts.
 * Sent as individual Resend emails by app/api/cron/send-lifecycle-emails.
 *
 * Footer: every marketing send carries the signed unsubscribe link and the
 * sender's postal address. Both come from the caller
 * (lib/email/lifecycle-compliance.ts builds the link per user; the address is
 * read from EMAIL_POSTAL_ADDRESS). Neither has a default here: an address is
 * never typed in this file, and a sender that has no address does not send.
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
  /** Link to /settings, where alert and summary emails are switched on or off. */
  manageUrl: string;
  /**
   * Signed one-click opt-out (/email/unsubscribe). Present on every marketing
   * send; null only for a billing notice and for a preview that cannot sign.
   */
  unsubscribeUrl?: string | null;
  /** The sender's postal address, from EMAIL_POSTAL_ADDRESS. */
  postalAddress?: string | null;
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
  unsubscribeUrl,
  postalAddress,
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
          {/* Footer text uses the body text color: the unsubscribe link and
              the address have to be readable, and the lighter grey used here
              before was not on this background. */}
          <Text
            style={{
              color: SUB,
              fontSize: 12,
              lineHeight: "18px",
              textAlign: "center",
              margin: "16px 0 0",
            }}
          >
            TrueCap · Underwrite rentals in 60 seconds
            <br />
            You&apos;re getting this email because you have a TrueCap account.
            <br />
            {unsubscribeUrl ? (
              <>
                <Link
                  href={unsubscribeUrl}
                  style={{ color: SUB, textDecoration: "underline" }}
                >
                  Unsubscribe
                </Link>
                {" · "}
              </>
            ) : null}
            <Link href={manageUrl} style={{ color: SUB, textDecoration: "underline" }}>
              Manage email preferences
            </Link>
            {postalAddress ? (
              <>
                <br />
                {postalAddress}
              </>
            ) : null}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
