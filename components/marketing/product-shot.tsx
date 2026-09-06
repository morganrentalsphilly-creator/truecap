import Image from "next/image";
import { PRODUCT_SHOTS, type ProductShotEntry } from "@/lib/product-shots.generated";

/** Shot ids the pipeline produces (see scripts/capture-screenshots.ts). */
export const DECISION_SHOT = "verdict";
export const RENT_BREAKDOWN_SHOT = "where-the-rent-goes";
export const MEMO_SHOT = "memo";

/**
 * A REAL product screenshot from scripts/capture-screenshots.ts, wrapped in a
 * quiet browser-chrome frame. Renders nothing when the shot has not been
 * captured — never a placeholder, never a mock.
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
  frame?: boolean;
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
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
        <div aria-hidden className="flex items-center gap-1.5 border-b border-border bg-muted/60 px-3 py-2">
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="ml-2 h-4 flex-1 rounded-md bg-background/80" />
        </div>
        {image}
      </div>
      {caption ? (
        <figcaption className="mt-2 text-xs text-muted-foreground">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
