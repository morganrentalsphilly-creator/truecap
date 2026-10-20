/**
 * The Phase 6 render harness: renders signed-in surfaces with mock data to
 * static HTML beside the built stylesheet, because the founder's machine has
 * no local Supabase to sign in against (the signed-in e2e specs run in CI).
 *
 *   cp .next/static/css/<main>.css <out>/app.css
 *   HARNESS_OUT=<out> npx vitest run docs/overhaul-2026-10/tools/render-harness.test.tsx
 *   node docs/overhaul-2026-10/tools/static-shot.mjs <out> shell
 *   node docs/overhaul-2026-10/tools/static-shot.mjs <out> login
 *
 * Skipped unless HARNESS_OUT is set, so `npm test` never runs it. The page
 * loads Hanken Grotesk and Geist Mono from Google Fonts in place of the
 * next/font classes, and the logo image does not resolve from a file URL;
 * everything else is the production CSS.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createElement, Suspense } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { it, vi } from "vitest";
import { Briefcase, TrendingUp } from "lucide-react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/saved-analyses",
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));

const OUT = process.env.HARNESS_OUT;
const page = (body: string) =>
  `<!doctype html><html lang="en" style="--font-sans-variable:'Hanken Grotesk';--font-mono-variable:'Geist Mono'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@300..800&family=Geist+Mono:wght@400;500&display=swap"><link rel="stylesheet" href="app.css"></head><body class="font-sans">${body}</body></html>`;

it.skipIf(!OUT)("renders the dashboard shell with a stat grid", async () => {
  const { DashboardShell } = await import("@/components/dashboard/dashboard-shell");
  const { StatCard } = await import("@/components/dashboard/StatCard");
  const { Topbar } = await import("@/components/dashboard/Topbar");
  mkdirSync(OUT!, { recursive: true });
  const body = createElement(
    "div",
    { className: "min-w-0 flex-1" },
    createElement(Topbar as never, { user: { email: "you@example.com" }, activeDealCount: 12 } as never),
    createElement(
      "main",
      { id: "main", className: "mx-auto w-full max-w-6xl px-4 py-6 sm:px-6" },
      createElement("h1", { className: "font-display text-section-sm text-foreground sm:text-section" }, "My Deals"),
      createElement(
        "div",
        { className: "mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" },
        createElement(StatCard, { label: "Active deals", value: "12", change: 8, changeLabel: "vs last month", icon: Briefcase, spark: [], tone: "primary" }),
        createElement(StatCard, { label: "Avg cash flow", value: "$412/mo", change: -3, changeLabel: "vs last month", icon: TrendingUp, spark: [], tone: "success" }),
        createElement(StatCard, { label: "Avg DSCR", value: "1.28", change: null, changeLabel: "across saved deals", icon: TrendingUp, spark: [], tone: "gold", badge: "Pro" }),
        createElement(StatCard, { label: "Offer ceilings found", value: "9", change: 2, changeLabel: "this week", icon: TrendingUp, spark: [], tone: "violet" }),
      ),
    ),
  );
  const html = renderToStaticMarkup(
    createElement(
      DashboardShell as never,
      { activeDealCount: 12, navAccess: { dashboard: true, overview: true, myDeals: true, compareDeals: true, templates: true, clients: true } } as never,
      body,
    ),
  );
  writeFileSync(`${OUT}/shell.html`, page(html));
});

it.skipIf(!OUT)("renders the login screen", async () => {
  const { AuthShell } = await import("@/components/auth/auth-shell");
  const { LoginForm } = await import("@/components/auth/login-form");
  mkdirSync(OUT!, { recursive: true });
  const html = renderToStaticMarkup(
    createElement(
      AuthShell as never,
      { title: "Welcome back", description: "Sign in to access your saved deals, Pro tools, and personalized insights." } as never,
      createElement(Suspense, null, createElement(LoginForm)),
    ),
  );
  writeFileSync(`${OUT}/login.html`, page(html));
});
