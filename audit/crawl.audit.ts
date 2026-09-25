/**
 * Full-site crawl for the 2026-09 production-readiness audit.
 *
 * For every route and every viewport width it records: the main response
 * status and final URL, console errors/warnings, uncaught page errors
 * (hydration mismatches included), failed and 4xx/5xx requests, horizontal
 * overflow, metadata (title, description, canonical, robots, OG/Twitter,
 * h1 count, JSON-LD validity), images (alt, intrinsic vs rendered size,
 * transfer bytes), every link (for the link checker), suspicious text
 * (lorem ipsum, TODO, NaN, undefined, [object Object]), an axe-core run on
 * the configured widths, and a full-page JPEG screenshot.
 *
 * Output: artifacts/audit/<run>/<role>/pages.jsonl (+ assets.jsonl) and
 * artifacts/audit/<run>/<role>/<width>/<slug>.jpg. Summaries come from
 * audit/summarize.mjs and audit/check-links.mjs.
 */
import fs from "node:fs";
import path from "node:path";
import { test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { ASSET_ROUTES, PRIVATE_ROUTES, PUBLIC_EXTRAS, SKIP_PATTERNS } from "./routes";

const ROLE = process.env.AUDIT_ROLE ?? "anon";
const RUN = process.env.AUDIT_RUN ?? "baseline";
const OUT = path.resolve(process.cwd(), "artifacts", "audit", RUN, ROLE);
const WIDTHS = (process.env.AUDIT_WIDTHS ?? "375,768,1280,1440")
  .split(",")
  .map((w) => Number(w.trim()))
  .filter((w) => Number.isFinite(w) && w > 0);
const AXE_WIDTHS = new Set(
  (process.env.AUDIT_AXE_WIDTHS ?? "375,1280").split(",").map((w) => Number(w.trim())),
);
const LIMIT = Number(process.env.AUDIT_LIMIT ?? 0);
const ROUTE_MODE = process.env.AUDIT_ROUTES ?? "sitemap";
const STORAGE_STATE = process.env.AUDIT_STORAGE_STATE;

type ConsoleEntry = { type: string; text: string; location?: string };
type FailedRequest = { url: string; status?: number; method: string; errorText?: string; resourceType: string };
type ImageEntry = {
  src: string;
  alt: string | null;
  naturalWidth: number;
  naturalHeight: number;
  renderedWidth: number;
  renderedHeight: number;
  loading: string | null;
  visible: boolean;
  bytes?: number;
  contentType?: string;
};
type LinkEntry = { href: string; text: string; internal: boolean; targetBlank: boolean; rel: string | null };
type AxeViolation = { id: string; impact: string | null; help: string; nodes: number; targets: string[] };

export type PageRecord = {
  role: string;
  width: number;
  path: string;
  finalUrl: string;
  redirected: boolean;
  status: number | null;
  durationMs: number;
  title: string | null;
  description: string | null;
  canonical: string | null;
  robots: string | null;
  ogTitle: string | null;
  ogImage: string | null;
  twitterCard: string | null;
  lang: string | null;
  viewportMeta: string | null;
  h1Count: number;
  h1Text: string[];
  jsonLd: { blocks: number; invalid: number };
  consoleErrors: ConsoleEntry[];
  consoleWarnings: ConsoleEntry[];
  pageErrors: string[];
  hydration: string[];
  failedRequests: FailedRequest[];
  overflow: { scrollWidth: number; clientWidth: number; overflows: boolean };
  images: ImageEntry[];
  links: LinkEntry[];
  textFlags: string[];
  bodyTextLength: number;
  axe?: AxeViolation[];
  axeError?: string;
  screenshot?: string;
  error?: string;
  timing?: { domContentLoaded: number; load: number; transferBytes: number; scriptBytes: number };
};

function slugFor(p: string): string {
  const s = p.replace(/^\//, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return s.length ? s.slice(0, 120) : "home";
}

async function discoverRoutes(context: BrowserContext, baseURL: string): Promise<string[]> {
  const seen = new Set<string>();
  const push = (p: string) => {
    if (SKIP_PATTERNS.some((re) => re.test(p))) return;
    if (!seen.has(p)) seen.add(p);
  };
  if (ROUTE_MODE === "private") {
    PRIVATE_ROUTES.forEach(push);
  } else if (ROUTE_MODE !== "sitemap") {
    ROUTE_MODE.split(",").map((s) => s.trim()).filter(Boolean).forEach(push);
  } else {
    const res = await context.request.get(`${baseURL}/sitemap.xml`);
    const xml = await res.text();
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      try {
        const u = new URL(m[1]);
        push(u.pathname + u.search);
      } catch {
        /* ignore malformed loc */
      }
    }
    PUBLIC_EXTRAS.forEach(push);
  }
  const list = [...seen];
  return LIMIT > 0 ? list.slice(0, LIMIT) : list;
}

async function dismissConsent(page: Page): Promise<void> {
  // Privacy-preserving choice first; the banner persists to localStorage per
  // context so this only ever matters on the first page.
  const reject = page.getByRole("button", { name: /dismiss \(counts as reject\)|essential only|reject|decline/i });
  try {
    await reject.first().click({ timeout: 1500 });
    return;
  } catch {
    /* no reject control */
  }
  const accept = page.getByRole("button", { name: /^accept( all)?$/i });
  try {
    await accept.first().click({ timeout: 1500 });
  } catch {
    /* no banner */
  }
}

async function auditPage(
  context: BrowserContext,
  baseURL: string,
  pathname: string,
  width: number,
  first: boolean,
): Promise<PageRecord> {
  const page = await context.newPage();
  const consoleErrors: ConsoleEntry[] = [];
  const consoleWarnings: ConsoleEntry[] = [];
  const pageErrors: string[] = [];
  const failedRequests: FailedRequest[] = [];
  const responseMeta = new Map<string, { bytes?: number; contentType?: string; resourceType: string }>();
  let transferBytes = 0;
  let scriptBytes = 0;

  page.on("console", (msg) => {
    const type = msg.type();
    if (type !== "error" && type !== "warning") return;
    const loc = msg.location();
    const entry: ConsoleEntry = {
      type,
      text: msg.text().slice(0, 600),
      location: loc?.url ? `${loc.url}:${loc.lineNumber}` : undefined,
    };
    (type === "error" ? consoleErrors : consoleWarnings).push(entry);
  });
  page.on("pageerror", (err) => pageErrors.push(`${err.name}: ${err.message}`.slice(0, 800)));
  page.on("requestfailed", (req) => {
    failedRequests.push({
      url: req.url(),
      method: req.method(),
      errorText: req.failure()?.errorText,
      resourceType: req.resourceType(),
    });
  });
  page.on("response", async (res) => {
    const req = res.request();
    const status = res.status();
    if (status >= 400) {
      failedRequests.push({ url: res.url(), status, method: req.method(), resourceType: req.resourceType() });
    }
    const headers = res.headers();
    const lenHeader = headers["content-length"];
    let bytes = lenHeader ? Number(lenHeader) : undefined;
    const type = req.resourceType();
    if (bytes === undefined && (type === "image" || type === "script" || type === "document" || type === "stylesheet" || type === "font")) {
      try {
        bytes = (await res.body()).length;
      } catch {
        /* body unavailable (redirect / cached) */
      }
    }
    if (bytes !== undefined) {
      transferBytes += bytes;
      if (type === "script") scriptBytes += bytes;
    }
    responseMeta.set(res.url(), { bytes, contentType: headers["content-type"], resourceType: type });
  });

  const started = Date.now();
  const record: PageRecord = {
    role: ROLE,
    width,
    path: pathname,
    finalUrl: "",
    redirected: false,
    status: null,
    durationMs: 0,
    title: null,
    description: null,
    canonical: null,
    robots: null,
    ogTitle: null,
    ogImage: null,
    twitterCard: null,
    lang: null,
    viewportMeta: null,
    h1Count: 0,
    h1Text: [],
    jsonLd: { blocks: 0, invalid: 0 },
    consoleErrors,
    consoleWarnings,
    pageErrors,
    hydration: [],
    failedRequests,
    overflow: { scrollWidth: 0, clientWidth: 0, overflows: false },
    images: [],
    links: [],
    textFlags: [],
    bodyTextLength: 0,
  };

  try {
    const response = await page.goto(baseURL + pathname, { waitUntil: "load", timeout: 60_000 });
    record.status = response?.status() ?? null;
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    if (first) await dismissConsent(page);
    await page.waitForTimeout(600);

    // Scroll through so lazy images and scroll-driven reveals settle, then
    // return to the top for the screenshot and the overflow measurement.
    await page.evaluate(async () => {
      const step = Math.max(400, window.innerHeight);
      const total = document.documentElement.scrollHeight;
      for (let y = 0; y < total; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 40));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(300);

    const finalUrl = page.url();
    record.finalUrl = finalUrl.replace(baseURL, "");
    record.redirected = record.finalUrl !== pathname;

    const meta = await page.evaluate((base) => {
      const q = (sel: string) => document.querySelector(sel);
      const attr = (sel: string, name: string) => q(sel)?.getAttribute(name) ?? null;
      const ld = [...document.querySelectorAll('script[type="application/ld+json"]')];
      let invalid = 0;
      for (const s of ld) {
        try {
          JSON.parse(s.textContent ?? "");
        } catch {
          invalid += 1;
        }
      }
      const imgs = [...document.querySelectorAll("img")].map((img) => {
        const r = img.getBoundingClientRect();
        return {
          src: img.currentSrc || img.src,
          alt: img.hasAttribute("alt") ? img.getAttribute("alt") : null,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          renderedWidth: Math.round(r.width),
          renderedHeight: Math.round(r.height),
          loading: img.getAttribute("loading"),
          visible: r.width > 0 && r.height > 0,
        };
      });
      const links = [...document.querySelectorAll("a[href]")].map((a) => {
        const anchor = a as HTMLAnchorElement;
        let internal = false;
        try {
          internal = new URL(anchor.href).origin === new URL(base).origin;
        } catch {
          internal = false;
        }
        return {
          href: anchor.href,
          text: (anchor.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 80),
          internal,
          targetBlank: anchor.target === "_blank",
          rel: anchor.getAttribute("rel"),
        };
      });
      const text = document.body?.innerText ?? "";
      const flags: string[] = [];
      const re = /lorem ipsum|\bTODO\b|\bFIXME\b|\[object Object\]|\bNaN\b|\bundefined\b|\bInfinity\b|\bnull\b|\$-?NaN|%NaN/g;
      for (const m of text.matchAll(re)) {
        const i = m.index ?? 0;
        flags.push(text.slice(Math.max(0, i - 40), i + m[0].length + 40).replace(/\s+/g, " "));
        if (flags.length >= 12) break;
      }
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      return {
        title: document.title || null,
        description: attr('meta[name="description"]', "content"),
        canonical: attr('link[rel="canonical"]', "href"),
        robots: attr('meta[name="robots"]', "content"),
        ogTitle: attr('meta[property="og:title"]', "content"),
        ogImage: attr('meta[property="og:image"]', "content"),
        twitterCard: attr('meta[name="twitter:card"]', "content"),
        lang: document.documentElement.getAttribute("lang"),
        viewportMeta: attr('meta[name="viewport"]', "content"),
        h1Text: [...document.querySelectorAll("h1")].map((h) => (h.textContent ?? "").trim().slice(0, 120)),
        jsonLd: { blocks: ld.length, invalid },
        imgs,
        links,
        flags,
        bodyTextLength: text.length,
        overflow: {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        },
        timing: nav
          ? { domContentLoaded: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd) }
          : null,
      };
    }, baseURL);

    Object.assign(record, {
      title: meta.title,
      description: meta.description,
      canonical: meta.canonical,
      robots: meta.robots,
      ogTitle: meta.ogTitle,
      ogImage: meta.ogImage,
      twitterCard: meta.twitterCard,
      lang: meta.lang,
      viewportMeta: meta.viewportMeta,
      h1Count: meta.h1Text.length,
      h1Text: meta.h1Text,
      jsonLd: meta.jsonLd,
      links: meta.links,
      textFlags: meta.flags,
      bodyTextLength: meta.bodyTextLength,
      overflow: { ...meta.overflow, overflows: meta.overflow.scrollWidth > meta.overflow.clientWidth + 1 },
      timing: meta.timing ? { ...meta.timing, transferBytes, scriptBytes } : undefined,
    });
    record.images = meta.imgs.map((img) => {
      const rm = responseMeta.get(img.src);
      return { ...img, bytes: rm?.bytes, contentType: rm?.contentType };
    });
    record.hydration = [...consoleErrors, ...pageErrors.map((t) => ({ text: t }))]
      .map((e) => e.text)
      .filter((t) => /hydrat|did not match|does not match|Text content|Expected server HTML|Minified React error #(418|419|420|421|422|423|425|426|427|428|429|430|431|432)/i.test(t));

    if (AXE_WIDTHS.has(width)) {
      try {
        const results = await new AxeBuilder({ page }).analyze();
        record.axe = results.violations.map((v) => ({
          id: v.id,
          impact: v.impact ?? null,
          help: v.help,
          nodes: v.nodes.length,
          targets: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
        }));
      } catch (e) {
        record.axeError = e instanceof Error ? e.message : String(e);
      }
    }

    const dir = path.join(OUT, String(width));
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${slugFor(pathname)}.jpg`);
    await page.screenshot({ path: file, fullPage: true, type: "jpeg", quality: 60, timeout: 60_000 }).catch(() => {});
    record.screenshot = path.relative(process.cwd(), file);
  } catch (e) {
    record.error = e instanceof Error ? `${e.name}: ${e.message}`.slice(0, 500) : String(e);
  } finally {
    record.durationMs = Date.now() - started;
    await page.close().catch(() => {});
  }
  return record;
}

async function auditAssets(context: BrowserContext, baseURL: string): Promise<void> {
  const out = path.join(OUT, "assets.jsonl");
  for (const route of ASSET_ROUTES) {
    const started = Date.now();
    try {
      const res = await context.request.get(baseURL + route, { maxRedirects: 5, timeout: 30_000 });
      const body = await res.body();
      fs.appendFileSync(
        out,
        JSON.stringify({
          path: route,
          status: res.status(),
          contentType: res.headers()["content-type"] ?? null,
          bytes: body.length,
          durationMs: Date.now() - started,
        }) + "\n",
      );
    } catch (e) {
      fs.appendFileSync(out, JSON.stringify({ path: route, error: String(e) }) + "\n");
    }
  }
}

async function newAuditContext(browser: Browser, width: number, colorScheme: "light" | "dark" = "light") {
  return browser.newContext({
    viewport: { width, height: width < 700 ? 812 : width < 1000 ? 1024 : 900 },
    deviceScaleFactor: 1,
    isMobile: width < 700,
    hasTouch: width < 700,
    reducedMotion: "reduce",
    colorScheme,
    locale: "en-US",
    timezoneId: "America/New_York",
    ...(STORAGE_STATE ? { storageState: STORAGE_STATE } : {}),
  });
}

test.describe.configure({ mode: "parallel" });

for (const width of WIDTHS) {
  test(`crawl every route at ${width}px as ${ROLE}`, async ({ browser, baseURL }) => {
    const base = (baseURL ?? "http://127.0.0.1:3100").replace(/\/$/, "");
    fs.mkdirSync(OUT, { recursive: true });
    const context = await newAuditContext(browser, width);
    const routes = await discoverRoutes(context, base);
    const out = path.join(OUT, "pages.jsonl");
    let index = 0;
    for (const route of routes) {
      const record = await auditPage(context, base, route, width, index === 0);
      fs.appendFileSync(out, JSON.stringify(record) + "\n");
      index += 1;
    }
    if (width === WIDTHS[0]) await auditAssets(context, base);
    await context.close();
  });
}

test(`dark-scheme emulation sanity as ${ROLE}`, async ({ browser, baseURL }) => {
  const base = (baseURL ?? "http://127.0.0.1:3100").replace(/\/$/, "");
  const pages = ROUTE_MODE === "private" ? ["/dashboard", "/dashboard/new", "/settings"] : ["/", "/analyze", "/pricing", "/methodology", "/blog", "/tools"];
  const out = path.join(OUT, "dark-scheme.jsonl");
  fs.mkdirSync(OUT, { recursive: true });
  for (const width of [375, 1280]) {
    const context = await newAuditContext(browser, width, "dark");
    for (const p of pages) {
      const page = await context.newPage();
      try {
        await page.goto(base + p, { waitUntil: "load", timeout: 60_000 });
        await page.waitForTimeout(500);
        const probe = await page.evaluate(() => ({
          htmlClass: document.documentElement.className,
          bodyBg: getComputedStyle(document.body).backgroundColor,
          bodyColor: getComputedStyle(document.body).color,
          colorSchemeMeta: document.querySelector('meta[name="color-scheme"]')?.getAttribute("content") ?? null,
        }));
        const dir = path.join(OUT, "dark", String(width));
        fs.mkdirSync(dir, { recursive: true });
        await page.screenshot({ path: path.join(dir, `${slugFor(p)}.jpg`), type: "jpeg", quality: 60 }).catch(() => {});
        fs.appendFileSync(out, JSON.stringify({ path: p, width, ...probe }) + "\n");
      } catch (e) {
        fs.appendFileSync(out, JSON.stringify({ path: p, width, error: String(e) }) + "\n");
      } finally {
        await page.close();
      }
    }
    await context.close();
  }
});
