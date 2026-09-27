import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  CLI_FLAGS,
  FIRST_TOUCH_SOURCES,
  LANDING_SECTIONS as SCRIPT_SECTIONS,
  ORGANIC_SOURCES,
  SECTION_ROOTS,
  classifyUser,
  groupSignups,
  reconcileRows,
  runSignups,
  summaryLines,
  windowFor,
  type FetchLike,
} from "../../seo/scripts/signups.ts";
import {
  FIRST_TOUCH_REFERRAL_SOURCES,
  LANDING_SECTIONS,
  ORGANIC_FIRST_TOUCH_SOURCES,
} from "@/lib/first-touch";
import {
  organicSignupWeeks,
  organicSignupWindowStart,
  summarizeOrganicSignups,
} from "@/lib/seo/control-plane/signups";

/**
 * seo/scripts/signups.ts counts organic sign-ups by landing section into the
 * private seo_conversions_daily table; /admin/seo is the only reader. No
 * network: every fetch is a stub. Counts must never reach a public surface.
 */

const ROOT = path.resolve(__dirname, "../..");
const NOW = Date.parse("2026-09-27T12:00:00.000Z");
const WINDOW = windowFor(35, NOW);
const KEY = "service-role-key-for-tests-0123456789";

function user(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "u-1",
    email: "person@example.com",
    created_at: "2026-09-20T10:00:00Z",
    email_confirmed_at: "2026-09-20T10:05:00Z",
    app_metadata: { provider: "email", tc_first_touch: { source: "organic_search", section: "blog", v: 1 } },
    ...over,
  };
}

describe("mirrors of lib/first-touch.ts (plain node cannot import the app)", () => {
  it("matches the taxonomy, the organic subset and the sections exactly", () => {
    expect([...FIRST_TOUCH_SOURCES]).toEqual([...FIRST_TOUCH_REFERRAL_SOURCES]);
    expect([...ORGANIC_SOURCES]).toEqual([...ORGANIC_FIRST_TOUCH_SOURCES]);
    expect([...SCRIPT_SECTIONS]).toEqual([...LANDING_SECTIONS]);
    expect(Object.keys(SECTION_ROOTS).sort()).toEqual([...LANDING_SECTIONS].sort());
    const roots = Object.values(SECTION_ROOTS);
    expect(new Set(roots).size).toBe(roots.length);
    expect(SECTION_ROOTS.home).toBe("/");
    expect(SECTION_ROOTS.blog).toBe("/blog");
  });
});

describe("classifyUser", () => {
  const ctx = { window: WINDOW, demoIds: new Set(["demo-1"]) };
  const outcome = (u: unknown) => {
    const r = classifyUser(u, ctx);
    return r.status === "counted" ? `counted:${r.date}:${r.section}` : r.reason;
  };

  it("counts a confirmed organic sign-up on its UTC creation date", () => {
    expect(outcome(user())).toBe("counted:2026-09-20:blog");
    expect(outcome(user({ created_at: "2026-09-20T23:30:00-05:00" }))).toBe("counted:2026-09-21:blog");
    expect(outcome(user({ app_metadata: { tc_first_touch: { source: "organic_ai", section: "home", v: 1 } } }))).toBe("counted:2026-09-20:home");
  });

  it("counts Google sign-ups (provider google) without email_confirmed_at", () => {
    expect(outcome(user({ email_confirmed_at: null, app_metadata: { provider: "google", tc_first_touch: { source: "organic_search", section: "tools", v: 1 } } }))).toBe("counted:2026-09-20:tools");
    expect(outcome(user({ email_confirmed_at: null, app_metadata: { provider: "email", providers: ["email", "google"], tc_first_touch: { source: "organic_search", section: "vs", v: 1 } } }))).toBe("counted:2026-09-20:vs");
  });

  it.each([
    ["unconfirmed email", user({ email_confirmed_at: null }), "unconfirmed"],
    ["anonymous", user({ is_anonymous: true }), "unconfirmed"],
    ["demo account", user({ id: "demo-1" }), "demo"],
    ["before the window", user({ created_at: "2026-08-23T23:59:59Z" }), "outside_window"],
    ["in the future", user({ created_at: "2026-09-28T00:00:01Z" }), "outside_window"],
    ["no first touch (no consent)", user({ app_metadata: { provider: "email" } }), "no_first_touch"],
    ["user_metadata is not trusted", user({ app_metadata: {}, user_metadata: { tc_first_touch: { source: "organic_search", section: "blog", v: 1 } } }), "no_first_touch"],
    ["paid", user({ app_metadata: { tc_first_touch: { source: "paid_search", section: "blog", v: 1 } } }), "not_organic"],
    ["organic social is not search/AI", user({ app_metadata: { tc_first_touch: { source: "organic_social", section: "blog", v: 1 } } }), "not_organic"],
    ["unknown source", user({ app_metadata: { tc_first_touch: { source: "google_oauth", section: "blog", v: 1 } } }), "no_first_touch"],
    ["raw path as section", user({ app_metadata: { tc_first_touch: { source: "organic_search", section: "/blog/x", v: 1 } } }), "no_first_touch"],
    ["wrong version", user({ app_metadata: { tc_first_touch: { source: "organic_search", section: "blog" } } }), "no_first_touch"],
    ["no created_at", user({ created_at: undefined }), "invalid"],
    ["garbage", null, "invalid"],
  ])("skips %s", (_label, u, reason) => {
    expect(outcome(u)).toBe(reason);
  });
});

describe("groupSignups and reconcileRows", () => {
  it("emits one row per (date, section) with the section's root as landing_page", () => {
    expect(
      groupSignups([
        { date: "2026-09-02", section: "tools" },
        { date: "2026-09-01", section: "home" },
        { date: "2026-09-01", section: "blog" },
        { date: "2026-09-01", section: "blog" },
        { date: "2026-09-01", section: "other" },
        { date: "2026-09-01", section: "../../etc" },
      ]),
    ).toEqual([
      { date: "2026-09-01", landing_page: "/blog", page_type: "blog", topic_cluster: "organic", event_name: "signup_completed", conversions: 2 },
      { date: "2026-09-01", landing_page: "/", page_type: "home", topic_cluster: "organic", event_name: "signup_completed", conversions: 1 },
      { date: "2026-09-01", landing_page: "(other)", page_type: "other", topic_cluster: "organic", event_name: "signup_completed", conversions: 1 },
      { date: "2026-09-02", landing_page: "/tools", page_type: "tools", topic_cluster: "organic", event_name: "signup_completed", conversions: 1 },
    ]);
  });

  it("zeroes a stored row that no longer has a count, and keeps fresh counts", () => {
    const fresh = groupSignups([{ date: "2026-09-01", section: "blog" }]);
    const { rows, zeroed } = reconcileRows(fresh, [
      { date: "2026-09-01", landing_page: "/blog", page_type: "blog" },
      { date: "2026-09-03", landing_page: "/", page_type: "home" },
    ]);
    expect(zeroed).toBe(1);
    expect(rows).toEqual([
      fresh[0],
      { date: "2026-09-03", landing_page: "/", page_type: "home", topic_cluster: "organic", event_name: "signup_completed", conversions: 0 },
    ]);
  });
});

type Call = { method: string; url: URL; headers: Record<string, string>; body: unknown };

function stubSupabase(options: {
  users: unknown[];
  demo?: unknown;
  demoStatus?: number;
  stored?: unknown[];
  failUsers?: number;
}): { fetch: FetchLike; calls: Call[] } {
  const calls: Call[] = [];
  const fetch: FetchLike = async (url, init) => {
    const parsed = new URL(url);
    calls.push({
      method: init?.method ?? "GET",
      url: parsed,
      headers: Object.fromEntries(Object.entries((init?.headers ?? {}) as Record<string, string>)),
      body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
    });
    if (parsed.pathname === "/auth/v1/admin/users") {
      if (options.failUsers) return new Response(JSON.stringify({ code: "not_admin", message: `secret ${KEY}` }), { status: options.failUsers });
      const page = Number(parsed.searchParams.get("page"));
      const perPage = Number(parsed.searchParams.get("per_page"));
      return new Response(JSON.stringify({ users: options.users.slice((page - 1) * perPage, page * perPage) }), { status: 200 });
    }
    if (parsed.pathname === "/rest/v1/demo_accounts") {
      return new Response(JSON.stringify(options.demo ?? []), { status: options.demoStatus ?? 200 });
    }
    if (parsed.pathname === "/rest/v1/seo_conversions_daily" && (init?.method ?? "GET") === "GET") {
      return new Response(JSON.stringify(options.stored ?? []), { status: 200 });
    }
    return new Response(null, { status: 201 });
  };
  return { fetch, calls };
}

describe("runSignups against a stubbed Supabase", () => {
  const sb = (fetch: FetchLike) => ({ base: "https://project.supabase.example", key: KEY, fetch });

  it("reads users, demo accounts and stored rows with the service role, then upserts the counts", async () => {
    const stub = stubSupabase({
      users: [
        user(),
        user({ id: "u-2", created_at: "2026-09-20T11:00:00Z" }),
        user({ id: "u-3", app_metadata: { tc_first_touch: { source: "organic_ai", section: "tools", v: 1 } } }),
        user({ id: "demo-1" }),
        user({ id: "u-4", app_metadata: { tc_first_touch: { source: "paid_search", section: "home", v: 1 } } }),
      ],
      demo: [{ user_id: "demo-1" }],
      stored: [{ date: "2026-09-10", landing_page: "/markets", page_type: "markets" }],
    });
    const summary = await runSignups({ sb: sb(stub.fetch), days: 35, nowMs: NOW, dryRun: false });
    expect(summary).toMatchObject({ scanned: 5, counted: 3, rows: 3, zeroed: 1, bySection: { blog: 2, tools: 1 } });
    expect(summary.skipped).toMatchObject({ demo: 1, not_organic: 1 });

    for (const call of stub.calls) {
      expect(call.headers.apikey).toBe(KEY);
      expect(call.headers.authorization).toBe(`Bearer ${KEY}`);
    }
    const read = stub.calls.find((c) => c.method === "GET" && c.url.pathname === "/rest/v1/seo_conversions_daily");
    expect(read?.url.searchParams.getAll("date")).toEqual(["gte.2026-08-24", "lte.2026-09-27"]);
    expect(read?.url.searchParams.get("event_name")).toBe("eq.signup_completed");
    expect(read?.url.searchParams.get("topic_cluster")).toBe("eq.organic");

    const posts = stub.calls.filter((c) => c.method === "POST");
    expect(posts).toHaveLength(1);
    expect(posts[0].url.pathname).toBe("/rest/v1/seo_conversions_daily");
    expect(posts[0].url.searchParams.get("on_conflict")).toBe("date,landing_page,event_name");
    expect(posts[0].headers.prefer).toBe("resolution=merge-duplicates,return=minimal");
    expect(posts[0].body).toEqual([
      { date: "2026-09-20", landing_page: "/blog", page_type: "blog", topic_cluster: "organic", event_name: "signup_completed", conversions: 2 },
      { date: "2026-09-20", landing_page: "/tools", page_type: "tools", topic_cluster: "organic", event_name: "signup_completed", conversions: 1 },
      { date: "2026-09-10", landing_page: "/markets", page_type: "markets", topic_cluster: "organic", event_name: "signup_completed", conversions: 0 },
    ]);
    // Nothing identifying is written: no email, no id, no user field.
    const written = JSON.stringify(posts[0].body);
    expect(written).not.toContain("@");
    expect(written).not.toContain("u-1");
  });

  it("--dry-run reads and counts but sends no write", async () => {
    const stub = stubSupabase({ users: [user()] });
    const summary = await runSignups({ sb: sb(stub.fetch), days: 35, nowMs: NOW, dryRun: true });
    expect(summary).toMatchObject({ counted: 1, rows: 1, dryRun: true });
    expect(stub.calls.every((c) => c.method === "GET")).toBe(true);
  });

  it("pages through every auth user (all or nothing)", async () => {
    const many = Array.from({ length: 1003 }, (_, i) => user({ id: `u-${i}`, app_metadata: {} }));
    const stub = stubSupabase({ users: many });
    const summary = await runSignups({ sb: sb(stub.fetch), days: 35, nowMs: NOW, dryRun: true });
    expect(summary.scanned).toBe(1003);
    expect(stub.calls.filter((c) => c.url.pathname === "/auth/v1/admin/users").map((c) => c.url.searchParams.get("page"))).toEqual(["1", "2"]);
  });

  it("treats a missing demo_accounts table as no demo accounts, but fails on any other error without leaking the key", async () => {
    const missing = stubSupabase({ users: [user()], demoStatus: 404, demo: { code: "PGRST205" } });
    await expect(runSignups({ sb: sb(missing.fetch), days: 35, nowMs: NOW, dryRun: true })).resolves.toMatchObject({ counted: 1 });

    const denied = stubSupabase({ users: [user()], failUsers: 403 });
    const error = await runSignups({ sb: sb(denied.fetch), days: 35, nowMs: NOW, dryRun: false }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("auth admin user list failed (HTTP 403, not_admin)");
    expect((error as Error).message).not.toContain(KEY);
    expect(denied.calls.some((c) => c.method === "POST")).toBe(false);
  });
});

describe("output", () => {
  const summary = {
    window: WINDOW,
    scanned: 4_321,
    counted: 87,
    skipped: { invalid: 0, outside_window: 3_900, unconfirmed: 12, demo: 2, no_first_touch: 300, not_organic: 20 },
    bySection: { blog: 61, tools: 26 },
    rows: 40,
    zeroed: 3,
    dryRun: false,
  };

  it("prints counts only locally, never an email or id", () => {
    const text = summaryLines(summary, { redact: false }).join("\n");
    expect(text).toContain("scanned 4321 accounts; counted 87 organic");
    expect(text).toContain("organic by section: blog 61, tools 26");
    expect(text).not.toMatch(/@|u-\d/);
  });

  it("prints no count at all on a public runner", () => {
    const [windowLine, ...rest] = summaryLines(summary, { redact: true });
    expect(windowLine).toBe("signups: window 2026-08-24..2026-09-27 (35 UTC days)");
    expect(rest.join("\n")).not.toMatch(/\d/);
    expect(rest.join("\n")).toContain("/admin/seo");
    const dry = summaryLines({ ...summary, dryRun: true }, { redact: true }).slice(1).join("\n");
    expect(dry).not.toMatch(/\d/);
  });

  it("declares its flags", () => {
    expect([...CLI_FLAGS].sort()).toEqual(["days", "dry-run"]);
    const source = readFileSync(path.join(ROOT, "seo/scripts/signups.ts"), "utf8");
    expect(source).toContain('process.env.GITHUB_ACTIONS === "true"');
  });
});

describe("workflow wiring", () => {
  const yaml = createRequire(path.join(ROOT, "package.json"))("js-yaml") as { load(text: string): unknown };
  type Step = { name?: string; run?: string; if?: string; "continue-on-error"?: boolean };
  const load = (name: string) =>
    yaml.load(readFileSync(path.join(ROOT, ".github", "workflows", `${name}.yml`), "utf8")) as { jobs: Record<string, { env?: Record<string, string>; steps: Step[] }> };

  it("runs signups.ts --days 35 after the decision cycle, never failing the job", () => {
    const cycle = load("seo-control-plane").jobs.cycle;
    const steps = cycle.steps;
    const decision = steps.findIndex((s) => s.run?.includes("scripts/seo/control-plane.mjs"));
    const signups = steps.findIndex((s) => s.run?.includes("node seo/scripts/signups.ts --days 35"));
    expect(decision).toBeGreaterThan(-1);
    expect(signups).toBeGreaterThan(decision);
    const step = steps[signups];
    expect(step["continue-on-error"]).toBe(true);
    expect(step.run).toMatch(/\|\|\s*echo "::warning/);
    expect(step.if).toBe("always()");
    // The only credential it needs is already the job's.
    expect(cycle.env?.SUPABASE_SERVICE_ROLE_KEY).toContain("secrets.SEO_SUPABASE_SERVICE_ROLE_KEY");
    // Setup-node precedes it (plain node runs the .ts toolkit).
    expect(steps.findIndex((s) => (s as { uses?: string }).uses?.startsWith("actions/setup-node"))).toBeLessThan(signups);
  });

  it("never gives the Supabase service role to the weekly loop or any Claude step", () => {
    for (const name of ["seo-weekly", "seo-deployed", "seo-shepherd", "seo-pause"]) {
      const text = readFileSync(path.join(ROOT, ".github", "workflows", `${name}.yml`), "utf8");
      // (seo-weekly's build step carries only the CI placeholder value.)
      expect(text, name).not.toMatch(/secrets\.[A-Z_]*SUPABASE/);
      expect(text, name).not.toContain("SEO_SUPABASE");
      expect(text, name).not.toContain("seo/scripts/signups.ts");
    }
  });

  it("never posts counts to the control-plane issue", () => {
    const text = readFileSync(path.join(ROOT, ".github", "workflows", "seo-control-plane.yml"), "utf8");
    const issueStep = text.slice(text.indexOf("- name: Update one control-plane issue"));
    expect(issueStep).not.toMatch(/signup|conversions/i);
  });
});

describe("/admin/seo organic sign-ups summary", () => {
  it("covers four rolling weeks ending today", () => {
    expect(organicSignupWindowStart(NOW)).toBe("2026-08-31");
    expect(organicSignupWeeks(NOW)).toEqual([
      { start: "2026-08-31", end: "2026-09-06" },
      { start: "2026-09-07", end: "2026-09-13" },
      { start: "2026-09-14", end: "2026-09-20" },
      { start: "2026-09-21", end: "2026-09-27" },
    ]);
  });

  it("renders nothing without rows (invisible until useful)", () => {
    expect(summarizeOrganicSignups([], NOW)).toBeNull();
    expect(summarizeOrganicSignups([{ date: "2026-09-20", page_type: "blog", conversions: 0 }], NOW)).toBeNull();
    expect(summarizeOrganicSignups([{ date: "2026-08-01", page_type: "blog", conversions: 4 }], NOW)).toBeNull();
  });

  it("folds rows into weeks by section, largest section first", () => {
    const summary = summarizeOrganicSignups(
      [
        { date: "2026-08-31", page_type: "tools", conversions: 1 },
        { date: "2026-09-20", page_type: "blog", conversions: 2 },
        { date: "2026-09-21", page_type: "blog", conversions: 3 },
        { date: "2026-09-27", page_type: "home", conversions: "1" },
        { date: "2026-08-30", page_type: "blog", conversions: 9 },
      ],
      NOW,
    );
    expect(summary?.sections).toEqual([
      { section: "blog", counts: [0, 0, 2, 3], total: 5 },
      { section: "home", counts: [0, 0, 0, 1], total: 1 },
      { section: "tools", counts: [1, 0, 0, 0], total: 1 },
    ]);
    expect(summary?.weekTotals).toEqual([1, 0, 2, 4]);
    expect(summary?.total).toBe(7);
  });

  it("the page renders the section only when there is a summary, and the card reads the same number", () => {
    const page = readFileSync(path.join(ROOT, "app/admin/seo/page.tsx"), "utf8");
    expect(page).toContain("{data.organicSignups ? (");
    const dashboard = readFileSync(path.join(ROOT, "lib/seo/control-plane/dashboard.ts"), "utf8");
    expect(dashboard).toContain('.from("seo_conversions_daily")');
    expect(dashboard).toContain('.eq("topic_cluster", "organic")');
    expect(dashboard).toContain("signups: organicSignups?.total ?? 0");
  });
});
