/**
 * The link-preview image of every share link (/s/[token] and the legacy
 * /d/[encoded]): the one deal-free card GET /og/share draws
 * (app/og/share/route.tsx). Both share pages name it in their metadata, so a
 * preview never differs from link to link and never carries deal data.
 *
 * The alt text is fixed for the same reason the card is: it must not describe
 * the deal, the property or the sender.
 */
export const SHARE_CARD_IMAGE = {
  url: "/og/share",
  width: 1200,
  height: 630,
  alt: "A rental analysis shared via TrueCap. Property details are not shown in previews.",
} as const;
