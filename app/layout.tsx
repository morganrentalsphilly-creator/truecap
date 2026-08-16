import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, DM_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/toaster'
import { CookieConsentBanner } from '@/components/marketing/cookie-consent-banner'
import { AnnualPromoBanner } from '@/components/marketing/annual-promo-banner'
import { PostHogProvider } from '@/components/analytics/posthog-provider'
import { GoogleMeasurement } from '@/components/analytics/google-measurement'
import { TrueCapVercelAnalytics } from '@/components/analytics/vercel-analytics'
import { OverlayRecovery } from '@/components/ui/overlay-recovery'
import { getSiteUrl } from '@/lib/site-url'
import { oneTimePdfReturnBootstrapScript } from '@/lib/one-time-pdf-return'
import { analyzerHandoffBootstrapScript } from '@/lib/analyzer-handoff'
import { subscriptionCheckoutReturnBootstrapScript } from '@/lib/subscription-checkout-return'
import './globals.css'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans-variable",
  // Plus Jakarta Sans tops out at weight 800. Any `font-extrabold` (900)
  // usage gets faux-bolded by the browser, which causes a visible
  // restitch on LCP. We've migrated those to `font-extrabold` (800)
  // to match the font's real max weight. Don't add "900" here — it's
  // not a valid weight for this font and TypeScript will reject it.
  weight: ["300", "400", "500", "600", "700", "800"],
  // Explicit display: "swap" — text renders immediately with the system
  // fallback (set by adjustFontFallback's font-metric matching), then
  // swaps to Plus Jakarta when it arrives. Prevents FOIT (Flash of
  // Invisible Text) which kills LCP on slow connections.
  display: "swap",
  // Generate the system-font-metric fallback so the layout doesn't shift
  // when the real font loads (cumulative layout shift / CLS).
  adjustFontFallback: true,
  // next/font auto-injects <link rel="preload"> for fonts declared at
  // this scope. Explicit `preload: true` documents the intent.
  preload: true,
});
const dmMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-mono-variable",
  weight: ["400", "500"],
  // Mono is non-critical (used for numeric output in tables/cards, never
  // for above-the-fold hero text). Skip the preload to save a request
  // on first paint — it loads on-demand when text using `font-mono`
  // first renders.
  display: "swap",
  preload: false,
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  // Allow pinch-zoom up to 5x. WCAG 2.1 Success Criterion 1.4.4
  // (Resize text) requires that text can be resized up to 200% without
  // loss of content/functionality. Blocking user-scaling with
  // maximumScale: 1 + userScalable: false fails that criterion and gets
  // flagged by Lighthouse a11y. 5x is the platform-recommended ceiling.
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#0070c4",
};

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "TrueCap | Rental Deal Decision Engine",
    template: "%s | TrueCap",
  },
  description:
    "Screen rental properties, test them against your investment criteria, stress the downside, and calculate the price that makes the deal work.",
  keywords: [
    "real estate investment calculator",
    "rental property calculator",
    "cash flow analysis",
    "cap rate calculator",
    "cash on cash return",
    "real estate ROI",
    "investment property analysis",
    "deal analysis tool",
    "rental property underwriting",
    "real estate projections",
  ],
  applicationName: "TrueCap",
  // RSS feed discovery — Feedly, Inoreader, NetNewsWire, and most
  // browsers' "subscribe" feature use this <link rel="alternate"> to
  // auto-discover the feed. Also enables Zapier/n8n RSS triggers to
  // pick up new posts without manual URL configuration.
  alternates: {
    canonical: siteUrl,
    types: {
      "application/rss+xml": `${siteUrl}/feed.xml`,
    },
  },
  openGraph: {
    type: "website",
    title: "TrueCap | Rental Deal Decision Engine",
    description:
      "Know whether a rental fits your strategy and the highest price you can offer before the numbers stop working.",
    siteName: "TrueCap",
    locale: "en_US",
    url: siteUrl,
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap — real estate investment analyzer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TrueCap | Rental Deal Decision Engine",
    description:
      "Know whether a rental fits your strategy and the highest price you can offer before the numbers stop working.",
    images: ["/home.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: "/favicon.ico",
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${dmMono.variable} font-sans`}>
      <head>
        {/* Runs before every analytics/error-reporting script. It removes the
            new non-secret PDF claim id — and destroys any legacy reusable
            Checkout Session id — before a pageview or referrer can capture
            either value. The claim binding secret never enters the URL. */}
        <script
          id="one-time-pdf-return-bootstrap"
          dangerouslySetInnerHTML={{ __html: oneTimePdfReturnBootstrapScript() }}
        />
        {/* Calculator/batch handoffs can arrive with a property address and
            underwriting inputs. Capture them for this tab and remove them
            from history/referrers before any measurement script executes. */}
        <script
          id="analyzer-handoff-bootstrap"
          dangerouslySetInnerHTML={{ __html: analyzerHandoffBootstrapScript() }}
        />
        {/* Stripe subscription returns include a Checkout Session id. The
            server may use it while rendering, then this head bootstrap moves
            it to same-tab memory before Google or any pageview can read it. */}
        <script
          id="subscription-checkout-return-bootstrap"
          dangerouslySetInnerHTML={{ __html: subscriptionCheckoutReturnBootstrapScript() }}
        />
        {process.env.NODE_ENV === 'production' && (
          <>
          {/* Preconnect to the slowest third-party we load — saves
              ~80-200ms on first paint by warming DNS + TLS to gtag's
              CDN before the actual <script src> evaluation starts.
              Materially improves LCP, which is a direct Google
              Quality Score input for paid traffic. */}
          <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="" />
          <link rel="dns-prefetch" href="https://www.google-analytics.com" />
          {/* Google Places address autocomplete uses maps.googleapis.com
              — preconnect saves ~50-150ms when the user reaches the
              address field, which is on the calculator's first paint. */}
          <link rel="preconnect" href="https://maps.googleapis.com" crossOrigin="" />
          <link rel="dns-prefetch" href="https://maps.gstatic.com" />
          </>
        )}
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        {/* Google measurement self-suppresses on encoded/bearer share routes
            before any third-party script is loaded. */}
        <GoogleMeasurement />
        {/* Site-wide structured data — Organization + WebSite. Many child
            pages (especially /vs/* and blog posts) reference the
            Organization by @id (publisher.@id = `${siteUrl}/#organization`).
            Without this block defining the entity, those references were
            dangling — Google's Rich Results Test would flag them. The
            WebSite schema also wires the /search SearchAction so Google
            can render a sitelinks search box on brand SERPs. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": `${siteUrl}/#organization`,
                  name: "TrueCap",
                  url: siteUrl,
                  logo: `${siteUrl}/icon-512x512.png`,
                  description:
                    "Rental acquisition decision engine — screen a property, review the assumptions, stress-test the downside, and solve the price that meets an investor's targets.",
                  sameAs: [],
                  // Person entity is defined on /about (AboutPage +
                  // Person @graph) — referencing it here ties the org
                  // to a real, findable founder for E-E-A-T.
                  founder: { "@id": `${siteUrl}/about#morgan` },
                  // Moved here from the homepage's (now removed)
                  // duplicate Organization node so the single canonical
                  // entity keeps the support-contact signal.
                  contactPoint: {
                    "@type": "ContactPoint",
                    contactType: "customer support",
                    email: "hello@usetruecap.com",
                    availableLanguage: "English",
                  },
                },
                {
                  "@type": "WebSite",
                  "@id": `${siteUrl}/#website`,
                  url: siteUrl,
                  name: "TrueCap",
                  publisher: { "@id": `${siteUrl}/#organization` },
                  potentialAction: {
                    "@type": "SearchAction",
                    target: {
                      "@type": "EntryPoint",
                      urlTemplate: `${siteUrl}/search?q={search_term_string}`,
                    },
                    "query-input": "required name=search_term_string",
                  },
                },
              ],
            }),
          }}
        />
        {/* Skip-to-content link — invisible until focused, then jumps
            keyboard / screen-reader users straight to <main> so they
            don't have to tab through the nav on every page. Standard
            a11y pattern; works as long as page content lives in <main
            id="main"> (which our pages already do). */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          Skip to main content
        </a>
        {/* Annual plan promo banner — thin, dismissible, hidden on
            /pricing and /auth/*. Sits ABOVE all page content so it
            doesn't reshuffle individual pages' layouts. */}
        <AnnualPromoBanner />
        {/* PostHog provider — initializes posthog-js with cookie-consent
            respect, identifies authenticated Supabase users, and fires
            $pageview on App Router transitions. The wizard set up env
            vars + MCP server but didn't ship a provider, so this is the
            actual init call that makes all client-side trackEvent() in
            lib/analytics.ts work. */}
        <PostHogProvider />
        {/* Self-heals a stranded Radix body lock (pointer-events:none /
            scroll-lock left behind when a modal overlay unmounts during a
            route change) — the "page scrolls but nothing is clickable"
            freeze. No-op unless a lock is actually stranded. */}
        <OverlayRecovery />
        {children}
        <Toaster />
        {/* Cookie consent banner — pairs with the Consent Mode v2
            defaults declared in <head>. Shows once on first visit, then
            persists the choice to localStorage. Mounted at the bottom
            of <body> so it overlays everything but doesn't intercept
            React hydration ordering. */}
        <CookieConsentBanner />
        {/* Vercel Analytics — handles production-only logic internally,
            so we don't gate on NODE_ENV. The earlier gate was preventing
            events from being sent on Vercel deploys where NODE_ENV
            wasn't being read as expected. */}
        <TrueCapVercelAnalytics />
      </body>
    </html>
  )
}
