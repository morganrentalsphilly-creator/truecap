import Image from "next/image";

import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";

/**
 * The picture under "What your client receives" (the homepage and
 * /for-agents): page 1 of the real PDF report.
 *
 * public/product/pdf-cover.webp is written by
 * scripts/render-pdf-cover-shot.ts. It renders the report for the sample deal
 * (lib/sample-deal.ts) through lib/pdf-generator.ts, the generator behind
 * Export PDF, with no branding and no person named, and rasterises page 1.
 * Nothing is drawn or retouched, so the caption may call it the PDF's cover.
 * It is not a co-branded cover: say what branding changes in words (the
 * cover's logo or company wordmark, theme color and "Prepared by" block, all
 * in pageCover) and never caption it as an agent's report.
 *
 * One component for both pages, so the picture, its alt text and its caption
 * cannot drift apart. Shown as a document (DESIGN.md "Chrome"): a 1px rule,
 * no radius, no shadow, no browser frame, the page's own proportion.
 */
export const PDF_COVER_SHOT = {
  src: "/product/pdf-cover.webp",
  // The file is 1240 x 1754 (an A4 page at twice the layout width).
  width: 620,
  height: 877,
} as const;

export function ClientPdfCover({
  sizes = "(min-width: 1024px) 480px, 100vw",
  className = "",
}: {
  sizes?: string;
  className?: string;
}) {
  return (
    <figure className={`min-w-0 ${className}`.trim()}>
      <div className="overflow-hidden border border-border bg-card">
        <Image
          src={PDF_COVER_SHOT.src}
          alt="Cover page of a TrueCap PDF report for the sample deal: the property, the underwriting result at asking with the targets it was screened against, monthly cash flow, cap rate, cash-on-cash and the Offer Ceiling, the deal terms, and a Prepared by block"
          width={PDF_COVER_SHOT.width}
          height={PDF_COVER_SHOT.height}
          sizes={sizes}
          className="h-auto w-full"
        />
      </div>
      <figcaption className="mt-2.5 text-sm text-muted-foreground">
        The cover of the PDF report, rendered from the sample deal with no branding set. With
        branding set up, the cover carries your logo or company name and your brand color in
        place of TrueCap&apos;s, and the Prepared by block shows your contact details.{" "}
        <IntentPrefetchLink
          href="/sample-decision-memo"
          className="tc-link -my-3 inline-block py-3 font-medium"
        >
          Read the sample decision memo
        </IntentPrefetchLink>
      </figcaption>
    </figure>
  );
}
