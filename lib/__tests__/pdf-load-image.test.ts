import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isAllowedLogoUrl, loadPdfImage } from "@/lib/pdf/load-image";

/**
 * SECURITY REGRESSION SUITE.
 *
 * `branding.logo_url` is user-supplied and only shape-validated (http(s), any
 * host — see lib/branding-values.ts). Once the PDF is composed on the server,
 * an unrestricted fetch of that value is SSRF. These tests pin the allowlist
 * that stops it. If one of them starts failing, do not "fix" it by widening
 * the allowlist without understanding which host you are admitting.
 */

const SUPABASE = "https://abc123.supabase.co";
const SITE = "https://usetruecap.com";

let originalSupabase: string | undefined;
let originalSite: string | undefined;
let originalVercel: string | undefined;

beforeEach(() => {
  originalSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  originalSite = process.env.NEXT_PUBLIC_SITE_URL;
  originalVercel = process.env.VERCEL_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE;
  process.env.NEXT_PUBLIC_SITE_URL = SITE;
  delete process.env.VERCEL_URL;
});

afterEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabase;
  process.env.NEXT_PUBLIC_SITE_URL = originalSite;
  if (originalVercel === undefined) delete process.env.VERCEL_URL;
  else process.env.VERCEL_URL = originalVercel;
});

describe("isAllowedLogoUrl", () => {
  it("admits a logo uploaded through the product", () => {
    expect(
      isAllowedLogoUrl(`${SUPABASE}/storage/v1/object/public/branding-logos/user-1/logo-123.png`)
    ).toBe(true);
  });

  it("admits our own site origin", () => {
    expect(isAllowedLogoUrl(`${SITE}/Logo-png-w.png`)).toBe(true);
  });

  it("refuses cloud instance metadata", () => {
    expect(isAllowedLogoUrl("http://169.254.169.254/latest/meta-data/")).toBe(false);
    expect(isAllowedLogoUrl("https://169.254.169.254/latest/meta-data/")).toBe(false);
  });

  it("refuses loopback and private hosts", () => {
    expect(isAllowedLogoUrl("http://localhost:6379/")).toBe(false);
    expect(isAllowedLogoUrl("https://127.0.0.1/logo.png")).toBe(false);
    expect(isAllowedLogoUrl("https://10.0.0.5/logo.png")).toBe(false);
  });

  it("refuses an arbitrary third-party host", () => {
    expect(isAllowedLogoUrl("https://evil.example.com/logo.png")).toBe(false);
  });

  it("refuses plaintext http even on an allowed origin", () => {
    expect(
      isAllowedLogoUrl("http://abc123.supabase.co/storage/v1/object/public/branding-logos/x.png")
    ).toBe(false);
  });

  it("confines Supabase reads to the branding-logos bucket", () => {
    // analysis-pdfs is a PRIVATE bucket holding other users' reports.
    expect(
      isAllowedLogoUrl(`${SUPABASE}/storage/v1/object/public/analysis-pdfs/someone-else.pdf`)
    ).toBe(false);
    expect(isAllowedLogoUrl(`${SUPABASE}/storage/v1/object/sign/branding-logos/x.png`)).toBe(false);
  });

  it("is not fooled by a lookalike host or an embedded credential", () => {
    expect(isAllowedLogoUrl("https://abc123.supabase.co.evil.com/x.png")).toBe(false);
    expect(isAllowedLogoUrl("https://abc123.supabase.co@evil.com/x.png")).toBe(false);
  });

  it("refuses junk rather than throwing", () => {
    expect(isAllowedLogoUrl("not a url")).toBe(false);
    expect(isAllowedLogoUrl("")).toBe(false);
    expect(isAllowedLogoUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedLogoUrl("file:///etc/passwd")).toBe(false);
  });
});

describe("loadPdfImage", () => {
  it("reads a bundled public asset and reports its intrinsic size", async () => {
    const image = await loadPdfImage("/Logo-png-w.png");
    expect(image).not.toBeNull();
    expect(image!.format).toBe("PNG");
    expect(image!.width).toBeGreaterThan(0);
    expect(image!.height).toBeGreaterThan(0);
    expect(image!.dataUrl.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("cannot be walked out of public/", async () => {
    expect(await loadPdfImage("/../package.json")).toBeNull();
    expect(await loadPdfImage("/../../etc/passwd")).toBeNull();
  });

  it("returns null for a disallowed absolute URL without fetching", async () => {
    expect(await loadPdfImage("https://evil.example.com/logo.png")).toBeNull();
  });

  it("returns null for a missing asset rather than throwing", async () => {
    expect(await loadPdfImage("/does-not-exist.png")).toBeNull();
    expect(await loadPdfImage("")).toBeNull();
  });

  it("rejects a non-image payload even from an allowed path", async () => {
    // README-ish text living under public/ must not be embedded as an image.
    expect(await loadPdfImage("/robots.txt")).toBeNull();
  });
});
