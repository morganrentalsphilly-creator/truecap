/**
 * AGENT PRO WORKFLOW INVARIANTS.
 *
 * A 2026-08-11 audit found the tier's loop broken in ways that all shared one
 * root cause: the three surfaces that answer "which deals belong to this
 * client?" each applied DIFFERENT filters. The roster card counted one set,
 * the buyer's portal listed another, and the agent's own filtered list showed a
 * third — so "3 deals assigned" could open an empty page, and a success toast
 * could promise a portal appearance that never happened.
 *
 * The rule these tests lock in: ASSIGNMENT IS THE SINGLE SOURCE OF TRUTH.
 * A deal is on a client's portal iff client_id points at them and it isn't
 * deleted. No lifecycle flag (is_archived / is_completed) may narrow ANY of the
 * three surfaces, because archive_stale_saved_analyses() sets is_archived
 * automatically after 60 days — which would silently empty a buyer's
 * bookmarked portal.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

const portalSrc = read("lib/client-portal.ts");
const clientsActionSrc = read("app/actions/agent-clients.ts");
const listPageSrc = read("app/dashboard/saved-analyses/page.tsx");

/** The saved_analyses query inside loadClientPortal. */
function portalQuery(): string {
  const i = portalSrc.indexOf('.from("saved_analyses")');
  expect(i, "portal query not found — did loadClientPortal move?").toBeGreaterThan(-1);
  return portalSrc.slice(i, i + 500);
}

/** The saved_analyses query inside listClientDealCountsAction. */
function countQuery(): string {
  const start = clientsActionSrc.indexOf("listClientDealCountsAction");
  expect(start, "count action not found").toBeGreaterThan(-1);
  const i = clientsActionSrc.indexOf('.from("saved_analyses")', start);
  expect(i, "count query not found").toBeGreaterThan(-1);
  return clientsActionSrc.slice(i, i + 500);
}

describe("the portal shows exactly what was assigned", () => {
  it("scopes to the agent, the client, and non-deleted rows", () => {
    const q = portalQuery();
    expect(q).toContain('.eq("user_id"');
    expect(q).toContain('.eq("client_id"');
    expect(q).toContain('.is("deleted_at", null)');
  });

  it("does NOT filter on is_archived — the 60-day cron would empty a live portal", () => {
    expect(portalQuery()).not.toContain('is_archived');
  });

  it("does NOT filter on is_completed — a closed deal stays on the buyer's record", () => {
    expect(portalQuery()).not.toContain('is_completed');
  });
});

describe("the roster count matches the portal", () => {
  it("uses the same non-deleted, assigned scope", () => {
    const q = countQuery();
    expect(q).toContain('.is("deleted_at", null)');
    expect(q).toContain('.not("client_id", "is", null)');
  });

  it("applies no lifecycle narrowing the portal doesn't", () => {
    const q = countQuery();
    expect(q).not.toContain('is_archived');
    expect(q).not.toContain('is_completed');
  });
});

describe("a client-scoped deal list isn't narrowed by the default state filter", () => {
  it("skips lifecycle filtering when clientFilterId is set", () => {
    // Otherwise "3 deals assigned" opens a list showing only the active ones.
    expect(listPageSrc).toMatch(/if \(clientFilterId\) \{[\s\S]{0,200}\} else if \(activeDealStateFilter === "active"\)/);
  });

  it("validates ?client= against the caller's own roster before querying", () => {
    // A raw URL param must never reach the query — it would be an IDOR probe.
    expect(listPageSrc).toMatch(/agentClients\.some\(\(c\) => c\.id === requestedClient\)/);
  });
});

describe("client_id never sits in the select-fallback floor", () => {
  // This bug was made TWICE during the build — once per page. Both ladders are
  // pinned here. The rule: a column from the newest migration goes on the
  // FULLEST select (dropped first), never on the base (which would make every
  // rung fail on an un-migrated deployment and take the page down for all users).
  it("the deal WORKSPACE's DEAL_SELECT omits client_id", () => {
    const src = read("app/dashboard/saved-analyses/[id]/page.tsx");
    const base = src.slice(src.indexOf("const DEAL_SELECT"), src.indexOf("/**", src.indexOf("const DEAL_SELECT")));
    expect(base).not.toContain("client_id");
  });

  it("the deal WORKSPACE requests client_id only on its fullest select", () => {
    const src = read("app/dashboard/saved-analyses/[id]/page.tsx");
    expect(src).toMatch(/close_date, client_id/);
    // …and falls back to the same columns without it.
    expect(src).toMatch(/const fullNoClient = await run\(`\$\{WITH_LABELS_SELECT\}, close_date`\)/);
  });

  it("BASE_SELECT omits client_id so an un-migrated deployment still lists deals", () => {
    // BASE_SELECT is the last rung of the isMissingColumn ladder. Putting a
    // newest-migration column there makes EVERY rung fail — taking the deals
    // page down for every user, not just agents.
    const base = listPageSrc.slice(listPageSrc.indexOf("const BASE_SELECT"), listPageSrc.indexOf("const WITH_SCENARIO_SELECT"));
    expect(base).not.toContain("client_id");
  });

  it("client_id is on the fullest select, dropped first on a column error", () => {
    expect(listPageSrc).toMatch(/const FULL_SELECT = `\$\{WITH_CLOSE_DATE_SELECT\}, client_id`/);
  });
});

describe("assignment is reachable from both surfaces an agent works in", () => {
  it("the deal LIST can assign a client", () => {
    const src = read("components/investcalc/saved-analyses-page-v2.tsx");
    expect(src).toContain("DealClientPicker");
    expect(src).toContain("setSavedDealClientAction");
  });

  it("the deal WORKSPACE can assign a client (the screen Morgan named)", () => {
    const src = read("app/dashboard/saved-analyses/[id]/page.tsx");
    expect(src).toContain("DealClientSelect");
    expect(src).toContain("client_id");
  });
});
