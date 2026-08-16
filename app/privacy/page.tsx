/**
 * Public Privacy Policy.
 *
 * Two purposes:
 *
 *   1. Compliance — Google OAuth, Stripe, analytics, diagnostics, email,
 *      and property-data processors all require an accurate public privacy
 *      policy URL.
 *
 *   2. Trust — paid traffic visitors who care about privacy can
 *      verify we don't sell their data before signing up.
 *
 * NOT lawyer-reviewed. Substantive enough to satisfy OAuth
 * verification and look legitimate, but if TrueCap scales materially
 * Morgan should engage a privacy lawyer to review.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How TrueCap collects, uses, and protects your information. We don't sell your data. Plain-English privacy policy for the TrueCap rental property analyzer.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
  // OG block for completeness — these pages aren't typically shared on
  // social, but absence flags as a gap in any SEO crawler and a sane
  // social card if someone does post the link is cheap to provide.
  openGraph: {
    title: "TrueCap Privacy Policy",
    description: "How TrueCap collects, uses, and protects your data. We don't sell it.",
    url: "/privacy",
    type: "article",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap Privacy Policy" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const LAST_UPDATED = "August 16, 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <Link
          href="/"
          className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
        >
          ← TrueCap
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight text-foreground sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

        <article className="prose prose-slate mt-8 max-w-none [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-2 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-5 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed">
          <p>
            TrueCap (&ldquo;TrueCap,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;) operates the
            website at <strong>usetruecap.com</strong> and the related rental property analysis
            tools (the &ldquo;Service&rdquo;). This Privacy Policy explains what information we
            collect, how we use it, and the choices you have. We&apos;ve tried to write it in
            plain English. If anything is unclear, email us at{" "}
            <a href="mailto:hello@usetruecap.com" className="font-medium text-primary hover:underline">
              hello@usetruecap.com
            </a>
            .
          </p>

          <h2 className="text-2xl">The short version</h2>
          <ul>
            <li>We do <strong>not</strong> sell, rent, or trade your personal information.</li>
            <li>We collect what you give us (account info, deals, forms, and optional client-roster data) plus the limited analytics described below.</li>
            <li>Payments are processed by Stripe — we never see your card number.</li>
            <li>You can delete your account anytime by emailing us.</li>
          </ul>

          <h2 className="text-2xl">1. Information we collect</h2>

          <h3>Information you give us</h3>
          <ul>
            <li>
              <strong>Account info</strong> — email address (required) and, if you sign up with
              Google, your Google account&apos;s name and profile picture.
            </li>
            <li>
              <strong>Deals you save</strong> — property addresses, purchase prices, rents,
              expenses, and any notes you save against a deal.
            </li>
            <li>
              <strong>Agent workspace data</strong> — client names and any optional email,
              phone, Buy Box criteria, or deal assignments an Agent Pro user chooses to save.
            </li>
            <li>
              <strong>Forms and branding</strong> — contact details, messages, logos, and
              business information you submit through lead, support, newsletter, or branding
              forms.
            </li>
            <li>
              <strong>Communications</strong> — anything you email us at hello@usetruecap.com.
            </li>
          </ul>

          <h3>Information collected automatically</h3>
          <ul>
            <li>
              <strong>Usage data</strong> — pages visited, calculator actions, broad referrer
              (e.g. &ldquo;came from Google Ads&rdquo;), browser type, approximate location based
              on IP. Nonessential browser analytics through Google and PostHog follows your
              cookie choice; Vercel also provides limited operational analytics. When you are
              signed in, necessary product, account, and billing lifecycle events may be
              associated with your account ID and email so we can deliver the Service,
              understand activation, and troubleshoot account-specific issues.
            </li>
            <li>
              <strong>Cookies</strong> — session cookie for keeping you signed in (set by
              Supabase Auth), plus analytics and advertising storage only according to the
              choice you make in our cookie banner. You can reject nonessential analytics.
            </li>
            <li>
              <strong>Diagnostics</strong> — error, performance, device, and request context
              used to detect failures and security incidents. Sensitive purchase tokens and
              encoded share-link paths are scrubbed from diagnostic URLs and event text before
              events are sent.
            </li>
          </ul>

          <h3>Information we do NOT collect</h3>
          <ul>
            <li>Payment card details — Stripe handles those directly.</li>
            <li>Government-issued ID, SSN, or any KYC data.</li>
            <li>
              Property enrichment is retrieved only as part of an address-based analysis or
              lookup you initiate; we do not continuously monitor unrelated property or
              transaction records.
            </li>
          </ul>

          <h2 className="text-2xl">2. How we use information</h2>
          <ul>
            <li>To run the Service (save your deals, log you in, render reports).</li>
            <li>To measure marketing performance (which ads drive signups).</li>
            <li>To communicate with you about your account, billing, and product updates.</li>
            <li>To detect abuse, fraud, and security incidents.</li>
            <li>To comply with legal obligations.</li>
          </ul>
          <p>
            We do not use your saved deal data to train AI models, build resale datasets, or
            share with third-party advertisers.
          </p>
          <p>
            If you choose to create a deal share link, the analysis snapshot — including the
            property address and financial assumptions — is encoded in that URL. Anyone with
            the link can view it without an account, and the current share-link format does not
            expire or revoke. Share it only with people you intend to receive the analysis.
          </p>

          <h2 className="text-2xl">3. Third-party services</h2>
          <p>The following sub-processors help us run TrueCap:</p>
          <ul>
            <li>
              <strong>Supabase</strong> — database, authentication, file storage.{" "}
              <a href="https://supabase.com/privacy" className="text-primary hover:underline">Privacy</a>
            </li>
            <li>
              <strong>Vercel</strong> — hosting + analytics.{" "}
              <a href="https://vercel.com/legal/privacy-policy" className="text-primary hover:underline">Privacy</a>
            </li>
            <li>
              <strong>Stripe</strong> — payment processing.{" "}
              <a href="https://stripe.com/privacy" className="text-primary hover:underline">Privacy</a>
            </li>
            <li>
              <strong>Google</strong> — Places address suggestions, Analytics, Ads, and
              optional sign-in. Text entered into the address autocomplete and the selected
              place are processed by Google Places.{" "}
              <a href="https://policies.google.com/privacy" className="text-primary hover:underline">Privacy</a>
            </li>
            <li>
              <strong>PostHog</strong> — product analytics and account-lifecycle measurement;
              nonessential browser tracking follows your cookie choice.{" "}
              <a href="https://posthog.com/privacy" className="text-primary hover:underline">Privacy</a>
            </li>
            <li>
              <strong>Sentry</strong> — error reporting, performance monitoring, and security
              diagnostics.{" "}
              <a href="https://sentry.io/privacy/" className="text-primary hover:underline">Privacy</a>
            </li>
            <li>
              <strong>Resend</strong> — transactional and marketing email delivery, including
              the recipient address and the content needed to send the message.{" "}
              <a href="https://resend.com/legal/privacy-policy" className="text-primary hover:underline">Privacy</a>
            </li>
            <li>
              <strong>RentCast</strong> — optional property, sale-comparable, and
              rent-comparable lookups. The full property address is sent for a requested
              lookup; your TrueCap account identity is not.{" "}
              <a href="https://www.rentcast.io/privacy" className="text-primary hover:underline">Privacy</a>
            </li>
            <li>
              <strong>HUD &amp; FRED</strong> — public government data sources queried for area
              rent and national mortgage-rate benchmarks. Requests use the relevant public
              geography or economic-series identifier, not your TrueCap account identity.
            </li>
          </ul>

          <h2 className="text-2xl">4. How long we keep your data</h2>
          <p>
            Account data and saved deals are kept until you delete your account or request
            deletion. Server logs are generally kept for about 30 days. Analytics,
            diagnostic, payment, and email-delivery records follow the applicable processor
            settings and legal requirements. Backups may persist for up to 30 days after
            deletion.
          </p>

          <h2 className="text-2xl">5. Your rights</h2>
          <p>Regardless of where you live, you can:</p>
          <ul>
            <li>Access the personal data we hold about you — email us and we&apos;ll send it.</li>
            <li>Correct inaccurate data — fix it in your account, or email us.</li>
            <li>
              Delete your account and all associated data — email{" "}
              <a href="mailto:hello@usetruecap.com" className="font-medium text-primary hover:underline">
                hello@usetruecap.com
              </a>{" "}
              with the subject &ldquo;Delete my account.&rdquo;
            </li>
            <li>Opt out of marketing emails (unsubscribe link in every marketing email).</li>
          </ul>
          <p>
            If you&apos;re in the EU/UK (GDPR) or California (CCPA), you have additional rights
            including data portability and the right to object to certain processing. Email us
            to exercise them.
          </p>

          <h2 className="text-2xl">6. Security</h2>
          <p>
            We use industry-standard practices: HTTPS everywhere, encrypted database
            connections, hashed passwords (Supabase Auth), and limited internal access on a
            need-to-know basis. No system is perfectly secure — if you suspect a security
            issue, please email us at{" "}
            <a href="mailto:hello@usetruecap.com" className="font-medium text-primary hover:underline">
              hello@usetruecap.com
            </a>
            .
          </p>

          <h2 className="text-2xl">7. Children</h2>
          <p>
            TrueCap is not directed to children under 13. We do not knowingly collect
            information from anyone under 13. If you believe a child has provided us
            information, email us and we will delete it.
          </p>

          <h2 className="text-2xl">8. International transfers</h2>
          <p>
            We&apos;re a U.S.-based service. If you access TrueCap from outside the U.S., your
            data will be transferred to and processed in the U.S. by us and our sub-processors.
          </p>

          <h2 className="text-2xl">9. Changes to this policy</h2>
          <p>
            We&apos;ll update the &ldquo;Last updated&rdquo; date at the top whenever we make
            changes. Material changes (e.g. new categories of data we collect) will be
            announced in-product or by email to active users.
          </p>

          <h2 className="text-2xl">10. Contact</h2>
          <p>
            Questions about this policy? Email{" "}
            <a href="mailto:hello@usetruecap.com" className="font-medium text-primary hover:underline">
              hello@usetruecap.com
            </a>
            .
          </p>
        </article>

        <footer className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
          <Link href="/terms" className="font-medium text-foreground hover:underline">
            Terms of Service
          </Link>
          {" · "}
          <Link href="/" className="font-medium text-foreground hover:underline">
            TrueCap
          </Link>
        </footer>
      </main>
      <SiteFooter />
    </div>
  );
}
