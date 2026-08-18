"use client";

/**
 * The Agent Pro home base: one page where an agent manages buyers, sees how
 * many deals each is carrying, and hands out portal links.
 *
 * Why this page exists: the roster was buried in Settings, deals could not be
 * assigned to a client at all, and the portal link was a bare icon on a
 * settings row — so the tier's whole reason for existing was undiscoverable.
 * This page is the spine: add a buyer → set their criteria → assign deals →
 * send the portal. Each card states the next step when a piece is missing,
 * rather than leaving the agent to infer it.
 */

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { Check, ExternalLink, Link as LinkIcon, Plus, Trash2, Users } from "lucide-react";
import {
  deleteAgentClientAction,
  upsertAgentClientAction,
  type AgentClient,
  type ClientDealSummary,
} from "@/app/actions/agent-clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";

type Editor = { id?: string; name: string; email: string; phone: string };

const AGENT_WORKFLOW_STEPS = [
  "Client",
  "Buy Box",
  "Property",
  "Analysis",
  "Client Report",
  "Follow-Up",
  "Offer",
] as const;

export function ClientsWorkspace({
  initialClients,
  initialCounts,
  countsFailed = false,
  portalsAvailable = false,
  portalUrlByClient = {},
  loadError,
}: {
  initialClients: AgentClient[];
  initialCounts: ClientDealSummary[];
  /** True when the deal-count query failed — cards must not claim "No deals
   *  yet", which reads as fact rather than a load failure. */
  countsFailed?: boolean;
  /** Public client portals stay unavailable until links have expiry and
   *  per-link revocation. Client rosters/reports remain usable without them. */
  portalsAvailable?: boolean;
  /** Portal URL per client, minted server-side so the copy click can be
   *  SYNCHRONOUS — see the note on the page that builds these. Missing entries
   *  mean SHARE_LINK_SECRET isn't configured; the button then explains that
   *  instead of failing silently. */
  portalUrlByClient?: Record<string, string>;
  loadError: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [clients, setClients] = useState<AgentClient[]>(initialClients);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  /** Client whose URL is shown as selectable text (clipboard unavailable). */
  const [revealedId, setRevealedId] = useState<string | null>(null);

  const countsById = useMemo(() => {
    const m = new Map<string, ClientDealSummary>();
    for (const c of initialCounts) m.set(c.clientId, c);
    return m;
  }, [initialCounts]);

  const save = () => {
    if (!editor) return;
    startSaving(async () => {
      try {
        const r = await upsertAgentClientAction({
          id: editor.id,
          name: editor.name,
          email: editor.email || null,
          phone: editor.phone || null,
          notes: null,
          isArchived: false,
        });
        if (r.ok) {
          const created = !editor.id;
          setClients(r.clients);
          setEditor(null);
          // Portal URLs are minted server-side, so a client added since this
          // render has no entry in that map. Without this refresh their copy
          // button reported "SHARE_LINK_SECRET is missing" — a false
          // infrastructure error on the first step of the workflow.
          router.refresh();
          toast({ title: editor.id ? "Client updated" : "Client added" });
          if (created) {
            trackEvent("agent_client_created", { source: "clients_workspace" });
          }
        } else {
          toast({ title: "Couldn't save", description: r.message, variant: "destructive" });
        }
      } catch (err) {
        Sentry.captureException(err, { tags: { feature: "agent-clients" } });
        toast({ title: "Couldn't save", description: "Try again in a moment.", variant: "destructive" });
      }
    });
  };

  const remove = (id: string, name: string, dealCount: number) => {
    // Hard delete sitting 2px from Edit, wiping every assignment. Confirm names
    // what is actually lost — the codebase confirms far smaller destructions.
    const warning = dealCount > 0
      ? `Remove ${name}? Their ${dealCount} assigned ${dealCount === 1 ? "deal" : "deals"} will be unassigned. The deals themselves are kept.`
      : `Remove ${name}? Their roster record will be deleted. Any deals you later assign are unaffected.`;
    if (!window.confirm(warning)) return;
    startSaving(async () => {
      try {
        const r = await deleteAgentClientAction({ id });
        if (r.ok) {
          setClients(r.clients);
          router.refresh();
          toast({ title: `${name} removed`, description: "Their deals and buy boxes stay — just unassigned." });
        } else {
          toast({ title: "Couldn't remove", description: r.message, variant: "destructive" });
        }
      } catch (err) {
        Sentry.captureException(err, { tags: { feature: "agent-clients" } });
        toast({ title: "Couldn't remove", description: "Try again in a moment.", variant: "destructive" });
      }
    });
  };

  /**
   * SYNCHRONOUS by design. The previous version awaited a server action and
   * then wrote to the clipboard, by which point the click's user activation
   * had lapsed — Safari refused the write and the button appeared dead. The
   * URL is resolved before render, so this runs entirely inside the gesture.
   */
  const copyPortal = (id: string) => {
    const url = portalUrlByClient[id];
    if (!url) {
      toast({
        title: "Portal links aren't configured yet",
        description: "SHARE_LINK_SECRET is missing on this deployment.",
        variant: "destructive",
      });
      return;
    }
    // Called WITHOUT await so the write stays inside the click's user
    // activation; the promise is still handled, because a rejected write used
    // to be swallowed by `void` and reported as success.
    try {
      const p = navigator.clipboard?.writeText(url);
      if (p && typeof p.then === "function") {
        p.then(
          () => {
            setCopiedId(id);
            trackEvent("client_report_shared", { report_type: "client_portal" });
            toast({
              title: "Portal link copied",
              description: "Send it to your client — it updates as you assign deals.",
            });
            setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 2500);
          },
          () => setRevealedId(id)
        );
      } else {
        setRevealedId(id); // no Clipboard API at all
      }
    } catch {
      setRevealedId(id);
    }
  };

  return (
    <main id="main" className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Give each buyer their own criteria, assign opportunities, and share a client-ready report.
          </p>
        </div>
        {!editor ? (
          <Button type="button" onClick={() => setEditor({ name: "", email: "", phone: "" })} className="shrink-0 gap-1.5">
            <Plus className="size-4" /> Add client
          </Button>
        ) : null}
      </div>

      <section
        aria-label="Agent Pro workflow"
        className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4"
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
          Agent workflow
        </p>
        <ol className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-2 text-xs font-semibold text-foreground">
          {AGENT_WORKFLOW_STEPS.map((step, index) => (
            <li key={step} className="inline-flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1">
                <span className="text-[10px] text-muted-foreground">{index + 1}</span>
                {step}
              </span>
              {index < AGENT_WORKFLOW_STEPS.length - 1 ? (
                <span aria-hidden className="text-muted-foreground">→</span>
              ) : null}
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Add the buyer here, define their criteria, analyze a property, assign the saved analysis,
          then share the client report. Keep follow-up in the deal notes and move the pipeline stage
          when you submit the offer.
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold">
          <Link href="/settings#buy-boxes" className="text-primary hover:underline">
            Manage Buy Boxes
          </Link>
          <Link href="/dashboard/new" className="text-primary hover:underline">
            Analyze a property
          </Link>
          <Link href="/dashboard/saved-analyses" className="text-primary hover:underline">
            Open My Deals
          </Link>
        </div>
      </section>

      {loadError ? (
        <div className="mt-4 rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-foreground">
          {loadError}
        </div>
      ) : null}

      {editor ? (
        <div className="mt-4 space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
          <div className="space-y-1">
            <Label htmlFor="cw-name" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Name
            </Label>
            <Input
              id="cw-name"
              value={editor.name}
              placeholder="e.g. The Nguyens"
              onChange={(e) => setEditor({ ...editor, name: e.target.value })}
              className="h-10 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="cw-email" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Email (optional)
              </Label>
              <Input
                id="cw-email"
                type="email"
                value={editor.email}
                onChange={(e) => setEditor({ ...editor, email: e.target.value })}
                className="h-10 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cw-phone" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Phone (optional)
              </Label>
              <Input
                id="cw-phone"
                value={editor.phone}
                onChange={(e) => setEditor({ ...editor, phone: e.target.value })}
                className="h-10 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" onClick={save} disabled={isSaving || editor.name.trim().length === 0}>
              {editor.id ? "Save" : "Add client"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditor(null)} disabled={isSaving}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {clients.length === 0 && !editor ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
          <Users className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-2 font-semibold text-foreground">No clients yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Add a buyer, set the criteria they&rsquo;re shopping for, then assign deals to them from My Deals.
            Each client gets a link to a live page showing everything you&rsquo;ve screened for them.
          </p>
          <Button type="button" className="mt-4 gap-1.5" onClick={() => setEditor({ name: "", email: "", phone: "" })}>
            <Plus className="size-4" /> Add your first client
          </Button>
        </div>
      ) : null}

      <ul className="mt-4 space-y-3">
        {clients.map((c) => {
          const summary = countsById.get(c.id);
          const dealCount = summary?.dealCount ?? 0;
          return (
            <li key={c.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[c.email, c.phone].filter(Boolean).join(" · ") || "No contact details"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {portalsAvailable ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => copyPortal(c.id)}
                      disabled={isSaving}
                    >
                      {copiedId === c.id ? <Check className="size-4 text-success" /> : <LinkIcon className="size-4" />}
                      {copiedId === c.id ? "Copied" : "Copy portal link"}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditor({ id: c.id, name: c.name, email: c.email ?? "", phone: c.phone ?? "" })}
                    disabled={isSaving}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove ${c.name}`}
                    onClick={() => remove(c.id, c.name, dealCount)}
                    disabled={isSaving}
                  >
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/60 pt-3 text-sm">
                {dealCount > 0 ? (
                  <>
                    <span className="font-semibold text-foreground">
                      {summary?.meetingCount != null
                        ? `${summary.meetingCount} of ${dealCount} meet their criteria`
                        : `${dealCount} ${dealCount === 1 ? "deal" : "deals"} assigned`}
                    </span>
                    <Link
                      href={`/dashboard/saved-analyses?client=${c.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      Review deals &amp; follow up <ExternalLink className="size-3" />
                    </Link>
                  </>
                ) : countsFailed ? (
                  <span className="text-xs text-muted-foreground">
                    Couldn&rsquo;t load this client&rsquo;s deal count — refresh to try again.
                  </span>
                ) : (
                  // The empty state names the exact next action — this is the
                  // step that used to have no UI at all.
                  <span className="text-xs text-muted-foreground">
                    No deals yet —{" "}
                    <Link href="/dashboard/saved-analyses" className="font-semibold text-primary hover:underline">
                      go to My Deals
                    </Link>{" "}
                    and set a deal&rsquo;s client to {c.name}.
                  </span>
                )}
                <Link
                  href={`/settings?buyBoxFor=${c.id}#buy-boxes`}
                  className="ml-auto text-xs font-semibold text-primary hover:underline"
                >
                  {summary?.meetingCount != null ? "Edit their buy box" : "Set their buy box"}
                </Link>
              </div>

              {/* Clipboard-blocked fallback: the URL, selectable, so the agent
                  can always get it out by hand. */}
              {revealedId === c.id && portalUrlByClient[c.id] ? (
                <div className="mt-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Portal link — select and copy
                  </label>
                  <input
                    readOnly
                    value={portalUrlByClient[c.id]}
                    onFocus={(e) => e.currentTarget.select()}
                    autoFocus
                    className="mt-1 w-full rounded-md border border-border bg-muted/30 px-2 py-1.5 text-xs text-foreground"
                  />
                </div>
              ) : null}

              {summary && summary.recentAddresses.length > 0 ? (
                <p className="mt-2 truncate text-xs text-muted-foreground">
                  {summary.recentAddresses.join(" · ")}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
