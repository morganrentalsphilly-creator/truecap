/**
 * Public Terms of Service.
 *
 * Required by Google OAuth verification, Stripe seller agreement,
 * and basic SaaS hygiene. Product-specific Agent Pro, trial, one-time
 * Decision Pack, refund, and guarantee language approved 2026-08-23.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/marketing/site-footer";
import { TRIAL_DAYS } from "@/lib/trial";
import { getMarketingOfferConfig } from "@/lib/marketing-offer-config";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "TrueCap Terms of Service — the rules that govern your use of usetruecap.com and the TrueCap rental property analyzer.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
  // OG block for completeness — these pages aren't typically shared on
  // social, but absence flags as a gap in any SEO crawler and a sane
  // social card if someone does post the link is cheap to provide.
  openGraph: {
    title: "TrueCap Terms of Service",
    description: "The rules that govern your use of TrueCap and usetruecap.com.",
    url: "/terms",
    type: "article",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap Terms of Service" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const LAST_UPDATED = "August 23, 2026";

export default function TermsPage() {
  const { guaranteeEnabled } = getMarketingOfferConfig();
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
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

        <article className="prose prose-slate mt-8 max-w-none [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-2 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-5 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed">
          <p>
            These Terms of Service (the &ldquo;Terms&rdquo;) govern your access to and use of
            the TrueCap website at <strong>usetruecap.com</strong> and the related rental
            property analysis tools (the &ldquo;Service&rdquo;), provided by TrueCap
            (&ldquo;TrueCap,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;).
          </p>
          <p>
            By accessing or using the Service, you agree to these Terms. If you don&apos;t agree,
            don&apos;t use the Service.
          </p>

          <h2 className="text-2xl">1. The Service</h2>
          <p>
            TrueCap provides software for analyzing rental real estate investments — cap rate,
            cash-on-cash return, debt service coverage, multi-year projections, exit modeling,
            and related calculators. The Service includes a free tier, paid TrueCap Pro
            and Agent Pro subscriptions, and an optional one-time Deal Decision Pack.
          </p>
          <p>
            The Service uses public market data (HUD Fair Market Rent, FRED interest rates)
            and state-level effective tax rates as defaults. <strong>All numbers are
            estimates</strong> intended as starting points for your own due diligence, not
            as appraisals, financial advice, or guarantees of future returns.
          </p>

          <h2 className="text-2xl">2. Eligibility &amp; accounts</h2>
          <p>
            You must be at least 18 years old to create an account. You&apos;re responsible
            for the security of your account credentials and for all activity that happens
            under your account. Tell us immediately at{" "}
            <a href="mailto:hello@usetruecap.com" className="font-medium text-primary hover:underline">
              hello@usetruecap.com
            </a>{" "}
            if you suspect unauthorized access.
          </p>

          <h2 className="text-2xl">3. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for any unlawful purpose or in violation of any law.</li>
            <li>Scrape, crawl, or systematically download content from the Service.</li>
            <li>Reverse-engineer, decompile, or attempt to extract source code.</li>
            <li>Resell, sublicense, or white-label the Service without our written consent.</li>
            <li>
              Use the Service to make decisions about credit, employment, housing, insurance,
              or other consumer-impacting matters in violation of the Fair Housing Act, ECOA,
              FCRA, or similar laws.
            </li>
            <li>
              Upload or generate content that infringes intellectual property, defames any
              person, or promotes discrimination.
            </li>
            <li>
              Attempt to circumvent rate limits, paywalls, or other access controls.
            </li>
          </ul>

          <h2 className="text-2xl">4. Paid subscriptions</h2>
          <h3>Plans &amp; billing</h3>
          <p>
            TrueCap Pro and Agent Pro plans are billed in advance on the cadence shown at
            checkout by Stripe. By
            subscribing, you authorize us (via Stripe) to charge the recurring fee to your
            payment method until you cancel. Prices are listed at{" "}
            <Link href="/pricing" className="font-medium text-primary hover:underline">
              usetruecap.com/pricing
            </Link>{" "}
            and may change with notice — your existing billing cycle will run at the price
            you signed up at.
          </p>
          <h3>Free trials</h3>
          <p>
            Eligible new subscribers may receive a {TRIAL_DAYS}-day free trial when the
            checkout page expressly offers one. Unless you cancel before the trial ends,
            the subscription automatically converts to the paid plan and billing cadence
            shown at checkout. Trial eligibility is limited to one introductory trial per
            customer and is not restored by canceling and subscribing again.
          </p>
          <h3>Cancellation</h3>
          <p>
            You can cancel any time from your profile. Cancellation stops future charges; your
            Pro features remain active until the end of the period you&apos;ve already paid for,
            then your account automatically downgrades to Free. Your saved deals and PDF
            exports remain in your account and viewable on Free.
          </p>
          <h3>Refunds</h3>
          <p>
            Subscription charges are non-refundable except where required by law, for billing
            errors we confirm
            {guaranteeEnabled ? (
              <>
                , or when a customer satisfies the published terms of the{" "}
                <Link href="/guarantee" className="font-medium text-primary hover:underline">
                  Never Overpay Guarantee
                </Link>
              </>
            ) : null}
            . If you believe you were charged in error, email{" "}
            <a href="mailto:hello@usetruecap.com" className="font-medium text-primary hover:underline">
              hello@usetruecap.com
            </a>{" "}
            and we&apos;ll review.
          </p>
          <h3>One-time Deal Decision Pack</h3>
          <p>
            A Deal Decision Pack is a one-time purchase for the analysis identified at
            checkout. It does not create a recurring subscription and does not include future
            analyses or ongoing Pro access. Because the digital report is generated and made
            available immediately after payment, Pack purchases are final once delivered,
            except where required by law or when we confirm that the purchased report could
            not be delivered because of a TrueCap error.
          </p>
          <h3>Taxes</h3>
          <p>
            Fees do not include taxes. Where required, applicable taxes will be added by Stripe
            at checkout.
          </p>

          <h2 className="text-2xl">5. Agent Pro and client information</h2>
          <p>
            Agent Pro provides client-workspace and co-branded reporting tools. If you enter
            information about a client, lead, or other person, you represent that you have a
            lawful basis and any required permission to provide and use that information. You
            remain responsible for your communications, fair-housing and advertising
            compliance, professional licensing obligations, and every recommendation you make
            to a client. Co-branding does not transfer ownership of TrueCap or authorize a
            white-label, resale, or sublicensing arrangement.
          </p>

          <h2 className="text-2xl">6. Your content</h2>
          <p>
            You retain ownership of any data you enter into the Service (the
            &ldquo;Your Content&rdquo;). You grant us a limited license to store, process, and
            display Your Content solely to operate the Service for you. We do not use Your
            Content to train AI models, resell to third parties, or surface in marketing
            without your explicit consent.
          </p>

          <h2 className="text-2xl">7. Our intellectual property</h2>
          <p>
            The Service — including the calculators, math, UI design, marketing copy, and the
            TrueCap brand — is owned by us and protected by copyright and trademark law. We
            grant you a personal, non-transferable, non-exclusive license to use the Service in
            accordance with these Terms.
          </p>

          <h2 className="text-2xl">8. NOT financial, legal, or tax advice</h2>
          <p>
            <strong>This is the most important section. Read it.</strong>
          </p>
          <p>
            TrueCap is a calculator. We are not a registered investment advisor, real estate
            broker, accountant, lender, attorney, or tax professional. The outputs of the
            Service — including projected cash flow, cap rate, deal score, recommendations,
            and exit modeling — are estimates based on the inputs you provide and standard
            real estate math. They are not advice, guarantees, appraisals, or substitutes for
            professional counsel.
          </p>
          <p>
            Before purchasing, selling, financing, or making any decision about a real estate
            investment, you should consult a qualified real estate professional, attorney, CPA,
            and/or licensed lender in your jurisdiction. You are solely responsible for the
            investment decisions you make.
          </p>

          <h2 className="text-2xl">9. Disclaimer of warranties</h2>
          <p>
            The Service is provided <strong>&ldquo;as is&rdquo; and &ldquo;as available&rdquo;</strong>
            without warranties of any kind, express or implied, including but not limited to
            merchantability, fitness for a particular purpose, accuracy, or non-infringement.
            We do not warrant that the Service will be uninterrupted, error-free, secure, or
            that any data we surface (rents, rates, tax assessments) will be current or correct.
          </p>

          <h2 className="text-2xl">10. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, TrueCap and its founders, employees, and
            contractors will not be liable for any indirect, incidental, special, consequential,
            or punitive damages — including lost profits, lost data, lost investment
            opportunities, or property loss — arising from your use of the Service, even if
            we&apos;ve been advised of the possibility.
          </p>
          <p>
            Our total aggregate liability for any claim arising out of or relating to the
            Service is limited to the amount you paid us in the 12 months preceding the event
            giving rise to the claim, or $100, whichever is greater.
          </p>

          <h2 className="text-2xl">11. Indemnification</h2>
          <p>
            You agree to indemnify, defend, and hold harmless TrueCap from any claim, loss,
            liability, or expense (including reasonable attorneys&apos; fees) arising from your
            use of the Service, your breach of these Terms, or your violation of any law or
            third-party right.
          </p>

          <h2 className="text-2xl">12. Termination</h2>
          <p>
            You can stop using the Service and delete your account anytime. We may suspend or
            terminate your access if you violate these Terms or use the Service in a way that
            harms us, other users, or third parties. On termination, your right to use the
            Service ends; sections that by their nature survive termination (payment, IP,
            liability) continue to apply.
          </p>

          <h2 className="text-2xl">13. Changes to these Terms</h2>
          <p>
            We may update these Terms. Material changes will be announced in-product or by email
            at least 14 days before they take effect. Continued use of the Service after a
            change takes effect constitutes acceptance.
          </p>

          <h2 className="text-2xl">14. Governing law &amp; disputes</h2>
          <p>
            These Terms are governed by the laws of the Commonwealth of Pennsylvania, without
            regard to its conflict-of-laws rules. Any dispute arising out of or relating to the
            Service or these Terms will be resolved in the state or federal courts located in
            Philadelphia County, Pennsylvania, and you and we consent to the personal
            jurisdiction of those courts.
          </p>

          <h2 className="text-2xl">15. Contact</h2>
          <p>
            Questions about these Terms? Email{" "}
            <a href="mailto:hello@usetruecap.com" className="font-medium text-primary hover:underline">
              hello@usetruecap.com
            </a>
            .
          </p>
        </article>

        <footer className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
          <Link href="/privacy" className="font-medium text-foreground hover:underline">
            Privacy Policy
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
