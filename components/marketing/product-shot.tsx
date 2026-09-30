import Image from "next/image";
import { PRODUCT_SHOTS, type ProductShotEntry } from "@/lib/product-shots.generated";

/** Shot ids the pipeline produces (see scripts/capture-screenshots.ts). */
export const DECISION_SHOT = "verdict";
export const RENT_BREAKDOWN_SHOT = "where-the-rent-goes";
export const MEMO_SHOT = "memo";

/**
 * A REAL product screenshot from scripts/capture-screenshots.ts. Renders
 * nothing when the shot has not been captured: never a placeholder, never a
 * mock.
 *
 * Frames (DESIGN.md "Chrome": no shadow at rest, radius by role):
 *   - "browser" (default, `true`): a quiet chrome bar over the screen, for
 *     app screens. A 1px rule and the 6px object radius.
 *   - "document": a printed page, for the memo. A 1px rule, no radius, no
 *     browser chrome, cropped to a page's proportion from the top.
 *   - `false`: the image alone.
 */
export function findProductShot(
  shot: string,
  viewport: ProductShotEntry["viewport"] = "desktop",
): ProductShotEntry | null {
  return PRODUCT_SHOTS.find((s) => s.shot === shot && s.viewport === viewport) ?? null;
}

export function ProductShot({
  shot,
  viewport = "desktop",
  alt,
  priority = false,
  sizes = "(min-width: 1024px) 560px, 100vw",
  className = "",
  frame = true,
  caption,
}: {
  shot: string;
  viewport?: ProductShotEntry["viewport"];
  alt: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
  frame?: boolean | "browser" | "document";
  caption?: React.ReactNode;
}) {
  const entry = findProductShot(shot, viewport);
  if (!entry) return null;
  // Screenshots are 2× device pixels; the frame lays out at CSS pixels.
  const width = Math.round(entry.width / 2);
  const height = Math.round(entry.height / 2);
  const image = (
    <Image
      src={entry.webp}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      sizes={sizes}
      className="h-auto w-full"
    />
  );
  if (!frame) return <div className={className}>{image}</div>;
  const captionNode = caption ? (
    <figcaption className="mt-2.5 text-sm text-muted-foreground">{caption}</figcaption>
  ) : null;
  if (frame === "document") {
    return (
      <figure className={`min-w-0 ${className}`.trim()}>
        <div className="aspect-[4/5] overflow-hidden border border-border bg-card">{image}</div>
        {captionNode}
      </figure>
    );
  }
  return (
    <figure className={`min-w-0 ${className}`.trim()}>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div aria-hidden className="flex items-center gap-1.5 border-b border-border bg-band px-3 py-2">
          <span className="size-2 rounded-full bg-rule-soft" />
          <span className="size-2 rounded-full bg-rule-soft" />
          <span className="size-2 rounded-full bg-rule-soft" />
        </div>
        {image}
      </div>
      {captionNode}
    </figure>
  );
}
