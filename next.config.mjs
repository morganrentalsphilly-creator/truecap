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
