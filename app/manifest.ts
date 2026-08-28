import type { MetadataRoute } from "next";

/**
 * PWA manifest — lets users "Add to Home Screen" on iOS / Android and
 * launch TrueCap as a standalone app (no browser chrome, splash screen
 * with the brand color, etc).
 *
 * Next 13+ picks this file up automatically and serves it at
 * `/manifest.webmanifest`. The metadata in app/layout.tsx already
 * declares the favicon + apple-icon, so we only need the install /
 * standalone hints here.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TrueCap — Real Estate Investment Calculator",
    short_name: "TrueCap",
    description:
      "Analyze rental properties with cash flow, cap rate, cash-on-cash return, DSCR, projections, and risk-aware screening metrics.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#0070c4",
    orientation: "portrait",
    categories: ["finance", "productivity", "business"],
    icons: [
      {
        src: "/icon-light-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
      // Properly-sized PWA icons. Previously these all pointed at
      // /Logo-png.png — a 1.3MB source file served as both the 192×192
      // and 512×512 slot, which downloaded ~1.3MB to every device that
      // installed the PWA. Now we have purpose-built optimized PNG
      // files: 4.5KB for 192, 19.2KB for 512. ~50× reduction.
      //
      // Split into separate purpose entries — Next.js'
      // MetadataRoute.Manifest type expects a single value per icon,
      // not the W3C space-separated form. Browsers treat repeated src
      // entries with different purposes as alternates.
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
