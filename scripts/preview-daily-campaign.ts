/**
 * scripts/preview-daily-campaign.ts
 *
 * Renders all 30 daily campaign emails into a single static HTML file
 * so Morgan can scroll through and review every email before running
 * `npm run schedule-daily-campaign` for real.
 *
 * Why one HTML file with iframes (not 30 separate files):
 *   - Each email's HTML is a full <html> document with inline styles.
 *     Concatenating them directly would collide on doctype/body and
 *     leak styles between emails.
 *   - srcdoc-based iframes give each email its own isolated render
 *     context, which is exactly how Gmail/Apple Mail will treat them
 *     in production. So the preview is *more* faithful than a hosted
 *     mock would be.
 *   - One file = one double-click to open. No webserver needed.
 *
 * Output: /Users/morganpage/Downloads/final_source_code/.preview/daily-campaign-preview.html
 *   (Git-ignored; this is a local artifact, not a shipped asset.)
 *
 * Usage:
 *   npm run preview-daily-campaign
 *   → prints the file path, then `open` it.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderHtml, renderText, type DailyContent } from "./schedule-daily-campaign";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CONTENT_DIR = path.join(ROOT, "emails", "daily-campaign-content");
const OUT_DIR = path.join(ROOT, ".preview");
const OUT_FILE = path.join(OUT_DIR, "daily-campaign-preview.html");

const TOTAL_DAYS = 30;

function loadDay(day: number): DailyContent {
  const file = path.join(CONTENT_DIR, `day-${String(day).padStart(2, "0")}.json`);
  const raw = fs.readFileSync(file, "utf8");
  return JSON.parse(raw) as DailyContent;
}

function escapeAttr(s: string): string {
  // Escape for use inside an HTML attribute value (srcdoc, alt, etc).
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatDate(iso: string): string {
  // "2026-06-01" → "Mon, Jun 1"
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function buildPreview(): { html: string; bytes: number } {
  const days: DailyContent[] = [];
  for (let day = 1; day <= TOTAL_DAYS; day++) {
    days.push(loadDay(day));
  }

  // Per-email cards. Each iframe is given a height that accommodates
  // the email's content — we approximate via word count since we can't
  // measure rendered height at build time. Slightly oversized is fine;
  // it just adds white space below the email.
  const cards = days
    .map((c) => {
      const html = renderHtml(c);
      const wordCount = c.body.join(" ").split(/\s+/).filter(Boolean).length;
      // Rough heuristic: 16px text at 1.6 line-height ≈ 25 chars per line
      // in a 580-wide card. Plus header/CTA/footer chrome ≈ 460px.
      const estimatedHeight = Math.max(720, 460 + Math.ceil(wordCount / 9) * 30);
      const send = formatDate(c.send_date);
      return `
<section id="day-${c.day}" class="card">
  <header class="meta">
    <div class="meta-left">
      <span class="badge">Day ${c.day} / 30</span>
      <span class="date">${escapeHtml(send)}</span>
    </div>
    <div class="meta-right">
      <a href="#top" class="back">↑ top</a>
    </div>
  </header>
  <div class="subj">
    <div class="subj-label">Subject</div>
    <div class="subj-text">${escapeHtml(c.subject)}</div>
    <div class="preheader-label">Preheader</div>
    <div class="preheader-text">${escapeHtml(c.preheader)}</div>
  </div>
  <iframe
    title="Day ${c.day} preview"
    sandbox="allow-same-origin"
    style="width:100%;height:${estimatedHeight}px;border:0;background:#FAFBFE;border-radius:12px;"
    srcdoc="${escapeAttr(html)}"
  ></iframe>
</section>`;
    })
    .join("\n");

  // Sidebar nav
  const nav = days
    .map((c) => {
      return `<a href="#day-${c.day}" class="nav-item">
        <span class="nav-day">${String(c.day).padStart(2, "0")}</span>
        <span class="nav-subj">${escapeHtml(c.subject)}</span>
      </a>`;
    })
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>TrueCap · 30-Day Campaign Preview</title>
  <style>
    :root {
      --bg: #F5F7FB;
      --card: #FFFFFF;
      --text: #0F121E;
      --muted: #5B6478;
      --primary: #5248D4;
      --border: #E4E8F0;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }
    .layout {
      display: grid;
      grid-template-columns: 280px 1fr;
      min-height: 100vh;
    }
    nav.sidebar {
      position: sticky;
      top: 0;
      align-self: start;
      height: 100vh;
      overflow-y: auto;
      border-right: 1px solid var(--border);
      background: #FFFFFF;
      padding: 24px 16px;
    }
    .brand {
      padding: 0 8px 16px 8px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 12px;
    }
    .brand-name { font-size: 14px; font-weight: 700; color: var(--primary); letter-spacing: 0.04em; text-transform: uppercase; }
    .brand-title { font-size: 18px; font-weight: 700; color: var(--text); margin-top: 4px; }
    .brand-meta { font-size: 12px; color: var(--muted); margin-top: 4px; }
    .nav-item {
      display: flex;
      gap: 10px;
      padding: 8px 8px;
      border-radius: 6px;
      color: var(--text);
      text-decoration: none;
      font-size: 13px;
      align-items: baseline;
      transition: background 0.1s;
    }
    .nav-item:hover { background: var(--bg); }
    .nav-day { font-weight: 700; color: var(--primary); min-width: 24px; font-variant-numeric: tabular-nums; }
    .nav-subj { color: var(--text); flex: 1; }
    main { padding: 32px 40px 80px 40px; max-width: 760px; }
    .top-banner {
      background: var(--primary);
      color: #FFF;
      padding: 16px 20px;
      border-radius: 12px;
      margin-bottom: 24px;
    }
    .top-banner h1 { margin: 0 0 4px 0; font-size: 20px; }
    .top-banner p { margin: 0; font-size: 14px; opacity: 0.9; }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 28px;
      box-shadow: 0 1px 2px rgba(15, 18, 30, 0.04);
    }
    .meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }
    .meta-left { display: flex; gap: 12px; align-items: center; }
    .badge {
      background: var(--primary);
      color: #FFF;
      padding: 4px 10px;
      border-radius: 99px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }
    .date {
      font-size: 13px;
      color: var(--muted);
      font-weight: 500;
    }
    .back {
      font-size: 12px;
      color: var(--muted);
      text-decoration: none;
    }
    .back:hover { color: var(--primary); }
    .subj {
      background: var(--bg);
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 14px;
    }
    .subj-label, .preheader-label {
      font-size: 10px;
      font-weight: 700;
      color: var(--muted);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .subj-text {
      font-size: 15px;
      font-weight: 600;
      color: var(--text);
      margin: 2px 0 8px 0;
    }
    .preheader-text {
      font-size: 13px;
      color: var(--muted);
      margin-top: 2px;
      font-style: italic;
    }
    @media (max-width: 900px) {
      .layout { grid-template-columns: 1fr; }
      nav.sidebar { position: static; height: auto; max-height: 240px; }
      main { padding: 24px 20px 60px 20px; }
    }
  </style>
</head>
<body id="top">
  <div class="layout">
    <nav class="sidebar">
      <div class="brand">
        <div class="brand-name">TrueCap</div>
        <div class="brand-title">30-Day Campaign</div>
        <div class="brand-meta">Jun 1 → Jun 30 · 9am ET daily</div>
      </div>
      ${nav}
    </nav>
    <main>
      <div class="top-banner">
        <h1>Preview before scheduling</h1>
        <p>Scroll through all 30 emails below. Each one renders the same way your subscribers will see it. To edit: open the matching JSON in <code>emails/daily-campaign-content/</code>, then re-run <code>npm run preview-daily-campaign</code>. When you&rsquo;re happy, run <code>npm run schedule-daily-campaign</code> to push them all to Resend.</p>
      </div>
      ${cards}
    </main>
  </div>
</body>
</html>`;

  return { html, bytes: Buffer.byteLength(html, "utf8") };
}

function main(): void {
  // Quick existence check on all 30 files before doing any work — if
  // any are missing we'd rather fail loud than render a 29-day preview.
  for (let day = 1; day <= TOTAL_DAYS; day++) {
    const file = path.join(CONTENT_DIR, `day-${String(day).padStart(2, "0")}.json`);
    if (!fs.existsSync(file)) {
      console.error(`[preview] Missing content file: ${file}`);
      process.exit(1);
    }
  }

  const { html, bytes } = buildPreview();

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, html, "utf8");

  console.log(`[preview] Wrote ${bytes.toLocaleString()} bytes`);
  console.log(`[preview] File:  ${OUT_FILE}`);
  console.log(`[preview] Open:  open "${OUT_FILE}"`);
}

main();
