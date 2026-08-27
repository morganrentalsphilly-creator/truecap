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

describe("per-client buy boxes actually scope screening (audit regression)", () => {
  // The tier is SOLD on "deals screened to each client's criteria". Before this,
  // user_buy_boxes.client_id was written by two UI paths and read by ZERO
  // evaluation sites — so every buyer's box screened every deal, and one
  // client's criteria drove the verdict and MAO on unrelated deals.
  it("lib/buy-box exports the scoping helper", () => {
    const src = read("lib/buy-box.ts");
    expect(src).toContain("export function boxesForDealClient");
    // An unassigned box is the agent's own and applies everywhere.
    expect(src).toMatch(/b\.clientId == null \|\| b\.clientId === dealClientId/);
  });

  it.each([
    ["the deal list offer line", "lib/deal-offer-line.ts"],
    ["the deal workspace", "app/dashboard/saved-analyses/[id]/page.tsx"],
    ["the list fit badge + filter", "components/investcalc/saved-analyses-page-v2.tsx"],
  ])("%s scopes boxes to the deal's client", (_label, file) => {
    expect(read(file)).toContain("boxesForDealClient");
  });

  it("the list page passes the deal's client into the offer line", () => {
    expect(read("app/dashboard/saved-analyses/page.tsx")).toMatch(/dealClientId: row\.client_id/);
  });
});

describe("client-scoped list and portal cannot disagree (audit regression)", () => {
  it("the roster count is capped by the portal's own limit", () => {
    const src = read("app/actions/agent-clients.ts");
    expect(src).toContain("PORTAL_DEAL_LIMIT");
  });

  it("a client-scoped list ignores persisted session filters", () => {
    // Replaying a stale search on a fresh "show me Dana's deals" intent
    // silently re-created the empty-list bug. A URL-backed explicit search is
    // the same fresh retrieval intent and also bypasses the persisted view.
    expect(read("components/investcalc/saved-analyses-page-v2.tsx")).toMatch(
      /if \(clientFilterId \|\| explicitSearchQuery\) \{\s*\n\s*setViewHydrated\(true\);\s*\n\s*return;/,
    );
  });
});

describe("destructive client delete is confirmed on BOTH roster surfaces", () => {
  it.each([
    ["clients workspace", "components/investcalc/clients-workspace.tsx"],
    ["settings card", "components/settings/agent-clients-card.tsx"],
  ])("%s confirms before deleting", (_label, file) => {
    expect(read(file)).toContain("window.confirm");
  });
});

describe("setting a client's buy box has a visible payoff (the $59.99 case)", () => {
  // Before this, an agent could set per-client criteria and NOTHING anywhere
  // reflected it — not the portal the buyer opens, not the roster the agent
  // manages. The feature was unjustifiable at any price.
  it("the portal tells the buyer WHAT they were screened against", () => {
    const src = read("lib/client-portal.ts");
    expect(src).toContain("criteriaSummary");
    expect(src).toContain("summarizeBuyBoxCriteria");
  });

  it("the portal marks each deal as meeting or missing those criteria", () => {
    const portal = read("lib/client-portal.ts");
    expect(portal).toContain("meetsCriteria");
    // …scoped to THIS client, never the agent's other buyers.
    expect(portal).toContain('.eq("client_id", clientId)');
    expect(portal).toContain("evaluateBuyBoxes(clientBoxes, metrics)");
    const page = read("app/portal/[token]/page.tsx");
    expect(page).toContain("Meets your criteria");
  });

  it("the roster tells the agent how many of each client's deals clear the bar", () => {
    expect(read("app/actions/agent-clients.ts")).toContain("meetingCount");
    expect(read("components/investcalc/clients-workspace.tsx")).toMatch(/meet their criteria/);
  });

  it("criteria are summarized from the shared lib, not duplicated per surface", () => {
    // The settings card and the public portal must describe a box identically.
    expect(read("lib/buy-box.ts")).toContain("export function summarizeBuyBoxCriteria");
    expect(read("components/settings/buy-boxes-card.tsx")).toContain("summarizeBuyBoxCriteria");
  });
});

describe("the portal copy button works (Safari clipboard regression)", () => {
  // The button awaited a server action and THEN wrote to the clipboard. By that
  // point the click's transient user activation had lapsed, so Safari refused
  // the write and the button silently did nothing. The URL must therefore be
  // resolved BEFORE the click.
  it("the Clients page mints portal urls server-side", () => {
    const src = read("app/dashboard/clients/page.tsx");
    expect(src).toContain("mintSignedToken");
    expect(src).toContain("portalUrlByClient");
  });

  it("the copy handler never awaits before writing to the clipboard", () => {
    const src = read("components/investcalc/clients-workspace.tsx");
    const start = src.indexOf("const copyPortal");
    expect(start).toBeGreaterThan(-1);
    // Bound the slice at the NEXT top-level declaration, not a brittle "\n  };"
    // marker — the handler's shape changes as it is hardened.
    const after = src.slice(start + 10);
    const nextDecl = after.search(/\n  (?:const|function|return) /);
    const body = nextDecl === -1 ? after : after.slice(0, nextDecl);
    // Optional-chained (navigator.clipboard?.writeText) — match either form.
    expect(body).toMatch(/navigator\.clipboard\??\.writeText/);
    // An await anywhere before the write reintroduces the bug. Strip comments
    // first — the code carries a comment that says the word "await".
    const code = body
      .split("\n")
      .map((l) => l.replace(/\/\/.*$/, ""))
      .join("\n");
    expect(code).not.toContain("await");
  });

  it("a blocked clipboard still surfaces the url instead of failing silently", () => {
    expect(read("components/investcalc/clients-workspace.tsx")).toContain("setRevealedId");
  });

  it("the settings card no longer ships a second, broken copy button", () => {
    expect(read("components/settings/agent-clients-card.tsx")).not.toContain("clipboard");
  });
});

describe("the paid Agent Pro loop is explicit and measurable", () => {
  it("shows the complete client-to-offer workflow in the Clients workspace", () => {
    const src = read("components/investcalc/clients-workspace.tsx");
    for (const step of [
      "Client",
      "Buy Box",
      "Property",
      "Analysis",
      "Client Report",
      "Follow-Up",
      "Offer",
    ]) {
      expect(src).toContain(`\"${step}\"`);
    }
  });

  it("lets an assigned deal share a client report without returning to the analyzer", () => {
    const src = read("app/dashboard/saved-analyses/[id]/page.tsx");
    expect(src).toContain("ShareLinkButton");
    expect(src).toContain('"client-report"');
  });

  it("fires only coarse, already-declared funnel events for roster and report actions", () => {
    expect(read("components/investcalc/clients-workspace.tsx")).toContain(
      'trackEvent("agent_client_created", { source: "clients_workspace" })'
    );
    expect(read("components/settings/agent-clients-card.tsx")).toContain(
      'trackEvent("agent_client_created", { source: "settings" })'
    );
    expect(read("components/investcalc/share-link-button.tsx")).toContain(
      'trackEvent("client_report_shared", { report_type: "analysis_link" })'
    );
  });
});
