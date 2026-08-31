"use client";

/**
 * Agent Pro client roster — settings card. SELF-HIDING: renders null for
 * everyone except users whose plan carries the `client_buy_box` entitlement
 * (i.e. Agent Pro), and also while the enabling migration is pending. That
 * keeps it invisible-until-useful per the product principle: Free/Pro users
 * never see an upsell card for a tier that may not even be configured yet.
 *
 * The roster powers the "For client" selector in the buy-box editor
 * (buy-boxes-card.tsx): one buy box per buyer, every analyzed deal screened
 * against each client's criteria.
 */

import { useEffect, useState, useTransition } from "react";
import * as Sentry from "@sentry/nextjs";
import { Plus, Trash2, Users } from "lucide-react";
import {
  deleteAgentClientAction,
  listAgentClientsAction,
  upsertAgentClientAction,
  type AgentClient,
} from "@/app/actions/agent-clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useActionConfirm } from "@/components/ui/action-confirm-dialog";
import { trackEvent } from "@/lib/analytics";

type Editor = { id?: string; name: string; email: string; phone: string };

export function AgentClientsCard() {
  const { toast } = useToast();
  const { confirmDialog } = useActionConfirm();
  const [clients, setClients] = useState<AgentClient[] | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isSaving, startSaving] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void listAgentClientsAction()
      .then((r) => {
        if (!cancelled && r.ok) setClients(r.clients);
        // Not ok (no entitlement / migration pending / error) → stay null → hidden.
      })
      .catch(() => {
        /* hidden */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (clients === null) return null;

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
        toast({ title: editor.id ? "Client updated" : "Client added" });
        if (created) {
          trackEvent("agent_client_created", { source: "settings" });
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

  const remove = async (id: string, name: string) => {
    // Same guard as the Clients workspace: an unconfirmed hard delete sitting
    // beside Edit silently unassigns every deal.
    const confirmed = await confirmDialog({
      title: `Remove ${name}?`,
      body: "Any assigned deals will be unassigned. The deals themselves are kept.",
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!confirmed) return;
    startSaving(async () => {
      try {
        const r = await deleteAgentClientAction({ id });
        if (r.ok) {
          setClients(r.clients);
          toast({ title: "Client removed", description: "Their deals and buy boxes stay — just unassigned." });
        } else {
          toast({ title: "Couldn't remove", description: r.message, variant: "destructive" });
        }
      } catch (err) {
        Sentry.captureException(err, { tags: { feature: "agent-clients" } });
        toast({ title: "Couldn't remove", description: "Try again in a moment.", variant: "destructive" });
      }
    });
  };

  return (
    <section aria-label="Client roster" className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-primary" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">Clients</h2>
        </div>
        {!editor ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setEditor({ name: "", email: "", phone: "" })}
            className="gap-1.5"
          >
            <Plus className="size-4" /> Add client
          </Button>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Each client can carry their own buy box — set it under Buy Boxes with the &ldquo;For
        client&rdquo; selector, and every deal you analyze is screened against their criteria.{" "}
        <a href="/dashboard/clients" className="font-semibold text-primary hover:underline">
          Open the Clients workspace
        </a>{" "}
        to follow the full Client → Buy Box → Report → Offer workflow.
      </p>

      {clients.length > 0 ? (
        <ul className="mt-3 divide-y divide-border/60">
          {clients.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left font-semibold text-foreground hover:underline"
                onClick={() => setEditor({ id: c.id, name: c.name, email: c.email ?? "", phone: c.phone ?? "" })}
              >
                {c.name}
                {c.email ? <span className="ml-2 font-normal text-muted-foreground">{c.email}</span> : null}
              </button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`Remove ${c.name}`}
                onClick={() => remove(c.id, c.name)}
                disabled={isSaving}
              >
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
            </li>
          ))}
        </ul>
      ) : !editor ? (
        <p className="mt-3 text-sm text-muted-foreground">No clients yet.</p>
      ) : null}

      {editor ? (
        <div className="mt-3 space-y-3 rounded-xl border border-border bg-muted/20 p-3">
          <div className="space-y-1">
            <Label htmlFor="client-name" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Name
            </Label>
            <Input
              id="client-name"
              value={editor.name}
              placeholder="e.g. The Nguyens"
              onChange={(e) => setEditor({ ...editor, name: e.target.value })}
              className="h-10 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="client-email" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Email (optional)
              </Label>
              <Input
                id="client-email"
                type="email"
                value={editor.email}
                onChange={(e) => setEditor({ ...editor, email: e.target.value })}
                className="h-10 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="client-phone" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Phone (optional)
              </Label>
              <Input
                id="client-phone"
                value={editor.phone}
                onChange={(e) => setEditor({ ...editor, phone: e.target.value })}
                className="h-10 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" onClick={save} disabled={isSaving || editor.name.trim().length === 0}>
              {editor.id ? "Save" : "Add"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditor(null)} disabled={isSaving}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
