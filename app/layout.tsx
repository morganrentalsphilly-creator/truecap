import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, DM_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/toaster'
import { CookieConsentBanner } from '@/components/marketing/cookie-consent-banner'
import { AnnualPromoBanner } from '@/components/marketing/annual-promo-banner'
import { getSiteUrl } from '@/lib/site-url'
import './globals.css'

const GOOGLE_ADS_ID = 'AW-18159235338'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans-variable",
  // Plus Jakarta Sans tops out at weight 800. Any `font-extrabold` (900)
  // usage gets faux-bolded by the browser, which causes a visible
  // restitch on LCP. We've migrated those to `font-extrabold` (800)
  // to match the font's real max weight. Don't add "900" here — it's
  // not a valid weight for this font and TypeScript will reject it.
  weight: ["300", "400", "500", "600", "700", "800"],
});
const dmMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-mono-variable",
  weight: ["400", "500"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#5248d4",
};

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "TrueCap | Real Estate Investment Calculator",
    template: "%s | TrueCap",
  },
  description:
    "Analyze rental properties with cash flow projections, ROI insights, tax strategy support, and risk-aware real estate metrics.",
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
    title: "TrueCap | Real Estate Investment Calculator",
    description:
      "Analyze rental properties with cash flow projections, ROI insights, tax strategy support, and risk-aware real estate metrics.",
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
    title: "TrueCap | Real Estate Investment Calculator",
    description:
      "Analyze rental properties with cash flow projections, ROI insights, tax strategy support, and risk-aware real estate metrics.",
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
      {process.env.NODE_ENV === 'production' && (
        <head>
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
          {/* Google Consent Mode v2 defaults — MUST run before gtag.js
              loads, so the bidding/measurement pixels boot in a privacy-
              safe state (no tracking cookies set until user consents).
              The CookieConsentBanner client component calls
              gtag('consent', 'update', ...) once the user makes a choice.
              Wait_for_update gives Google 500ms to receive the update
              before sending the first pageview, so an immediate Accept
              click doesn't lose attribution. */}
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  ad_storage: 'denied',
  analytics_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  wait_for_update: 500
});`,
            }}
          />
          {/* Google Ads gtag — emitted as raw script tags so it shows up
              in the server-rendered HTML for Google's tag verifier. */}
          <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `gtag('js', new Date());
gtag('config', '${GOOGLE_ADS_ID}');`,
            }}
          />
        </head>
      )}
      <body className="font-sans antialiased bg-background text-foreground">
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
        <Analytics />
      </body>
    </html>
  )
}
