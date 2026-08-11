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
import { Check, Link as LinkIcon, Plus, Trash2, Users } from "lucide-react";
import {
  deleteAgentClientAction,
  getClientPortalLinkAction,
  listAgentClientsAction,
  upsertAgentClientAction,
  type AgentClient,
} from "@/app/actions/agent-clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type Editor = { id?: string; name: string; email: string; phone: string };

export function AgentClientsCard() {
  const { toast } = useToast();
  const [clients, setClients] = useState<AgentClient[] | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    });
  };

  const copyPortalLink = (id: string) => {
    setCopyingId(id);
    void (async () => {
      try {
        const r = await getClientPortalLinkAction({ clientId: id });
        if (r.ok) {
          await navigator.clipboard.writeText(r.url);
          setCopiedId(id);
          toast({ title: "Portal link copied", description: "Send it to your client — it stays live and updates as you screen deals." });
          setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 2500);
        } else {
          toast({ title: "Couldn't create the link", description: r.message, variant: "destructive" });
        }
      } catch {
        toast({ title: "Couldn't copy the link", description: "Try again in a moment.", variant: "destructive" });
      } finally {
        setCopyingId(null);
      }
    })();
  };

  const remove = (id: string) => {
    startSaving(async () => {
      const r = await deleteAgentClientAction({ id });
      if (r.ok) {
        setClients(r.clients);
        toast({ title: "Client removed", description: "Their buy boxes stay, unscoped." });
      } else {
        toast({ title: "Couldn't remove", description: r.message, variant: "destructive" });
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
        client&rdquo; selector, and every deal you analyze is screened against their criteria.
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
                aria-label={`Copy ${c.name}'s portal link`}
                title="Copy portal link"
                onClick={() => copyPortalLink(c.id)}
                disabled={isSaving || copyingId === c.id}
              >
                {copiedId === c.id ? (
                  <Check className="size-4 text-success" />
                ) : (
                  <LinkIcon className="size-4 text-muted-foreground" />
                )}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`Remove ${c.name}`}
                onClick={() => remove(c.id)}
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
