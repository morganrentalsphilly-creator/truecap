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

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { render } from "@react-email/render";
import { checkAdmin } from "@/lib/admin-guard";
import { listContentDates, loadContent, renderWeeklyDigest } from "@/lib/email/render-weekly";
import RateAlertEmail from "@/emails/rate-alert";
import RentAlertEmail from "@/emails/rent-alert";
import { rateAlertSubject } from "@/lib/rate-alerts";
import { rentAlertSubject } from "@/lib/rent-alerts";
import { getSiteUrl } from "@/lib/site-url";
import { EmailPreviewControls } from "./preview-controls";
import { SAMPLE_RATE_ALERT_DEALS, SAMPLE_RENT_ALERT_DEALS } from "./alert-samples";

type PreviewTemplate = "weekly" | "rate-alert" | "rent-alert";

const TEMPLATE_TABS: { key: PreviewTemplate; label: string }[] = [
  { key: "weekly", label: "Weekly digest" },
  { key: "rate-alert", label: "Rate alert" },
  { key: "rent-alert", label: "Rent alert" },
];

/** Tab row to switch between the email templates this tool can render. */
function TemplateTabs({ active }: { active: PreviewTemplate }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TEMPLATE_TABS.map((tab) => (
        <Link
          key={tab.key}
          href={`/admin/email-preview?template=${tab.key}`}
          className={
            tab.key === active
              ? "rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background"
              : "rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          }
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

/** Iframe shell shared by every template preview. */
function PreviewFrame({ html }: { html: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-2 shadow-sm">
      <iframe
        title="Email preview"
        srcDoc={html}
        className="h-[80vh] w-full rounded-xl bg-white"
        sandbox="allow-same-origin"
      />
    </div>
  );
}

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
  searchParams: Promise<{ date?: string; template?: string }>;
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
  const template: PreviewTemplate =
    params.template === "rate-alert" || params.template === "rent-alert" ? params.template : "weekly";

  // Alert templates render from hand-built sample deals (no content files,
  // no live data) so the design can be reviewed any time. Never sent here.
  if (template === "rate-alert" || template === "rent-alert") {
    const siteUrl = getSiteUrl();
    const { html, subject } =
      template === "rate-alert"
        ? {
            html: await render(
              RateAlertEmail({
                currentRatePct: 6.75,
                previousRatePct: 7.625,
                deals: SAMPLE_RATE_ALERT_DEALS,
                siteUrl,
              })
            ),
            subject: rateAlertSubject(6.75, SAMPLE_RATE_ALERT_DEALS.length, true),
          }
        : {
            html: await render(RentAlertEmail({ deals: SAMPLE_RENT_ALERT_DEALS, siteUrl })),
            subject: rentAlertSubject(SAMPLE_RENT_ALERT_DEALS.length),
          };

    return (
      <div className="min-h-screen bg-background px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <header className="mb-6 flex flex-col gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
                Admin · Email Preview
              </p>
              <h1 className="mt-1 text-2xl font-extrabold text-foreground">{subject}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Sample data · this template is sent by its cron, not from here.
              </p>
            </div>
            <TemplateTabs active={template} />
          </header>
          <PreviewFrame html={html} />
        </div>
      </div>
    );
  }

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
        <header className="mb-6 flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
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
          </div>
          <TemplateTabs active="weekly" />
        </header>

        {/* Render in an iframe so the email's own styles don't bleed
            into the admin page chrome. srcdoc keeps everything in
            memory — no separate route needed. */}
        <PreviewFrame html={html} />
      </div>
    </div>
  );
}
