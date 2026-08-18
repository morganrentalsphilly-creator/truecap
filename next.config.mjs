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
  // Explicit trailing-slash policy. Next.js's default is false (no
  // trailing slash), but stating it documents the intent and prevents a
  // future contributor from flipping it to `true` — which would change
  // every canonical URL on the site and trigger massive recrawls. All
  // our canonicals are no-trailing-slash; keep them that way.
  trailingSlash: false,
  images: {
    // Vercel's image optimization pipeline serves AVIF + WebP with
    // responsive srcsets per device width. Enabled because the LCP /
    // mobile bandwidth win outweighs the per-transform cost at our
    // volume. The transform-count quota on the free tier is 1000/mo;
    // we're well under that. If we ever blow through it, set
    // `unoptimized: true` again as the emergency escape hatch.
    //
    // AVIF first because it's ~30% smaller than WebP at equivalent
    // quality; Next.js falls back to WebP for browsers that don't
    // support AVIF.
    formats: ["image/avif", "image/webp"],
    // Match next/image device-width breakpoints to our Tailwind
    // breakpoints so we don't generate sizes we'll never serve.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
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
      // Guessable aliases for real destinations. Nothing in the app links
      // to these — they 404'd for anyone who typed the obvious URL. The
      // label/slug divergence is what makes /dashboard/screen guessable:
      // the nav says "Screen a shortlist", the route is /dashboard/triage.
      //
      // /analyze intentionally lands on "/" rather than a specific
      // analyzer: proxy.ts already rewrites "/" to the authed home for
      // signed-in users, so one target serves both audiences. (next.config
      // redirects cannot read cookies, so an auth-dependent destination
      // would have to be a page-level redirect instead.)
      { source: "/analyze", destination: "/", permanent: false },
      { source: "/deals", destination: "/dashboard/saved-analyses", permanent: false },
      { source: "/dashboard/screen", destination: "/dashboard/triage", permanent: false },
    ];
  },

  // Security headers applied to every response. These are the conservative
  // set — they don't break any third-party integrations (gtag, Sentry tunnel,
  // PostHog, Stripe, Google Maps Places) because they don't enforce CSP.
  // Adding CSP would require careful nonce handling for the inline scripts in
  // app/layout.tsx — defer until you have time to test thoroughly.
  async headers() {
    return [
      // /embed/* widgets are DESIGNED to be embedded in third-party iframes
      // (postMessage auto-resize). The site-wide X-Frame-Options: SAMEORIGIN
      // below would make them render BLANK on every partner site — a broken
      // distribution channel. Give the embed routes their own header set:
      // keep nosniff / HSTS / Referrer / Permissions, but allow framing via
      // CSP `frame-ancestors *` instead of XFO. These pages are public, with
      // no auth flow or state-changing action, so framing them is safe by
      // design. The catch-all source below uses a negative lookahead to skip
      // /embed/* so it doesn't re-add XFO on top of this. `:path+` (one-or-more
      // segments) targets the embeddable widgets only, not the bare /embed
      // index, which keeps the strict catch-all headers.
      {
        source: "/embed/:path+",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
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
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
      },
      {
        // Catch-all EXCEPT /embed/* (negative lookahead) — the embed widgets
        // get their framing-friendly header set above instead.
        source: "/((?!embed/).*)",
        headers: [
          // Clickjacking protection — refuse to be loaded in an iframe.
          // SAMEORIGIN allows our own iframes while blocking third-party
          // embedding. Critical because the auth flow accepts credentials.
          // (Embeddable widgets under /embed/* are exempted above.)
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
      // Long-cache Cache-Control for static-ish marketing pages. These
      // routes are statically generated at build time and change only
      // when content is updated + redeployed, so we let Vercel's edge
      // CDN hold them for a day before re-validating. SWR of 7 days
      // means a stale page is still served instantly while the next
      // request triggers a background re-fetch — visitors never see a
      // cache miss.
      //
      // Skipped: dynamic routes (/, /pricing — Stripe + auth context),
      // /tools/* (already revalidates per the embed widget data
      // patterns), /d/* (per-deal share links), /dashboard/* + /auth/*
      // (private user state).
      {
        source: "/blog/:slug*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/vs/:slug*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/markets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/states/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/glossary/:slug*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=86400, stale-while-revalidate=604800",
          },
        ],
      },
      // Encoded analyses and bearer-token routes must not propagate their
      // full path even to same-origin telemetry endpoints. These entries come
      // after the general/embed policies so their stricter value wins.
      {
        source: "/d/:path+",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
      {
        // Opaque share viewer: token-only URLs, but the page RESOLVES to deal
        // data — same no-referrer as /d/, plus header-level robots and
        // no-store (a revoked share must die immediately, not live in a CDN).
        source: "/s/:path+",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
      {
        source: "/portal/:path+",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
      {
        source: "/embed/brand/:path+",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
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

  // Sentry's own build-plugin telemetry (a network call to sentry.io that
  // only engages in CI-like environments). 2026-07-14: every GitHub CI
  // build died SILENTLY (~5s in, exit 1, zero output) with this telemetry
  // announcement as the last line — on trees that built fine locally and
  // had passed CI hours earlier. Local builds never even engage the
  // telemetry path. Opting out costs nothing (it's Sentry's usage stats,
  // not our error reporting) and removes the only network-dependent step
  // between compile start and the crash point.
  telemetry: false,

  // Sentry auth token controls source-map upload at build time. Without
  // an auth token, the upload step throws "No auth token provided"
  // warnings on every build. In newer @sentry/nextjs versions Vercel
  // can treat that as a hard build failure during `onBuildComplete`.
  // Explicitly skip the upload step when the token isn't set so the
  // build cleanly succeeds either way:
  //   - locally / preview: no SENTRY_AUTH_TOKEN, sourceMaps skipped, no warnings
  //   - production: set SENTRY_AUTH_TOKEN in Vercel env vars → sourceMaps upload, prettier stack traces in Sentry
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  // Suppress the release-creation step too when there's no token —
  // creating a release without an auth token also produces the
  // "Will not create release" warning that some Vercel versions
  // surface as a build failure.
  release: {
    create: Boolean(process.env.SENTRY_AUTH_TOKEN),
  },

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
