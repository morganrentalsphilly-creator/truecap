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
 * Frames (DESIGN.md "Chrome": no shadow at rest, radius by role; the Avoid
 * list bans "a screenshot inside a fake browser frame"):
 *   - "document" (the default): the shot as a printed page. A 1px rule, no
 *     radius, no chrome, at the capture's own proportion, in a <figure> so a
 *     caption stays attached.
 *   - `false`: the image alone, with no rule and no caption.
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
  frame = "document",
  caption,
}: {
  shot: string;
  viewport?: ProductShotEntry["viewport"];
  alt: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
  frame?: "document" | false;
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
  return (
    <figure className={`min-w-0 ${className}`.trim()}>
      <div className="overflow-hidden border border-border bg-card">{image}</div>
      {caption ? (
        <figcaption className="mt-2.5 text-sm text-muted-foreground">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
