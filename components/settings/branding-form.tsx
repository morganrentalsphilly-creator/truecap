"use client";

/**
 * Pro-tier custom branding form.
 *
 * Layout: two columns at md+ — form on the left, live preview tile on
 * the right. The preview mocks the cover-page header of a PDF report
 * so users see what the export will look like as they edit.
 *
 * State strategy: local form state for inputs, optimistic preview, save
 * via saveBranding server action. Logo upload uses a separate
 * uploadBrandingLogo action (it touches Supabase Storage so it can't be
 * part of a JSON-only save). Order is: upload logo first → get URL →
 * include URL in saveBranding payload.
 *
 * Entitlement: the parent page already gates render on canUseBranding,
 * so this component assumes the user is entitled. The server actions
 * also re-check the entitlement (defense in depth).
 */

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Loader2, Upload, X } from "lucide-react";
import {
  saveBranding,
  uploadBrandingLogo,
  type BrandingRow,
  type BrandingValues,
} from "@/app/actions/branding";

type Status = { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string };

const TRUECAP_BLUE = "#1A4FBA"; // matches lib/pdf-generator.ts COLOR.primary fallback

export function BrandingForm({ initial }: { initial: BrandingRow | null }) {
  const [companyName, setCompanyName] = useState(initial?.company_name ?? "");
  const [tagline, setTagline] = useState(initial?.tagline ?? "");
  const [primaryColor, setPrimaryColor] = useState(
    initial?.primary_color_hex ?? ""
  );
  const [contactName, setContactName] = useState(initial?.contact_name ?? "");
  const [contactEmail, setContactEmail] = useState(initial?.contact_email ?? "");
  const [contactPhone, setContactPhone] = useState(initial?.contact_phone ?? "");
  const [contactWebsite, setContactWebsite] = useState(initial?.contact_website ?? "");
  const [logoUrl, setLogoUrl] = useState<string | null>(initial?.logo_url ?? null);
  // A viewer-local date cannot be rendered deterministically on the server.
  // Keep SSR and the first client render identical, then populate the preview
  // after mount in the viewer's own time zone.
  const [preparedDate, setPreparedDate] = useState("");

  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [logoUploading, setLogoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreparedDate(todayShort());
  }, []);

  // Preview accent color — uses what's typed, or falls back to TrueCap blue
  // if blank/invalid so the preview never goes colorless and disorienting.
  const previewAccent = /^#[0-9A-Fa-f]{6}$/.test(primaryColor)
    ? primaryColor
    : TRUECAP_BLUE;

  async function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus({ kind: "idle" });
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadBrandingLogo(fd);
      if (res.ok) {
        setLogoUrl(res.url);
      } else {
        setStatus({ kind: "error", message: res.message });
      }
    } catch {
      setStatus({ kind: "error", message: "Upload failed." });
    } finally {
      setLogoUploading(false);
      // Reset input so the same file can be re-selected if user removes
      // and re-uploads.
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ kind: "saving" });
    const payload: BrandingValues = {
      company_name: companyName || null,
      tagline: tagline || null,
      primary_color_hex: primaryColor || null,
      contact_name: contactName || null,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      contact_website: contactWebsite || null,
      logo_url: logoUrl,
    };
    startTransition(async () => {
      const res = await saveBranding(payload);
      if (res.ok) {
        setStatus({ kind: "saved" });
        // Quietly drop the "Saved" toast after 2.5s so the form returns
        // to its idle state.
        window.setTimeout(() => setStatus({ kind: "idle" }), 2500);
      } else {
        setStatus({ kind: "error", message: res.message });
      }
    });
  }

  // Underscore, NOT a comma. Tailwind passes an arbitrary value through
  // verbatim — it only rewrites "_" to a space — so `[1fr,360px]` emitted
  // `grid-template-columns:1fr,360px`. A comma is not a valid track-list
  // separator, so the browser DISCARDED the declaration and this form has
  // never once rendered as two columns at lg. Verified in the shipped CSS
  // bundle, not inferred.
  //
  // minmax(0,1fr) rather than a bare 1fr: the form column holds fixed-width
  // children, and a bare 1fr track refuses to shrink below their min-content.
  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* Form column */}
      <div className="space-y-6">
        {/* Logo */}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Logo
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            PNG or JPEG, 1 MB or smaller. We&rsquo;ll auto-fit within
            600&nbsp;&times;&nbsp;200 px on the cover page.
          </p>

          <div className="mt-4 flex items-start gap-4">
            <div className="flex h-24 w-44 items-center justify-center rounded-xl border border-dashed border-border bg-background">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="max-h-full max-w-full object-contain p-2"
                />
              ) : (
                <span className="text-xs text-muted-foreground">No logo</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleLogoSelect}
                className="hidden"
                id="branding-logo-file"
                disabled={logoUploading}
              />
              <label
                htmlFor="branding-logo-file"
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-50"
              >
                {logoUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                {logoUrl ? "Replace logo" : "Upload logo"}
              </label>
              {logoUrl ? (
                <button
                  type="button"
                  onClick={() => setLogoUrl(null)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        </section>

        {/* Brand color + identity */}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Identity
          </h2>

          <Field
            label="Primary brand color"
            hint="6-digit hex (e.g. #1A4FBA). Used for the header bar, accent lines, and primary metric color in the PDF."
          >
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={
                  /^#[0-9A-Fa-f]{6}$/.test(primaryColor)
                    ? primaryColor
                    : TRUECAP_BLUE
                }
                onChange={(e) => setPrimaryColor(e.target.value.toUpperCase())}
                className="h-10 w-12 cursor-pointer rounded-md border border-border bg-transparent"
                aria-label="Pick brand color"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value.trim())}
                placeholder="#1A4FBA"
                maxLength={7}
                className="w-32 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono uppercase tabular-nums"
              />
              <button
                type="button"
                onClick={() => setPrimaryColor("")}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Reset
              </button>
            </div>
          </Field>

          <Field label="Company name" hint="Shown on the PDF cover page header.">
            <TextInput
              value={companyName}
              onChange={setCompanyName}
              placeholder="e.g. Page Realty"
              maxLength={120}
              name="company_name"
              autoComplete="organization"
              ariaLabel="Company name"
            />
          </Field>

          <Field
            label="Tagline"
            hint="Short line beneath your company name. Optional."
          >
            <TextInput
              value={tagline}
              onChange={setTagline}
              placeholder="e.g. Philadelphia&rsquo;s rental investment specialists"
              maxLength={160}
              name="tagline"
              ariaLabel="Company tagline"
            />
          </Field>
        </section>

        {/* Contact details render in the PDF cover's PREPARED BY block. The
            same fields also support the co-branded client/embedded surfaces,
            so saving here must preserve—not clear—existing values. */}
        <section className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Contact details
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Optional. These appear in the Prepared by block on every branded PDF.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact name">
              <TextInput
                value={contactName}
                onChange={setContactName}
                placeholder="e.g. Morgan Page"
                maxLength={120}
                name="contact_name"
                autoComplete="name"
                ariaLabel="Contact name"
              />
            </Field>
            <Field label="Email">
              <TextInput
                type="email"
                value={contactEmail}
                onChange={setContactEmail}
                placeholder="morgan@example.com"
                maxLength={180}
                name="contact_email"
                autoComplete="email"
                ariaLabel="Contact email"
              />
            </Field>
            <Field label="Phone">
              <TextInput
                type="tel"
                value={contactPhone}
                onChange={setContactPhone}
                placeholder="(215) 555-0100"
                maxLength={40}
                name="contact_phone"
                autoComplete="tel"
                ariaLabel="Contact phone"
              />
            </Field>
            <Field label="Website" hint="Include https:// so the link is valid.">
              <TextInput
                type="url"
                value={contactWebsite}
                onChange={setContactWebsite}
                placeholder="https://example.com"
                maxLength={240}
                name="contact_website"
                autoComplete="url"
                ariaLabel="Contact website"
              />
            </Field>
          </div>
        </section>

        {/* Save bar */}
        <div role="status" aria-live="polite" className="sticky bottom-0 -mx-4 flex items-center justify-end gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
          {isPending ? <span className="sr-only">Saving branding</span> : null}
          {status.kind === "saved" && (
            <span className="text-sm font-semibold text-[var(--metric-positive,#16a34a)]">
              Saved
            </span>
          )}
          {status.kind === "error" && (
            <span className="text-sm text-destructive">{status.message}</span>
          )}
          <button
            type="submit"
            disabled={isPending || logoUploading}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              "Save branding"
            )}
          </button>
        </div>
      </div>

      {/* Live preview column */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          PDF cover preview
        </p>
        <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {/* Header bar — uses the brand color */}
          <div className="h-3 w-full" style={{ background: previewAccent }} />
          <div className="p-5 space-y-4">
            <div className="flex h-12 items-center">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="max-h-full max-w-[160px] object-contain"
                />
              ) : (
                <div
                  className="text-lg font-extrabold tracking-tight"
                  style={{ color: previewAccent }}
                >
                  {companyName || "Your Logo"}
                </div>
              )}
            </div>
            {companyName && logoUrl ? (
              <p className="text-sm font-bold text-foreground">{companyName}</p>
            ) : null}
            {tagline ? (
              <p className="text-xs text-muted-foreground">{tagline}</p>
            ) : null}
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">
                Investment Analysis Report
              </p>
              <p>123 Sample Street, Philadelphia PA</p>
              <p className="mt-1 text-[10px]">
                Prepared{preparedDate ? ` ${preparedDate}` : ""}
              </p>
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                Prepared by
              </p>
              <p className="mt-1 text-xs font-bold text-foreground">
                {companyName || contactName || "TrueCap"}
              </p>
              {[contactName, contactEmail, contactPhone, contactWebsite].some(Boolean) ? (
                <p className="mt-1 break-words text-[10px] leading-relaxed text-muted-foreground">
                  {[contactName, contactEmail, contactPhone, contactWebsite]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Live preview. Actual PDF layout may vary slightly.
        </p>
      </aside>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </legend>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </fieldset>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  maxLength,
  type = "text",
  name,
  autoComplete,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  type?: React.HTMLInputTypeAttribute;
  name?: string;
  autoComplete?: string;
  ariaLabel: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      name={name}
      autoComplete={autoComplete}
      aria-label={ariaLabel}
      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
    />
  );
}

function todayShort() {
  const d = new Date();
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Silence unused-import warning — Image is intentionally imported in case
// we swap the <img> tags to next/image later. For now we use <img> so
// the Storage public URL works without next.config.js remote-pattern config.
void Image;
