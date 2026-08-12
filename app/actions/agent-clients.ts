"use server";

/**
 * Agent Pro client roster — CRUD over agent_clients (see migration
 * 20260811120000_agent_pro_tier.sql).
 *
 * Gated on the `client_buy_box` entitlement, which only the agent_pro plans
 * carry — so every action here is inert for Free/Pro users, and inert for
 * EVERYONE until the migration + Stripe prices exist. A missing table
 * (migration not yet applied) reports MIGRATION_PENDING rather than a 500,
 * mirroring user-buy-boxes.
 *
 * RLS enforces per-agent isolation (owner-only policies ×4); the checks here
 * are for honest error codes, not the security boundary.
 */

import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getEntitlementsForUser, hasPlanFeature } from "@/lib/entitlements";
import { mintSignedToken } from "@/lib/signed-token";
import { PORTAL_SCOPE } from "@/lib/client-portal";
import { getSiteUrl } from "@/lib/site-url";
import { PORTAL_DEAL_LIMIT } from "@/lib/client-portal";

export type AgentClient = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  isArchived: boolean;
  createdAt: string;
};

export type AgentClientsActionResult =
  | { ok: true; clients: AgentClient[] }
  | {
      ok: false;
      code:
        | "SIGN_IN_REQUIRED"
        | "ENTITLEMENT_REQUIRED"
        | "MIGRATION_PENDING"
        | "VALIDATION_ERROR"
        | "LIMIT_REACHED"
        | "NOT_FOUND"
        | "SERVER_ERROR";
      message: string;
    };

const clientSchema = z
  .object({
    /** Present = update; absent = create. */
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1, "Name the client").max(120),
    email: z.string().trim().email().max(254).nullable().optional().or(z.literal("").transform(() => null)),
    phone: z.string().trim().max(40).nullable().optional().or(z.literal("").transform(() => null)),
    notes: z.string().trim().max(2000).nullable().optional().or(z.literal("").transform(() => null)),
    isArchived: z.boolean().default(false),
  })
  .strict();

/** Practical roster ceiling — an agent juggling more than this needs a CRM. */
const MAX_CLIENTS = 100;

type ClientRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  is_archived: boolean | null;
  created_at: string;
};

function mapRow(row: ClientRow): AgentClient {
  return {
    id: row.id,
    name: row.name ?? "Client",
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    isArchived: Boolean(row.is_archived),
    createdAt: row.created_at,
  };
}

/** Postgres "relation does not exist" — the migration hasn't been applied. */
function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  return !!error && (error.code === "42P01" || /relation .* does not exist/i.test(error.message ?? ""));
}

type Gate =
  | { ok: true; supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>; userId: string }
  | { ok: false; result: AgentClientsActionResult };

async function requireAgentPro(): Promise<Gate> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, result: { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." } };

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!hasPlanFeature(entitlements, "client_buy_box")) {
    return {
      ok: false,
      result: {
        ok: false,
        code: "ENTITLEMENT_REQUIRED",
        message: "Client rosters are an Agent Pro feature.",
      },
    };
  }
  return { ok: true, supabase, userId: user.id };
}

async function fetchClients(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string
): Promise<AgentClientsActionResult> {
  const { data, error } = await supabase
    .from("agent_clients")
    .select("id, name, email, phone, notes, is_archived, created_at")
    .eq("agent_user_id", userId)
    .order("is_archived", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    if (isMissingTable(error)) {
      return { ok: false, code: "MIGRATION_PENDING", message: "Client rosters aren't enabled yet." };
    }
    Sentry.captureException(error, { tags: { feature: "agent-clients" } });
    return { ok: false, code: "SERVER_ERROR", message: "Couldn't load your clients. Please try again." };
  }
  return { ok: true, clients: ((data ?? []) as ClientRow[]).map(mapRow) };
}

export async function listAgentClientsAction(): Promise<AgentClientsActionResult> {
  const gate = await requireAgentPro();
  if (!gate.ok) return gate.result;
  return fetchClients(gate.supabase, gate.userId);
}

/** Create (no id) or update (id) a client. Returns the refreshed roster. */
export async function upsertAgentClientAction(input: unknown): Promise<AgentClientsActionResult> {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const gate = await requireAgentPro();
  if (!gate.ok) return gate.result;
  const { supabase, userId } = gate;
  const { id, name, email, phone, notes, isArchived } = parsed.data;

  if (!id) {
    const { count, error: countError } = await supabase
      .from("agent_clients")
      .select("id", { count: "exact", head: true })
      .eq("agent_user_id", userId);
    if (countError && isMissingTable(countError)) {
      return { ok: false, code: "MIGRATION_PENDING", message: "Client rosters aren't enabled yet." };
    }
    if ((count ?? 0) >= MAX_CLIENTS) {
      return { ok: false, code: "LIMIT_REACHED", message: `Rosters cap at ${MAX_CLIENTS} clients.` };
    }
  }

  const row = {
    agent_user_id: userId,
    name,
    email: email ?? null,
    phone: phone ?? null,
    notes: notes ?? null,
    is_archived: isArchived,
    updated_at: new Date().toISOString(),
  };
  const query = id
    ? supabase.from("agent_clients").update(row).eq("id", id).eq("agent_user_id", userId).select("id")
    : supabase.from("agent_clients").insert(row).select("id");
  const { data, error } = await query;
  if (error) {
    if (isMissingTable(error)) {
      return { ok: false, code: "MIGRATION_PENDING", message: "Client rosters aren't enabled yet." };
    }
    Sentry.captureException(error, { tags: { feature: "agent-clients" } });
    return { ok: false, code: "SERVER_ERROR", message: "Couldn't save the client. Please try again." };
  }
  if (id && (data ?? []).length === 0) {
    return { ok: false, code: "NOT_FOUND", message: "That client no longer exists." };
  }
  return fetchClients(supabase, userId);
}

/** Hard delete. Scoped boxes/deals survive unscoped (FK is on delete set null). */
export async function deleteAgentClientAction(input: unknown): Promise<AgentClientsActionResult> {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid client." };
  }
  const gate = await requireAgentPro();
  if (!gate.ok) return gate.result;
  const { supabase, userId } = gate;
  const { error } = await supabase
    .from("agent_clients")
    .delete()
    .eq("id", parsed.data.id)
    .eq("agent_user_id", userId);
  if (error) {
    if (isMissingTable(error)) {
      return { ok: false, code: "MIGRATION_PENDING", message: "Client rosters aren't enabled yet." };
    }
    Sentry.captureException(error, { tags: { feature: "agent-clients" } });
    return { ok: false, code: "SERVER_ERROR", message: "Couldn't delete the client. Please try again." };
  }
  return fetchClients(supabase, userId);
}

/**
 * Mint the public portal link for one client. Gated on `agent_portal` (a
 * strict superset gate over the roster's `client_buy_box`, so a plan that
 * somehow had rosters but not the portal can't leak one). The token is signed
 * (lib/signed-token) so the public page can trust {agentUserId, clientId}
 * without a session; SHARE_LINK_SECRET unset → NOT_CONFIGURED, not a bad link.
 */
export async function getClientPortalLinkAction(
  input: unknown
): Promise<
  | { ok: true; url: string }
  | { ok: false; code: "SIGN_IN_REQUIRED" | "ENTITLEMENT_REQUIRED" | "VALIDATION_ERROR" | "NOT_FOUND" | "NOT_CONFIGURED" | "SERVER_ERROR"; message: string }
> {
  const parsed = z.object({ clientId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR", message: "Invalid client." };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!hasPlanFeature(entitlements, "agent_portal")) {
    return { ok: false, code: "ENTITLEMENT_REQUIRED", message: "The client portal is an Agent Pro feature." };
  }

  // Confirm the client is on THIS agent's roster before minting a link to it.
  const { data: client, error } = await supabase
    .from("agent_clients")
    .select("id")
    .eq("id", parsed.data.clientId)
    .eq("agent_user_id", user.id)
    .maybeSingle();
  if (error) {
    Sentry.captureException(error, { tags: { feature: "agent-clients-portal" } });
    return { ok: false, code: "SERVER_ERROR", message: "Couldn't create the link. Please try again." };
  }
  if (!client) return { ok: false, code: "NOT_FOUND", message: "That client no longer exists." };

  const token = mintSignedToken(PORTAL_SCOPE, { a: user.id, c: parsed.data.clientId });
  if (!token) {
    return { ok: false, code: "NOT_CONFIGURED", message: "Portal links aren't configured on this deployment yet." };
  }
  return { ok: true, url: `${getSiteUrl()}/portal/${token}` };
}

export type ClientDealSummary = {
  clientId: string;
  dealCount: number;
  /** Addresses of the most recent few, for an at-a-glance roster card. */
  recentAddresses: string[];
};

/**
 * How many deals each client currently has assigned, for the roster page.
 * One query for the whole roster — the page must not N+1 per client.
 */
export async function listClientDealCountsAction(): Promise<
  { ok: true; counts: ClientDealSummary[] } | { ok: false; code: string; message: string }
> {
  const gate = await requireAgentPro();
  if (!gate.ok) {
    // gate.result is the error variant by construction; narrow for TS.
    const r = gate.result as { ok: false; code: string; message: string };
    return { ok: false, code: r.code, message: r.message };
  }
  const { supabase, userId } = gate;

  const { data, error } = await supabase
    .from("saved_analyses")
    .select("client_id, address, form_snapshot->>address")
    .eq("user_id", userId)
    .is("deleted_at", null)
    // Same scope as the portal (lib/client-portal) on purpose: the count on
    // this card must equal what the buyer actually sees. Filtering archived
    // here made the card say "2 deals" while the portal showed 3, or say
    // "No deals yet" right after a successful assignment.
    .not("client_id", "is", null)
    .order("created_at", { ascending: false })
    // Bounded like the portal itself so a roster card can never promise more
    // deals than the buyer's page will render.
    .limit(PORTAL_DEAL_LIMIT * 20);

  if (error) {
    if (isMissingTable(error)) return { ok: true, counts: [] };
    Sentry.captureException(error, { tags: { feature: "agent-clients" } });
    return { ok: false, code: "SERVER_ERROR", message: "Couldn't load client deals." };
  }

  const byClient = new Map<string, ClientDealSummary>();
  for (const row of (data ?? []) as { client_id: string | null; address: string | null }[]) {
    if (!row.client_id) continue;
    const entry = byClient.get(row.client_id) ?? { clientId: row.client_id, dealCount: 0, recentAddresses: [] };
    // Cap at what the portal will actually show — the count and the buyer's
    // page must not disagree above the limit.
    if (entry.dealCount < PORTAL_DEAL_LIMIT) entry.dealCount += 1;
    if (entry.recentAddresses.length < 3 && row.address) entry.recentAddresses.push(row.address);
    byClient.set(row.client_id, entry);
  }
  return { ok: true, counts: [...byClient.values()] };
}
