/**
 * Admin email preview page.
 *
 * Shows the rendered HTML of any weekly digest content file in an
 * iframe, so Morgan can verify the design + content before the cron
 * sends it (or before he hits the "Send test" button below).
 *
 * Access control: admin guard via lib/admin-guard.ts. Non-admins get
 * a generic 404 (we don't leak the existence of this route to the
 * world).
 *
 * Query params:
 *   ?date=YYYY-MM-DD — show this specific week (defaults to the
 *                      newest content file)
 */

import { notFound, redirect } from "next/navigation";
import { checkAdmin } from "@/lib/admin-guard";
import { listContentDates, loadContent, renderWeeklyDigest } from "@/lib/email/render-weekly";
import { EmailPreviewControls } from "./preview-controls";

export const metadata = {
  title: "Email Preview · TrueCap Admin",
  alternates: { canonical: "/admin/email-preview" },
  robots: { index: false, follow: false },
};

// Disable static rendering — this is always per-request behind auth.
export const dynamic = "force-dynamic";

export default async function EmailPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const admin = await checkAdmin();
  if (!admin.ok) {
    if (admin.reason === "UNAUTHENTICATED") {
      redirect("/auth/login?next=/admin/email-preview");
    }
    // FORBIDDEN — pretend route doesn't exist.
    notFound();
  }

  const params = await searchParams;
  const dates = await listContentDates();
  const selectedDate = params.date ?? dates[0];

  if (!selectedDate) {
    return (
      <div className="min-h-screen bg-background px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-extrabold text-foreground">Email Preview</h1>
          <p className="mt-4 text-sm text-muted-foreground">
            No content files found in <code className="rounded bg-muted px-1.5 py-0.5">/emails/content/</code>.
            Create a file named <code className="rounded bg-muted px-1.5 py-0.5">YYYY-MM-DD.json</code>{" "}
            (where the date is the Monday it should send) and refresh this page.
          </p>
        </div>
      </div>
    );
  }

  const content = await loadContent(selectedDate);
  if (!content) {
    return (
      <div className="min-h-screen bg-background px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-extrabold text-foreground">Email Preview</h1>
          <p className="mt-4 text-sm text-[var(--metric-negative,#dc2626)]">
            Failed to load content for {selectedDate}. Check that the file exists at{" "}
            <code className="rounded bg-muted px-1.5 py-0.5">/emails/content/{selectedDate}.json</code>{" "}
            and parses as valid JSON.
          </p>
        </div>
      </div>
    );
  }

  // Render with a clearly non-functional placeholder unsubscribe link
  // so the preview can't accidentally submit a real unsubscribe.
  const { html, subject } = await renderWeeklyDigest(content, {
    unsubscribeUrl: "#preview-unsubscribe",
  });

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
              Admin · Email Preview
            </p>
            <h1 className="mt-1 text-2xl font-extrabold text-foreground">{subject}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Content file: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{selectedDate}.json</code>
            </p>
          </div>
          <EmailPreviewControls
            dates={dates}
            selectedDate={selectedDate}
            adminEmail={admin.email}
          />
        </header>

        {/* Render in an iframe so the email's own styles don't bleed
            into the admin page chrome. srcdoc keeps everything in
            memory — no separate route needed. */}
        <div className="rounded-2xl border border-border bg-card p-2 shadow-sm">
          <iframe
            title="Email preview"
            srcDoc={html}
            className="h-[80vh] w-full rounded-xl bg-white"
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
