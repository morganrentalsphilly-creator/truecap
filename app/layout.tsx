import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, DM_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/toaster'
import { getSiteUrl } from '@/lib/site-url'
import './globals.css'

const GOOGLE_ADS_ID = 'AW-18159235338'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans-variable",
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
  openGraph: {
    type: "website",
    title: "TrueCap | Real Estate Investment Calculator",
    description:
      "Analyze rental properties with cash flow projections, ROI insights, tax strategy support, and risk-aware real estate metrics.",
    siteName: "TrueCap",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "TrueCap | Real Estate Investment Calculator",
    description:
      "Analyze rental properties with cash flow projections, ROI insights, tax strategy support, and risk-aware real estate metrics.",
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
          {/* Google Ads gtag — emitted as raw script tags so it shows up
              in the server-rendered HTML for Google's tag verifier. */}
          <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GOOGLE_ADS_ID}');`,
            }}
          />
        </head>
      )}
      <body className="font-sans antialiased bg-background text-foreground">
        {children}
        <Toaster />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
