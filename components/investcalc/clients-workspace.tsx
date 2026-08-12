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
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { Check, ExternalLink, Link as LinkIcon, Plus, Trash2, Users } from "lucide-react";
import {
  deleteAgentClientAction,
  getClientPortalLinkAction,
  upsertAgentClientAction,
  type AgentClient,
  type ClientDealSummary,
} from "@/app/actions/agent-clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type Editor = { id?: string; name: string; email: string; phone: string };

export function ClientsWorkspace({
  initialClients,
  initialCounts,
  loadError,
}: {
  initialClients: AgentClient[];
  initialCounts: ClientDealSummary[];
  loadError: string | null;
}) {
  const { toast } = useToast();
  const [clients, setClients] = useState<AgentClient[]>(initialClients);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
          setClients(r.clients);
          setEditor(null);
          toast({ title: editor.id ? "Client updated" : "Client added" });
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
    const warning =
      dealCount > 0
        ? `Remove ${name}? Their ${dealCount} assigned ${dealCount === 1 ? "deal" : "deals"} will be unassigned and their portal link will stop working. The deals themselves are kept.`
        : `Remove ${name}? Their portal link will stop working. Any deals you later assign are unaffected.`;
    if (!window.confirm(warning)) return;
    startSaving(async () => {
      try {
        const r = await deleteAgentClientAction({ id });
        if (r.ok) {
          setClients(r.clients);
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

  const copyPortal = (id: string) => {
    startSaving(async () => {
      try {
        const r = await getClientPortalLinkAction({ clientId: id });
        if (!r.ok) {
          toast({ title: "Couldn't create the link", description: r.message, variant: "destructive" });
          return;
        }
        try {
          await navigator.clipboard.writeText(r.url);
          setCopiedId(id);
          toast({ title: "Portal link copied", description: "Send it to your client — it updates as you assign deals." });
          setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 2500);
        } catch {
          // Clipboard denied (Safari without a user gesture, permissions) —
          // show the URL so the agent can still copy it by hand.
          toast({ title: "Copy the link manually", description: r.url });
        }
      } catch (err) {
        Sentry.captureException(err, { tags: { feature: "agent-clients" } });
        toast({ title: "Couldn't create the link", description: "Try again in a moment.", variant: "destructive" });
      }
    });
  };

  return (
    <main id="main" className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Give each buyer their own criteria and a live deal portal you can send them.
          </p>
        </div>
        {!editor ? (
          <Button type="button" onClick={() => setEditor({ name: "", email: "", phone: "" })} className="shrink-0 gap-1.5">
            <Plus className="size-4" /> Add client
          </Button>
        ) : null}
      </div>

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
                      {dealCount} {dealCount === 1 ? "deal" : "deals"} assigned
                    </span>
                    <Link
                      href={`/dashboard/saved-analyses?client=${c.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      View their deals <ExternalLink className="size-3" />
                    </Link>
                  </>
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
                  Set their buy box
                </Link>
              </div>

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
