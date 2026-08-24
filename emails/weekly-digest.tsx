/**
 * TrueCap Weekly Digest — React Email template.
 *
 * Renders to HTML via @react-email/render. Designed for cross-client
 * rendering (Gmail web/mobile, Apple Mail, Outlook desktop, Yahoo).
 * Uses table-based layout primitives from @react-email/components
 * for maximum compatibility.
 *
 * Design notes:
 *   - Fluid, table-based, max-width 600px (standard email width)
 *   - System font stack — no web fonts (most email clients block them)
 *   - Hex colors only — no CSS vars (Outlook + several mobile clients
 *     don't resolve them)
 *   - Single-column layout — multi-column breaks on Outlook + small
 *     mobile viewports
 *   - Buttons use anchor + table-cell padding pattern for Outlook
 *
 * CAN-SPAM compliance: the footer includes the unsubscribe link
 * (auto-populated by Resend) + a physical mailing address (configured
 * via env var EMAIL_SENDER_ADDRESS, fallback shown in source).
 */

import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";

// ──────────────────────────────────────────────────────────────────
// Content types — what each weekly content file must include.
// Mirrors the JSON schema in /emails/content/*.json.
// ──────────────────────────────────────────────────────────────────

export type WeeklyDigestContent = {
  /** Email subject line. ~50 chars optimal for inbox preview. */
  subject: string;
  /** Preview/preheader text — shows next to subject in inbox lists. */
  preheader: string;
  /** ISO date string YYYY-MM-DD. Used in header timestamp + footer. */
  publishedAt: string;
  /** Optional: week number for display (e.g., "Week 22"). */
  weekLabel?: string;
  /** Market snapshot section. */
  marketSnapshot: {
    headline: string;
    /** 1-2 sentences of narrative. Plain text. */
    body: string;
    /** Up to 3 stat tiles. delta is optional (e.g., "-12bp", "+0.4%"). */
    stats: Array<{
      label: string;
      value: string;
      delta?: string;
      /** Visual color hint for the delta. */
      deltaTone?: "positive" | "negative" | "neutral";
    }>;
  };
  /** Up to 3 deal-spotter notes. Each one is a mini deal write-up. */
  dealSpotter: Array<{
    address: string;
    headlineNumber: string;
    verdict: "Strong" | "Decent" | "Marginal" | "Skip";
    body: string;
  }>;
  /** New blog post to feature, with link back to usetruecap.com. */
  blogFeature?: {
    title: string;
    url: string;
    excerpt: string;
  };
  /** Optional reader question + answer. Skip on weeks with no good Q. */
  qa?: {
    question: string;
    answer: string;
  };
  /** Optional ship note — what shipped in TrueCap this week/month. */
  shipNote?: {
    title?: string;
    items: string[];
  };
};

// ──────────────────────────────────────────────────────────────────
// Style constants — kept in one place so the template stays
// readable and the brand stays consistent.
// ──────────────────────────────────────────────────────────────────

const COLORS = {
  background: "#f6f7fb",
  card: "#ffffff",
  border: "#e6e8ef",
  text: "#0f1421",
  muted: "#5b6378",
  brand: "#5248d4",
  brandSoft: "#eeecfb",
  positive: "#0f9d58",
  negative: "#dc2626",
  neutral: "#5b6378",
  verdictStrong: { bg: "#dcfce7", fg: "#0f5132" },
  verdictDecent: { bg: "#dbeafe", fg: "#1e40af" },
  verdictMarginal: { bg: "#fef3c7", fg: "#92400e" },
  verdictSkip: { bg: "#fee2e2", fg: "#991b1b" },
};

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const SITE_URL = "https://usetruecap.com";

// ──────────────────────────────────────────────────────────────────
// Style objects (inline-style style — email clients require it).
// ──────────────────────────────────────────────────────────────────

const styles = {
  body: {
    backgroundColor: COLORS.background,
    color: COLORS.text,
    fontFamily: FONT_STACK,
    margin: 0,
    padding: 0,
    WebkitFontSmoothing: "antialiased" as const,
    MozOsxFontSmoothing: "grayscale" as const,
  },
  container: {
    maxWidth: "600px",
    margin: "0 auto",
    padding: "24px 16px 48px 16px",
  },
  brandHeader: {
    padding: "8px 0 20px 0",
  },
  brandWordmark: {
    fontSize: "24px",
    fontWeight: 900,
    color: COLORS.text,
    letterSpacing: "-0.5px",
    margin: 0,
    lineHeight: "1.1",
  },
  brandDot: {
    color: COLORS.brand,
  },
  brandKicker: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "1.5px",
    textTransform: "uppercase" as const,
    color: COLORS.brand,
    margin: "0 0 4px 0",
  },
  card: {
    backgroundColor: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: "16px",
    padding: "28px 28px 28px 28px",
    marginBottom: "16px",
  },
  cardCompact: {
    backgroundColor: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: "12px",
    padding: "16px 18px 16px 18px",
    marginBottom: "12px",
  },
  sectionKicker: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "1.5px",
    textTransform: "uppercase" as const,
    color: COLORS.brand,
    margin: "0 0 6px 0",
  },
  h2: {
    fontSize: "18px",
    fontWeight: 800,
    color: COLORS.text,
    margin: "0 0 8px 0",
    lineHeight: "1.3",
  },
  h3: {
    fontSize: "15px",
    fontWeight: 700,
    color: COLORS.text,
    margin: "0 0 4px 0",
    lineHeight: "1.3",
  },
  paragraph: {
    fontSize: "14px",
    lineHeight: "1.6",
    color: COLORS.text,
    margin: "0 0 12px 0",
  },
  paragraphMuted: {
    fontSize: "14px",
    lineHeight: "1.6",
    color: COLORS.muted,
    margin: "0 0 8px 0",
  },
  smallMuted: {
    fontSize: "12px",
    lineHeight: "1.5",
    color: COLORS.muted,
    margin: 0,
  },
  statValue: {
    fontSize: "20px",
    fontWeight: 800,
    color: COLORS.text,
    margin: 0,
    lineHeight: "1.2",
  },
  statLabel: {
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.5px",
    textTransform: "uppercase" as const,
    color: COLORS.muted,
    margin: "0 0 4px 0",
  },
  ctaButton: {
    display: "inline-block",
    backgroundColor: COLORS.brand,
    color: "#ffffff",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 700,
    padding: "12px 20px",
    borderRadius: "10px",
  },
  divider: {
    border: "none",
    borderTop: `1px solid ${COLORS.border}`,
    margin: "24px 0 24px 0",
  },
  footerBlock: {
    padding: "24px 8px 8px 8px",
  },
};

// ──────────────────────────────────────────────────────────────────
// Verdict chip helper — colored pill matching the dashboard verdict.
// ──────────────────────────────────────────────────────────────────

function verdictStyle(verdict: WeeklyDigestContent["dealSpotter"][number]["verdict"]) {
  const map = {
    Strong: COLORS.verdictStrong,
    Decent: COLORS.verdictDecent,
    Marginal: COLORS.verdictMarginal,
    Skip: COLORS.verdictSkip,
  };
  const c = map[verdict] ?? COLORS.verdictDecent;
  return {
    display: "inline-block",
    backgroundColor: c.bg,
    color: c.fg,
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.5px",
    textTransform: "uppercase" as const,
    padding: "3px 8px",
    borderRadius: "999px",
  };
}

function deltaTone(tone: "positive" | "negative" | "neutral" | undefined): string {
  switch (tone) {
    case "positive":
      return COLORS.positive;
    case "negative":
      return COLORS.negative;
    default:
      return COLORS.neutral;
  }
}

// ──────────────────────────────────────────────────────────────────
// Template
// ──────────────────────────────────────────────────────────────────

export function WeeklyDigestEmail({
  content,
  /** Resend can inject the unsubscribe link via {{{RESEND_UNSUBSCRIBE_URL}}}.
   *  We render a placeholder href; when sending via Broadcasts API,
   *  Resend will substitute the real per-recipient URL. */
  unsubscribeUrl = "{{{RESEND_UNSUBSCRIBE_URL}}}",
  senderAddress = "TrueCap · Philadelphia, PA",
}: {
  content: WeeklyDigestContent;
  unsubscribeUrl?: string;
  senderAddress?: string;
}) {
  const publishedDate = new Date(content.publishedAt + "T12:00:00Z").toLocaleDateString(
    "en-US",
    { weekday: "long", month: "long", day: "numeric", year: "numeric" }
  );

  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light only" />
      </Head>
      <Preview>{content.preheader}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Brand header */}
          <Section style={styles.brandHeader}>
            <Text style={styles.brandKicker}>
              TrueCap Weekly{content.weekLabel ? ` · ${content.weekLabel}` : ""}
            </Text>
            <Text style={styles.brandWordmark}>
              Truecap<span style={styles.brandDot}>.</span>
            </Text>
            <Text style={{ ...styles.smallMuted, marginTop: "6px" }}>{publishedDate}</Text>
          </Section>

          {/* Market snapshot */}
          <Section style={styles.card}>
            <Text style={styles.sectionKicker}>Market snapshot</Text>
            <Heading as="h2" style={styles.h2}>
              {content.marketSnapshot.headline}
            </Heading>
            <Text style={styles.paragraph}>{content.marketSnapshot.body}</Text>

            {content.marketSnapshot.stats.length > 0 && (
              <Section style={{ marginTop: "16px" }}>
                <Row>
                  {content.marketSnapshot.stats.slice(0, 3).map((stat, i) => (
                    <Column
                      key={`${stat.label}-${i}`}
                      style={{
                        verticalAlign: "top",
                        padding: i === 0 ? "0 8px 0 0" : i === 2 ? "0 0 0 8px" : "0 8px",
                        width: "33.333%",
                      }}
                    >
                      <Text style={styles.statLabel}>{stat.label}</Text>
                      <Text style={styles.statValue}>{stat.value}</Text>
                      {stat.delta ? (
                        <Text
                          style={{
                            ...styles.smallMuted,
                            color: deltaTone(stat.deltaTone),
                            fontWeight: 600,
                            marginTop: "2px",
                          }}
                        >
                          {stat.delta}
                        </Text>
                      ) : null}
                    </Column>
                  ))}
                </Row>
              </Section>
            )}
          </Section>

          {/* Deal spotter */}
          {content.dealSpotter.length > 0 && (
            <Section style={{ marginTop: "8px", marginBottom: "8px" }}>
              <Text style={{ ...styles.sectionKicker, padding: "0 8px" }}>
                Deal spotter — 3 from this week
              </Text>
              {content.dealSpotter.slice(0, 3).map((deal, idx) => (
                <Section key={`${deal.address}-${idx}`} style={styles.cardCompact}>
                  <Row>
                    <Column style={{ verticalAlign: "top" }}>
                      <Text style={styles.h3}>{deal.address}</Text>
                      <Text
                        style={{
                          ...styles.smallMuted,
                          fontWeight: 700,
                          color: COLORS.brand,
                          marginTop: "2px",
                        }}
                      >
                        {deal.headlineNumber}
                      </Text>
                    </Column>
                    <Column style={{ verticalAlign: "top", textAlign: "right", width: "90px" }}>
                      <span style={verdictStyle(deal.verdict)}>{deal.verdict}</span>
                    </Column>
                  </Row>
                  <Text style={{ ...styles.paragraph, marginTop: "10px", marginBottom: 0 }}>
                    {deal.body}
                  </Text>
                </Section>
              ))}
            </Section>
          )}

          {/* Blog feature */}
          {content.blogFeature && (
            <Section style={styles.card}>
              <Text style={styles.sectionKicker}>New on the blog</Text>
              <Heading as="h2" style={styles.h2}>
                <Link
                  href={content.blogFeature.url}
                  style={{ color: COLORS.text, textDecoration: "none" }}
                >
                  {content.blogFeature.title}
                </Link>
              </Heading>
              <Text style={styles.paragraph}>{content.blogFeature.excerpt}</Text>
              <Link href={content.blogFeature.url} style={styles.ctaButton}>
                Read on TrueCap →
              </Link>
            </Section>
          )}

          {/* Q&A */}
          {content.qa && (
            <Section style={styles.card}>
              <Text style={styles.sectionKicker}>Reader question</Text>
              <Text
                style={{
                  ...styles.paragraph,
                  fontStyle: "italic",
                  borderLeft: `3px solid ${COLORS.brand}`,
                  paddingLeft: "14px",
                  color: COLORS.muted,
                  marginBottom: "16px",
                }}
              >
                &ldquo;{content.qa.question}&rdquo;
              </Text>
              <Text style={styles.paragraph}>{content.qa.answer}</Text>
            </Section>
          )}

          {/* Ship note */}
          {content.shipNote && content.shipNote.items.length > 0 && (
            <Section style={styles.card}>
              <Text style={styles.sectionKicker}>
                {content.shipNote.title ?? "What shipped in TrueCap"}
              </Text>
              {content.shipNote.items.map((item, i) => (
                <Text
                  key={`ship-${i}`}
                  style={{
                    ...styles.paragraph,
                    paddingLeft: "16px",
                    position: "relative" as const,
                    marginBottom: "6px",
                  }}
                >
                  <span style={{ color: COLORS.brand, marginRight: "8px", fontWeight: 700 }}>
                    →
                  </span>
                  {item}
                </Text>
              ))}
            </Section>
          )}

          {/* CTA — back to TrueCap. Conversion-focused copy: leads
              with the specific Pro benefit ($X/mo replaces "free" since
              not all plans are free) rather than a generic open-app CTA. */}
          <Section style={{ ...styles.card, textAlign: "center" as const }}>
            <Heading
              as="h3"
              style={{ ...styles.h2, marginBottom: "8px", fontSize: "17px" }}
            >
              Run these deals — and yours — in 60 seconds.
            </Heading>
            <Text
              style={{
                ...styles.paragraphMuted,
                marginBottom: "16px",
                fontSize: "13px",
              }}
            >
              The secondary Screening Index and selected-rule fit are free. TrueCap Pro adds your buy box
              (each deal shown against YOUR criteria), sensitivity grids,
              10-year projections, an Offer Ceiling calculator, and PDF reports. The Offer Ceiling is
              target-dependent and is not a recommended offer. Underwrite a
              property in less time than it takes to open Excel.
            </Text>
            <Link href={`${SITE_URL}/pricing`} style={styles.ctaButton}>
              Start with TrueCap Pro →
            </Link>
            <Text style={{ ...styles.smallMuted, marginTop: "10px" }}>
              Or run a free analysis at{" "}
              <Link
                href={SITE_URL}
                style={{ color: COLORS.brand, textDecoration: "none" }}
              >
                usetruecap.com
              </Link>
            </Text>
          </Section>

          <Hr style={styles.divider} />

          {/* Footer — CAN-SPAM compliant: physical address + unsubscribe */}
          <Section style={styles.footerBlock}>
            <Text style={styles.smallMuted}>
              You&rsquo;re getting this because you signed up at{" "}
              <Link href={SITE_URL} style={{ color: COLORS.brand, textDecoration: "none" }}>
                usetruecap.com
              </Link>
              . One email a week. Reply to this email if you want to give feedback — it
              comes straight to me.
            </Text>
            <Text style={{ ...styles.smallMuted, marginTop: "12px" }}>{senderAddress}</Text>
            <Text style={{ ...styles.smallMuted, marginTop: "12px" }}>
              <Link
                href={unsubscribeUrl}
                style={{ color: COLORS.muted, textDecoration: "underline" }}
              >
                Unsubscribe
              </Link>
              {"  ·  "}
              <Link
                href={`${SITE_URL}/privacy`}
                style={{ color: COLORS.muted, textDecoration: "underline" }}
              >
                Privacy
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default WeeklyDigestEmail;
