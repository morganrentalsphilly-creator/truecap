import { withSentryConfig } from '@sentry/nextjs';
/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Block production deploys on TypeScript errors. Previously `true`,
    // which meant a future React 19 / Next 16 API change could silently
    // ship a runtime crash. Flipped back to false so type errors fail
    // the Vercel build instead of the user's session.
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    // Next.js 16+ tree-shaking hint. Rewrites barrel-style imports of
    // listed packages into per-symbol deep paths automatically, so a
    // `import { Icon1, Icon2 } from "lucide-react"` ships only those
    // two icons even if a future contributor accidentally writes a
    // wider import. Defensive — current code already uses named
    // imports, but this prevents regressions without code review work.
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "@radix-ui/react-icons",
    ],
  },
  // Permanent redirects for known-broken historical URLs.
  // Add new entries here when 404 instrumentation surfaces real
  // traffic hitting a malformed URL.
  async redirects() {
    return [
      // Discovered via Sentry/analytics: a malformed external link
      // (likely a tracker that truncated a base64 fragment) was
      // pointing 48+ people/day at /tools/Y2FwLXJhdG. The slug
      // decodes to 'cap-rat' (missing the final 'U' that would have
      // made it 'cap-rate'). Redirect to the actual cap rate
      // calculator so existing traffic + bookmarks + Google index
      // entries land on a real page.
      {
        source: "/tools/Y2FwLXJhdG",
        destination: "/tools/cap-rate-calculator",
        permanent: true,
      },
    ];
  },

  // Security headers applied to every response. These are the conservative
  // set — they don't break any third-party integrations (gtag, Sentry tunnel,
  // PostHog, Stripe, Google Maps Places) because they don't enforce CSP.
  // Adding CSP would require careful nonce handling for the inline scripts in
  // app/layout.tsx — defer until you have time to test thoroughly.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Clickjacking protection — refuse to be loaded in an iframe.
          // SAMEORIGIN allows our own iframes (none currently) while
          // blocking third-party embedding. Critical because the auth
          // flow accepts credentials.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // MIME-sniffing protection. Without this, an attacker who could
          // upload a "PDF" that's actually HTML could get it served with
          // text/html — XSS. The branding-logos bucket accepts user
          // uploads, so this is a real concern.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Force HTTPS for 2 years across the apex domain + subdomains.
          // includeSubDomains is important so a misconfigured subdomain
          // can't be used to set a cookie that escapes back to the apex.
          // preload signals our intent to be preloaded into browser HSTS
          // lists (you can submit at hstspreload.org once this is live).
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Disable unused powerful APIs by default. Specifically disables
          // camera, microphone, geolocation, payment (we use Stripe-hosted
          // checkout, not Payment Request API), and FLoC/Topics. If you
          // ever add a feature that needs one of these, allow it inline.
          {
            key: "Permissions-Policy",
            value: [
              "camera=()",
              "microphone=()",
              "geolocation=()",
              "payment=()",
              "interest-cohort=()",
              "browsing-topics=()",
            ].join(", "),
          },
          // Referrer-Policy — send the origin only on cross-origin requests
          // so we don't leak deep URLs (with query params like analysis
          // IDs) to third-party trackers. strict-origin-when-cross-origin
          // is the safest default that doesn't break analytics.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
}

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "truecap",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  // Webpack-plugin-scoped Sentry options. @sentry/nextjs 10.x moved
  // these into a nested `webpack: {...}` block; the previous top-level
  // placement now emits a deprecation warning on every build. The
  // behavior is identical, only the location of the keys changed in
  // the SDK's typings.
  webpack: {
    // Auto-instrument Vercel Cron Monitors so a failed weekly newsletter
    // send shows up as a Sentry alert without needing manual capture.
    automaticVercelMonitors: true,
    // Disable React Server Component / component-tree annotation. It
    // adds DevTools-friendly metadata but ships extra bytes we don't
    // need in production.
    reactComponentAnnotation: {
      enabled: false,
    },
  },
});
