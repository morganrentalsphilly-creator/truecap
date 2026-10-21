// Signs in through the real login form against the loopback stand-in
// (mock-supabase.mjs), then captures signed-in routes at the CLAUDE.md §9
// widths and reports what a screenshot cannot: horizontal overflow, controls
// under 44px, the h1, the order of the page's sections, and redirects.
//
//   node docs/overhaul-2026-10/tools/signed-in-loopback/capture-signed-in.mjs <outDir> [--label=<label>] [route ...]
//
// Routes default to /dashboard (for example /dashboard/saved-analyses or
// /dashboard/compare). BASE_URL (default http://127.0.0.1:3100) and WIDTHS
// (default 375,768,1095,1440) can be overridden; COOKIE_BANNER=1 leaves the
// consent banner up. Writes a viewport and a full-page PNG per route and
// width, and <label>-report.json, to <outDir>.
//
// Refuses to run unless the app is served from 127.0.0.1, the stand-in answers
// on 127.0.0.1:54321, and the repo's .next build inlined that loopback origin
// (build-isolated.sh does), so the sign-in can never reach a hosted project.
// In the browser, every request to a host other than 127.0.0.1 is aborted and
// listed in the report.
import { chromium } from "playwright";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MOCK_ORIGIN = "http://127.0.0.1:54321";
const MOCK_MARKER = "truecap-signed-in-loopback";
// The fixture user gen-fixtures.vitest.ts writes; keep the two in step.
const EMAIL = "internal-e2e@usetruecap.invalid";
const PASSWORD = "loopback-mock-password-0123456789";
const HEIGHT = { 375: 812, 390: 844, 768: 1024, 1095: 760, 1280: 800, 1440: 900 };
const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));

function refuse(message) {
  console.error(`Refusing to capture: ${message}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const label = args.find((a) => a.startsWith("--label="))?.slice("--label=".length) || "local";
const [outDir, ...routeArgs] = args.filter((a) => !a.startsWith("--label="));
if (!outDir) {
  console.error("usage: node capture-signed-in.mjs <outDir> [--label=<label>] [route ...]");
  process.exit(2);
}
const routes = routeArgs.length ? routeArgs : ["/dashboard"];
const widths = (process.env.WIDTHS ?? "375,768,1095,1440").split(",").map(Number);

// ── Preflight: loopback only ───────────────────────────────────────────────
const base = new URL(process.env.BASE_URL ?? "http://127.0.0.1:3100");
if (base.protocol !== "http:" || base.hostname !== "127.0.0.1") {
  refuse(`BASE_URL ${base.origin} is not http://127.0.0.1.`);
}
for (const route of routes) {
  // "//host/path" is protocol-relative, so the origin is compared too.
  if (!route.startsWith("/") || new URL(route, base).origin !== base.origin) {
    refuse(`route ${route} must be a path on ${base.origin}.`);
  }
}
const marker = await fetch(`${MOCK_ORIGIN}/__loopback-mock`)
  .then((r) => r.json())
  .catch(() => null);
if (marker?.mock !== MOCK_MARKER) {
  refuse(`the loopback stand-in is not answering on ${MOCK_ORIGIN}; start mock-supabase.mjs first.`);
}

async function* serverChunks(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* serverChunks(full);
    else if (entry.name.endsWith(".js")) yield full;
  }
}
// proxy.ts compiles to middleware.js and always reads the Supabase origin, so
// it is checked first; the walk covers a layout where it moved.
async function* candidates() {
  yield path.join(REPO_ROOT, ".next/server/middleware.js");
  yield* serverChunks(path.join(REPO_ROOT, ".next/server"));
}
async function builtAgainstLoopback() {
  try {
    for await (const file of candidates()) {
      if ((await readFile(file, "utf8").catch(() => "")).includes(MOCK_ORIGIN)) return true;
    }
  } catch {
    return false; // no .next/server: not built
  }
  return false;
}
if (!(await builtAgainstLoopback())) {
  refuse(`${path.join(REPO_ROOT, ".next")} was not built against ${MOCK_ORIGIN}; build with build-isolated.sh.`);
}

// ── Capture ───────────────────────────────────────────────────────────────
await mkdir(outDir, { recursive: true });
const slugOf = (route) => route.replace(/[?#].*$/, "").replace(/^\//, "").replace(/\//g, "_") || "home";

const browser = await chromium.launch();
const context = await browser.newContext({ reducedMotion: "reduce" });
// Consent answered (denied), as the other overhaul tools do, so the banner does
// not cover the page; COOKIE_BANNER=1 keeps it.
if (process.env.COOKIE_BANNER !== "1") {
  await context.addInitScript(() => {
    try { localStorage.setItem("truecap_cookie_consent_v1", "denied"); } catch {}
  });
}
const blockedRequests = [];
await context.route("**/*", (route) => {
  const url = new URL(route.request().url());
  if (url.protocol === "data:" || url.protocol === "blob:" || url.hostname === "127.0.0.1") {
    return route.continue();
  }
  blockedRequests.push(url.origin + url.pathname);
  return route.abort("blockedbyclient");
});
const page = await context.newPage();
let currentRoute = "/auth/login";
const consoleErrors = [];
// Vercel Web Analytics' script exists only on Vercel; locally it 404s on every
// page, so those two lines are left out of the report.
const vercelOnly = (m) => m.location()?.url?.includes("/_vercel/") || m.text().includes("/_vercel/");
page.on("console", (m) => {
  if (m.type() === "error" && !vercelOnly(m)) consoleErrors.push({ route: currentRoute, text: m.text() });
});
page.on("pageerror", (e) => consoleErrors.push({ route: currentRoute, text: String(e) }));

await page.goto(new URL(`/auth/login?next=${encodeURIComponent(routes[0])}`, base).href, {
  waitUntil: "domcontentloaded",
});
await page.getByLabel("Email", { exact: true }).fill(EMAIL);
await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
await page.getByRole("button", { name: "Sign in", exact: true }).click();
try {
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/"), { timeout: 60_000 });
} catch {
  await browser.close();
  refuse("sign-in did not leave /auth/login; check the stand-in's log for the password grant.");
}

const report = { label, base: base.origin, routes: {} };
for (const route of routes) {
  currentRoute = route;
  const perWidth = {};
  for (const w of widths) {
    await page.setViewportSize({ width: w, height: HEIGHT[w] ?? 900 });
    const response = await page.goto(new URL(route, base).href, { waitUntil: "load" });
    await page.locator("h1").first().waitFor({ timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(400);
    const facts = await page.evaluate(() => {
      const doc = document.documentElement;
      // Visible, and not visually hidden the sr-only way (a skip link until focus).
      const visible = (el) => {
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return (
          r.width > 0 &&
          r.height > 0 &&
          style.visibility !== "hidden" &&
          style.clipPath !== "inset(50%)" &&
          style.clip !== "rect(0px, 0px, 0px, 0px)"
        );
      };
      const main = document.querySelector("main#main") ?? document.querySelector("main");
      const sections = [...(main?.children ?? [])].filter(visible).map((el) => {
        const h = el.querySelector("h1,h2");
        const top = Math.round(el.getBoundingClientRect().top + scrollY);
        return `${el.tagName.toLowerCase()}${h ? `: ${h.textContent.trim().slice(0, 40)}` : ""} @${top}`;
      });
      // Inline text links are exempt from the target size (WCAG 2.5.8), so
      // only controls that lay out as boxes are measured.
      const controls = document.querySelectorAll(
        "a[href], button, select, input:not([type=hidden]), textarea, summary, [role=button], [role=tab], [role=checkbox], [role=switch]",
      );
      const smallTargets = [...controls]
        .filter((el) => visible(el) && getComputedStyle(el).display !== "inline")
        .map((el) => {
          const r = el.getBoundingClientRect();
          const name = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("name") || "").trim();
          return { t: name.slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) };
        })
        .filter((r) => r.h < 44 || r.w < 44);
      return {
        h1: document.querySelector("h1")?.textContent.trim() ?? null,
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        overflow: doc.scrollWidth > doc.clientWidth,
        viewportHeight: innerHeight,
        sections,
        smallTargets,
      };
    });
    const landed = new URL(page.url());
    perWidth[w] = {
      status: response?.status() ?? null,
      landedOn: landed.pathname + landed.search,
      redirected: landed.pathname !== new URL(route, base).pathname,
      ...facts,
    };
    const stem = path.join(outDir, `${slugOf(route)}-${label}-${w}`);
    await page.screenshot({ path: `${stem}.png`, fullPage: false, animations: "disabled" });
    await page.screenshot({ path: `${stem}-full.png`, fullPage: true, animations: "disabled" });
    console.log(
      `${route} @${w}: ${perWidth[w].status} ${perWidth[w].redirected ? `→ ${perWidth[w].landedOn} ` : ""}` +
        `h1=${JSON.stringify(facts.h1)} overflow=${facts.overflow} smallTargets=${facts.smallTargets.length}`,
    );
  }
  report.routes[route] = perWidth;
}
report.consoleErrors = consoleErrors;
report.blockedRequests = [...new Set(blockedRequests)];
const reportPath = path.join(outDir, `${label}-report.json`);
await writeFile(reportPath, JSON.stringify(report, null, 2));
console.log(
  `console errors: ${consoleErrors.length}, blocked off-loopback requests: ${report.blockedRequests.length}\n${reportPath}`,
);
await browser.close();
