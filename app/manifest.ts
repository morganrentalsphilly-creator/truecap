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
      "Analyze rental properties with cash flow projections, ROI insights, tax strategy support, and risk-aware real estate metrics.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#2563EB",
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
      {
        src: "/Logo-png.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };
}
