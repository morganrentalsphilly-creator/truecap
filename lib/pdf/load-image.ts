/**
 * Image loading for the investment PDF — works in Node and in the browser.
 *
 * REPLACES the old canvas round-trip (fetch → FileReader → new Image() →
 * <canvas> → toDataURL). That existed only to learn the image's intrinsic
 * dimensions, and it welded PDF generation to a DOM. jsPDF accepts a base64
 * data URL directly, and PNG/JPEG both carry their dimensions in a header we
 * can read in a few bytes — so the canvas was never load-bearing.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * SECURITY: this module is why the logo fetch is allowlisted.
 *
 * `branding.logo_url` is USER-SUPPLIED. lib/branding-values.ts validates only
 * that it parses as an http(s) URL of at most 2048 chars — it does not
 * constrain the host. While the PDF was built in the browser that was fine:
 * the user's own browser fetched a URL the user chose.
 *
 * Building the PDF on the server changes who makes that request. An
 * unrestricted server-side fetch of a user-controlled URL is a textbook SSRF:
 * a Pro user could set their logo to http://169.254.169.254/… (cloud instance
 * metadata) or a localhost admin port and have our infrastructure fetch it
 * from inside the network perimeter.
 *
 * So we do not fetch arbitrary hosts. Logos uploaded through the product land
 * in our own public `branding-logos` Supabase bucket (app/actions/branding.ts),
 * and that plus our own site origin is the entire allowlist. A logo_url
 * pointing anywhere else is refused and the caller falls back to the text
 * wordmark it already renders when there is no logo.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type PdfImage = {
  /** base64 data URL, ready for jsPDF.addImage. */
  dataUrl: string;
  /** Intrinsic pixel dimensions, for aspect-correct placement. */
  width: number;
  height: number;
  format: "PNG" | "JPEG";
};

/** Logos are capped at 1MB on upload; refuse anything wildly larger. */
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 5000;

// ── Dimension parsing ───────────────────────────────────────────────────────

/**
 * PNG: an 8-byte signature, then the IHDR chunk whose width/height are two
 * big-endian uint32s at offsets 16 and 20.
 */
function readPngSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24) return null;
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!sig.every((b, i) => bytes[i] === b)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/**
 * JPEG: walk the marker segments to the start-of-frame (SOFn), which carries
 * height then width as big-endian uint16s. SOF0/1/2/3/5/6/7/9/10/11/13/14/15
 * are frame markers; C4/C8/CC are not.
 */
function readJpegSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1; // resync past padding
      continue;
    }
    const marker = bytes[offset + 1]!;
    const length = view.getUint16(offset + 2);
    const isFrame =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrame) {
      return { width: view.getUint16(offset + 7), height: view.getUint16(offset + 5) };
    }
    if (length < 2) return null;
    offset += 2 + length;
  }
  return null;
}

function describe(bytes: Uint8Array): { width: number; height: number; format: "PNG" | "JPEG" } | null {
  const png = readPngSize(bytes);
  if (png) return { ...png, format: "PNG" };
  const jpeg = readJpegSize(bytes);
  if (jpeg) return { ...jpeg, format: "JPEG" };
  return null;
}

function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

// ── Allowlist ───────────────────────────────────────────────────────────────

function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * Hosts this process may fetch an image from.
 *
 * Deliberately computed per call rather than module-hoisted: env vars are
 * present at request time on the server, and a stale empty allowlist would
 * silently disable every logo.
 */
function allowedOrigins(): string[] {
  return [
    originOf(process.env.NEXT_PUBLIC_SUPABASE_URL),
    originOf(process.env.NEXT_PUBLIC_SITE_URL),
    originOf(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined),
  ].filter((o): o is string => o !== null);
}

/**
 * True when `rawUrl` is a logo we are willing to fetch server-side.
 *
 * Requires https, an allowlisted origin, and — for Supabase — the public
 * object path of the `branding-logos` bucket specifically, so a signed URL to
 * some other bucket cannot be smuggled through.
 */
export function isAllowedLogoUrl(rawUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (!allowedOrigins().includes(url.origin)) return false;

  const supabaseOrigin = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (url.origin === supabaseOrigin) {
    return url.pathname.startsWith("/storage/v1/object/public/branding-logos/");
  }
  return true;
}

// ── Loading ─────────────────────────────────────────────────────────────────

async function readBytes(source: string): Promise<Uint8Array | null> {
  // Server: read bundled assets straight off disk. Avoids a network hop for
  // our own logo and works even if the site origin is unreachable from inside
  // the function (which it is, on some platforms, during a cold start).
  const isServer = typeof window === "undefined";
  if (isServer && source.startsWith("/") && !source.startsWith("//")) {
    try {
      const { readFile } = await import("node:fs/promises");
      const { join, normalize } = await import("node:path");
      // normalize + prefix check keeps a "../" in `source` inside public/.
      const publicDir = join(process.cwd(), "public");
      const target = normalize(join(publicDir, source));
      if (!target.startsWith(publicDir)) return null;
      const buf = await readFile(target);
      return new Uint8Array(buf);
    } catch {
      return null;
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(source, {
      signal: controller.signal,
      // Never let a permitted host 302 us onto an internal address.
      redirect: isServer ? "error" : "follow",
    });
    if (!response.ok) return null;
    const declared = Number(response.headers.get("content-length") ?? "0");
    if (declared > MAX_IMAGE_BYTES) return null;
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_IMAGE_BYTES) return null;
    return new Uint8Array(buffer);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Load an image for embedding. Returns null on ANY failure — a missing logo
 * must never fail a report the user paid for.
 *
 * `source` is either a site-relative path we control (e.g. "/Logo-png-w.png")
 * or an absolute URL, which is allowlist-checked before any request is made.
 */
export async function loadPdfImage(source: string): Promise<PdfImage | null> {
  if (!source) return null;
  const isAbsolute = /^https?:\/\//i.test(source);
  if (isAbsolute && !isAllowedLogoUrl(source)) return null;

  const bytes = await readBytes(source);
  if (!bytes || bytes.length === 0) return null;

  // Trust the CONTENT, not the extension or the declared content-type: if the
  // bytes are not a PNG or JPEG we cannot embed them and jsPDF would throw.
  const meta = describe(bytes);
  if (!meta || meta.width < 1 || meta.height < 1) return null;

  const mime = meta.format === "PNG" ? "image/png" : "image/jpeg";
  return {
    dataUrl: `data:${mime};base64,${toBase64(bytes)}`,
    width: meta.width,
    height: meta.height,
    format: meta.format,
  };
}
