"use client";

/**
 * Buy Boxes editor (DM-2) — Settings card where a Pro user manages MULTIPLE
 * named acquisition criteria sets (e.g. "Memphis BRRRR", "Philly house-hack").
 * One is the default; every analysis screens against all active boxes.
 *
 * Supersedes the single-box BuyBoxCard. Reads/writes user_buy_boxes via
 * app/actions/user-buy-boxes.ts and tolerates the migration not yet being
 * applied (MIGRATION_PENDING). Free users see the Pro upsell.
 */

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { Loader2, Lock, Plus, Save, Star, Target, Trash2, UserRound, X } from "lucide-react";
import {
  deleteBuyBoxAction,
  listBuyBoxesAction,
  setDefaultBuyBoxAction,
  upsertBuyBoxAction,
  type BuyBoxesActionResult,
} from "@/app/actions/user-buy-boxes";
import {
  US_STATE_OPTIONS,
  buyBoxPropertyTypeLabel,
  type BuyBoxFitCount,
  type BuyBoxPropertyType,
  type NamedBuyBox,
} from "@/lib/buy-box";
import { STRATEGY_KINDS, strategyLabel } from "@/lib/strategy-kinds";
import { trackEvent } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";
import { listAgentClientsAction, type AgentClient } from "@/app/actions/agent-clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const RETURN_FIELDS = [
  { key: "minCapRatePct", label: "Min cap rate", suffix: "%", step: "0.1", placeholder: "6" },
  { key: "minCocPct", label: "Min cash-on-cash", suffix: "%", step: "0.1", placeholder: "8" },
  { key: "minDscr", label: "Min DSCR", suffix: "×", step: "0.05", placeholder: "1.25" },
] as const;

const MONEY_FIELDS = [
  { key: "minCashFlowMonthly", label: "Min monthly cash flow", step: "25", placeholder: "200" },
  { key: "maxPurchasePrice", label: "Max purchase price", step: "5000", placeholder: "300000" },
] as const;

const PROPERTY_TYPES: BuyBoxPropertyType[] = ["single-family", "multi-family", "owner-occupant"];

type NumericKey =
  | "minCapRatePct"
  | "minCocPct"
  | "minDscr"
  | "minCashFlowMonthly"
  | "maxPurchasePrice";

function parseNum(raw: string): number | null {
  if (raw == null || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function matchState(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const head = trimmed.slice(0, 2).toUpperCase();
  if (US_STATE_OPTIONS.some((s) => s.abbr === head)) return head;
  const byName = US_STATE_OPTIONS.find((s) => s.name.toLowerCase() === trimmed.toLowerCase());
  return byName ? byName.abbr : null;
}

function summarizeBox(box: NamedBuyBox): string {
  const parts: string[] = [];
  if (box.minCapRatePct != null) parts.push(`Cap ≥ ${box.minCapRatePct}%`);
  if (box.minCocPct != null) parts.push(`CoC ≥ ${box.minCocPct}%`);
  if (box.minDscr != null) parts.push(`DSCR ≥ ${box.minDscr}`);
  if (box.minCashFlowMonthly != null) parts.push(`CF ≥ $${box.minCashFlowMonthly}/mo`);
  if (box.maxPurchasePrice != null) parts.push(`≤ $${Math.round(box.maxPurchasePrice).toLocaleString("en-US")}`);
  if (box.propertyTypes.length) parts.push(box.propertyTypes.map(buyBoxPropertyTypeLabel).join("/"));
  if (box.targetStates.length) parts.push(box.targetStates.join(", "));
  return parts.length ? parts.join(" · ") : "No criteria set yet";
}

type EditorState = {
  id?: string;
  name: string;
  strategyKind: string;
  /** Agent Pro: roster client this box screens for ("" = the agent's own). */
  clientId: string;
  fields: Record<NumericKey, string>;
  propertyTypes: BuyBoxPropertyType[];
  targetStates: string[];
  isActive: boolean;
  isDefault: boolean;
};

function boxToEditor(box: NamedBuyBox): EditorState {
  const s = (n: number | null) => (n == null ? "" : String(n));
  return {
    id: box.id,
    name: box.name,
    strategyKind: box.strategyKind ?? "",
    clientId: box.clientId ?? "",
    fields: {
      minCapRatePct: s(box.minCapRatePct),
      minCocPct: s(box.minCocPct),
      minDscr: s(box.minDscr),
      minCashFlowMonthly: s(box.minCashFlowMonthly),
      maxPurchasePrice: s(box.maxPurchasePrice),
    },
    propertyTypes: box.propertyTypes,
    targetStates: box.targetStates,
    isActive: box.isActive,
    isDefault: box.isDefault,
  };
}

function emptyEditor(makeDefault: boolean): EditorState {
  return {
    name: "",
    strategyKind: "",
    clientId: "",
    fields: { minCapRatePct: "", minCocPct: "", minDscr: "", minCashFlowMonthly: "", maxPurchasePrice: "" },
    propertyTypes: [],
    targetStates: [],
    isActive: true,
    isDefault: makeDefault,
  };
}

export function BuyBoxesCard() {
  const { toast } = useToast();
  const [loaded, setLoaded] = useState(false);
  const [canUse, setCanUse] = useState(false);
  const [migrationPending, setMigrationPending] = useState(false);
  const [boxes, setBoxes] = useState<NamedBuyBox[]>([]);
  // Agent Pro roster for the per-client selector. null = not an Agent Pro
  // user (or migration pending) — the selector simply doesn't render.
  const [clients, setClients] = useState<AgentClient[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    void listAgentClientsAction()
      .then((r) => {
        if (!cancelled && r.ok) setClients(r.clients.filter((c) => !c.isArchived));
      })
      .catch(() => {
        /* roster is an enhancement — a failed load just hides the selector */
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [editor, setEditor] = useState<EditorState | null>(null);
  // Deep link from /dashboard/clients ("Set their buy box"). Landing on a
  // generic list left the agent to discover that the client selector lives
  // inside the editor — so arrive with the editor already open and scoped to
  // that buyer. Runs once, after the roster resolves so the name is available.
  const seededClientRef = useRef(false);
  useEffect(() => {
    if (seededClientRef.current || !canUse || !clients) return;
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("buyBoxFor");
    if (!requested) return;
    const client = clients.find((c) => c.id === requested);
    if (!client) return; // not on this agent's roster — ignore silently
    seededClientRef.current = true;
    // Reuse an existing box for this client rather than creating a duplicate.
    const existing = boxes.find((b) => b.clientId === client.id);
    if (existing) {
      setEditor(boxToEditor(existing));
    } else {
      setEditor({ ...emptyEditor(boxes.length === 0), name: `${client.name}'s criteria`, clientId: client.id });
    }
  }, [canUse, clients, boxes]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  // Which row's delete-confirm popover is open. Deleting a box is a hard
  // row delete server-side (no soft delete, no undo) and it sits right next
  // to Edit, so it gets the same confirm-first treatment as every other
  // destructive action in the app.
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  // "X of your N active deals pass this box" feedback from the last save.
  // Rendered only while the editor is closed (opening it again hides the
  // line, since it describes the previous save, not the in-progress edit).
  const [saveFit, setSaveFit] = useState<BuyBoxFitCount | null>(null);

  function applyResult(result: BuyBoxesActionResult): boolean {
    if (result.ok) {
      setBoxes(result.boxes);
      setCanUse(result.canUse);
      return true;
    }
    if (result.code === "MIGRATION_PENDING") setMigrationPending(true);
    else if (result.code !== "ENTITLEMENT_REQUIRED" && result.code !== "SIGN_IN_REQUIRED") {
      toast({ title: "Buy box error", description: result.message, variant: "destructive" });
    }
    return false;
  }

  useEffect(() => {
    let cancelled = false;
    void listBuyBoxesAction()
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          setBoxes(result.boxes);
          setCanUse(result.canUse);
        } else if (result.code === "MIGRATION_PENDING") {
          setMigrationPending(true);
        }
        setLoaded(true);
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn("[buy-boxes] load failed:", err);
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stateOptions = useMemo(
    () => (editor ? US_STATE_OPTIONS.filter((s) => !editor.targetStates.includes(s.abbr)) : US_STATE_OPTIONS),
    [editor]
  );

  function handleSave() {
    if (!editor) return;
    const name = editor.name.trim() || "My Buy Box";
    startSaving(async () => {
      try {
        const result = await upsertBuyBoxAction({
          id: editor.id,
          name,
          strategyKind: editor.strategyKind || null,
          // Sent ONLY when the roster loaded (Agent Pro) — otherwise the key
          // is omitted and the action never touches the client_id column.
          ...(clients ? { clientId: editor.clientId || null } : {}),
          minCapRatePct: parseNum(editor.fields.minCapRatePct),
          minCocPct: parseNum(editor.fields.minCocPct),
          minDscr: parseNum(editor.fields.minDscr),
          minCashFlowMonthly: parseNum(editor.fields.minCashFlowMonthly),
          maxPurchasePrice: parseNum(editor.fields.maxPurchasePrice),
          propertyTypes: editor.propertyTypes,
          targetStates: editor.targetStates,
          isActive: editor.isActive,
          isDefault: editor.isDefault,
        });
        if (applyResult(result)) {
          trackEvent("buy_box_saved", {
            source: "settings",
            is_new: !editor.id,
            is_default: editor.isDefault,
            has_strategy: Boolean(editor.strategyKind),
          });
          // Evaluation is best-effort server-side — no fit means no line,
          // never a failed save.
          setSaveFit(result.ok && result.fit ? result.fit : null);
          setEditor(null);
          toast({ title: editor.id ? "Buy box updated" : "Buy box added" });
        }
      } catch (err) {
        // The action REJECTED rather than returning {ok:false} (network blip,
        // cold-start 500, deploy skew). applyResult never runs, so without
        // this the click is silent — the editor stays open with no feedback.
        // Surface a retryable error, matching applyResult's own error title.
        Sentry.captureException(err, { tags: { feature: "buy-boxes" } });
        toast({
          title: "Buy box error",
          description: "Something interrupted the request. Check your connection and try again.",
          variant: "destructive",
        });
      }
    });
  }

  function handleDelete(id: string) {
    const name = boxes.find((b) => b.id === id)?.name ?? "";
    setConfirmDeleteId(null);
    setBusyId(id);
    // The fit line describes the last-saved box, which may be the one
    // being deleted — drop it rather than risk a stale claim.
    setSaveFit(null);
    startSaving(async () => {
      try {
        const result = await deleteBuyBoxAction(id);
        // Say it happened: the row just vanishing was the only feedback.
        if (applyResult(result)) toast({ title: "Buy box deleted", description: name });
      } catch (err) {
        // Action rejected rather than returning {ok:false} — surface a
        // retryable error instead of leaving the row spinning silently.
        Sentry.captureException(err, { tags: { feature: "buy-boxes" } });
        toast({
          title: "Buy box error",
          description: "Something interrupted the request. Check your connection and try again.",
          variant: "destructive",
        });
      } finally {
        // ALWAYS clear the row's busy state — a throw before this left the
        // delete button spinning forever.
        setBusyId(null);
      }
    });
  }

  function handleSetDefault(id: string) {
    setBusyId(id);
    startSaving(async () => {
      try {
        const result = await setDefaultBuyBoxAction(id);
        applyResult(result);
      } catch (err) {
        // Action rejected rather than returning {ok:false} — surface a
        // retryable error instead of leaving the row spinning silently.
        Sentry.captureException(err, { tags: { feature: "buy-boxes" } });
        toast({
          title: "Buy box error",
          description: "Something interrupted the request. Check your connection and try again.",
          variant: "destructive",
        });
      } finally {
        // ALWAYS clear the row's busy state — a throw before this left the
        // "Make default" button spinning forever.
        setBusyId(null);
      }
    });
  }

  if (!loaded) return null;

  if (migrationPending) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Target className="size-4" />
          <span>Your buy boxes will be available once the latest schema update is applied.</span>
        </div>
      </div>
    );
  }

  if (!canUse) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-2 flex items-center gap-2">
          <Target className="size-4 text-[var(--brand-orange)]" />
          <h2 className="text-base font-bold text-foreground">Your buy boxes</h2>
          <span className="rounded-full bg-[var(--brand-orange)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Pro
          </span>
        </div>
        <p className="mb-4 max-w-prose text-sm leading-relaxed text-muted-foreground">
          Keep one set of acquisition criteria per strategy or market — a Memphis BRRRR box, a Philly
          house-hack box. Every analysis shows which of your buy boxes the deal{" "}
          <span className="font-semibold text-foreground">meets</span>, alongside its Deal Score.
        </p>
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--brand-orange)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <Lock className="size-4" /> Upgrade to set your buy boxes
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="buy-boxes-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-1 flex items-center gap-2">
        <Target className="size-4 text-primary" />
        <h2 id="buy-boxes-heading" className="text-base font-bold text-foreground">
          Your buy boxes
        </h2>
        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Pro
        </span>
      </div>
      <p className="mb-5 max-w-prose text-sm leading-relaxed text-muted-foreground">
        One set of criteria per strategy or market. Each analysis shows a{" "}
        <span className="font-semibold text-foreground">Meets your buy box</span> verdict per box, next
        to its Deal Score. Every criterion is optional.
      </p>

      {/* Box list */}
      {boxes.length > 0 ? (
        <ul className="mb-4 space-y-2">
          {boxes.map((box) => (
            <li
              key={box.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground">{box.name}</span>
                  {box.isDefault ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                      <Star className="size-2.5 fill-current" /> Default
                    </span>
                  ) : null}
                  {box.strategyKind ? (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {strategyLabel(box.strategyKind)}
                    </span>
                  ) : null}
                  {!box.isActive ? (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      Off
                    </span>
                  ) : null}
                  {/* Agent Pro: whose criteria is this? Without it, an agent
                      running boxes for several buyers cannot tell their rows
                      apart — the client was only visible inside the editor. */}
                  {box.clientId && clients ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      <UserRound className="size-2.5" />
                      {clients.find((c) => c.id === box.clientId)?.name ?? "Client"}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{summarizeBox(box)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!box.isDefault ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={isSaving}
                    onClick={() => handleSetDefault(box.id)}
                    className="h-8 px-2 text-xs text-muted-foreground"
                  >
                    {busyId === box.id ? <Loader2 className="size-3.5 animate-spin" /> : "Make default"}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={isSaving}
                  onClick={() => {
                    // The fit line describes the PREVIOUS save — clear it
                    // when opening an editor so it can't read as describing
                    // this box after a cancel.
                    setSaveFit(null);
                    setEditor(boxToEditor(box));
                  }}
                  className="h-8 px-2 text-xs"
                >
                  Edit
                </Button>
                <Popover
                  open={confirmDeleteId === box.id}
                  onOpenChange={(open) => setConfirmDeleteId(open ? box.id : null)}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={`Delete ${box.name}`}
                      disabled={isSaving}
                      // ml-1: put a gap between Edit and the one control in
                      // this row that destroys work.
                      className="ml-1 h-8 px-2 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-72">
                    <p className="text-sm font-semibold text-foreground">Delete this buy box?</p>
                    <p className="mt-1 text-xs leading-snug text-muted-foreground">
                      <span className="font-semibold text-foreground">{box.name}</span>{" "}
                      and its criteria are removed for good — there&apos;s no undo, and deals stop
                      being screened against it.
                    </p>
                    <div className="mt-3 flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(box.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 rounded-xl border border-dashed border-border bg-muted/20 p-3 text-sm text-muted-foreground">
          No buy boxes yet. Add one to start screening deals against your criteria.
        </p>
      )}

      {/* Save feedback (moment-of-save consequence): how many active deals
          pass the box just saved. Links to My Deals pre-filtered to the fits
          (?buyBox=1 seeds the existing buyBoxOnly filter); 0 passing lands
          unfiltered so the per-deal "Misses buy box" badges show the gaps —
          the Decision Center tile's convention. One template string for the
          interpolated sentence (SSR whitespace gotcha). */}
      {editor === null && saveFit ? (
        <p
          role="status"
          className="mb-4 rounded-xl border border-[var(--brand-green)]/30 bg-[var(--brand-green-light)]/50 p-3 text-sm text-foreground"
        >
          {`${saveFit.passing} of your ${saveFit.evaluated} active deal${saveFit.evaluated === 1 ? "" : "s"} pass${saveFit.passing === 1 ? "es" : ""} this box — `}
          <Link
            href={saveFit.passing > 0 ? "/dashboard/saved-analyses?buyBox=1" : "/dashboard/saved-analyses"}
            className="font-semibold text-[var(--brand-green)] underline underline-offset-2 hover:opacity-80"
          >
            {saveFit.passing > 0 ? "see them →" : "see the gaps →"}
          </Link>
        </p>
      ) : null}

      {editor === null ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setSaveFit(null);
            setEditor(emptyEditor(boxes.length === 0));
          }}
          className="gap-1.5"
        >
          <Plus className="size-4" /> Add a buy box
        </Button>
      ) : (
        <BoxEditorForm
          editor={editor}
          setEditor={setEditor}
          stateOptions={stateOptions}
          isSaving={isSaving}
          onSave={handleSave}
          isOnlyBox={boxes.length === 0}
          clients={clients}
        />
      )}
    </section>
  );
}

function BoxEditorForm({
  editor,
  setEditor,
  stateOptions,
  isSaving,
  onSave,
  isOnlyBox,
  clients,
}: {
  editor: EditorState;
  setEditor: (e: EditorState | null) => void;
  stateOptions: ReadonlyArray<{ abbr: string; name: string }>;
  isSaving: boolean;
  onSave: () => void;
  isOnlyBox: boolean;
  /** Agent Pro roster; null hides the per-client selector. */
  clients: AgentClient[] | null;
}) {
  const [stateInput, setStateInput] = useState("");

  const update = (patch: Partial<EditorState>) => setEditor({ ...editor, ...patch });
  const updateField = (key: NumericKey, value: string) =>
    setEditor({ ...editor, fields: { ...editor.fields, [key]: value } });

  const addState = (raw: string) => {
    const abbr = matchState(raw);
    if (abbr && !editor.targetStates.includes(abbr)) {
      update({ targetStates: [...editor.targetStates, abbr] });
    }
    setStateInput("");
  };

  return (
    <div className="mt-2 rounded-xl border border-border bg-background p-4">
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="bb-name" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Name
          </Label>
          <Input
            id="bb-name"
            value={editor.name}
            placeholder="e.g. Memphis BRRRR"
            onChange={(e) => update({ name: e.target.value })}
            className="h-10 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="bb-strategy" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Strategy (optional)
          </Label>
          <select
            id="bb-strategy"
            value={editor.strategyKind}
            onChange={(e) => update({ strategyKind: e.target.value })}
            /* text-base below md: iOS Safari zooms the page in on sub-16px
               form controls (the Input primitive encodes the same rule). */
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-base md:text-sm"
          >
            <option value="">Any strategy</option>
            {STRATEGY_KINDS.map((k) => (
              <option key={k} value={k}>
                {strategyLabel(k)}
              </option>
            ))}
          </select>
        </div>

        {clients && clients.length > 0 ? (
          <div className="space-y-1">
            <Label htmlFor="bb-client" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              For client (optional)
            </Label>
            <select
              id="bb-client"
              value={editor.clientId}
              onChange={(e) => update({ clientId: e.target.value })}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-base md:text-sm"
            >
              <option value="">My own criteria</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {RETURN_FIELDS.map((field) => (
          <div key={field.key} className="space-y-1">
            <Label htmlFor={`bb-${field.key}`} className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {field.label}
            </Label>
            <div className="relative">
              <Input
                id={`bb-${field.key}`}
                type="number"
                inputMode="decimal"
                step={field.step}
                placeholder={field.placeholder}
                value={editor.fields[field.key]}
                onChange={(e) => updateField(field.key, e.target.value)}
                className="h-10 pr-9 text-sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                {field.suffix}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {MONEY_FIELDS.map((field) => (
          <div key={field.key} className="space-y-1">
            <Label htmlFor={`bb-${field.key}`} className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {field.label}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">$</span>
              <Input
                id={`bb-${field.key}`}
                type="number"
                inputMode="numeric"
                step={field.step}
                placeholder={field.placeholder}
                value={editor.fields[field.key]}
                onChange={(e) => updateField(field.key, e.target.value)}
                className="h-10 pl-7 text-sm"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Property types</Label>
        <p className="mb-2 mt-0.5 text-[11px] text-muted-foreground">Leave all off to allow any type.</p>
        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPES.map((type) => {
            const selected = editor.propertyTypes.includes(type);
            return (
              <Button
                key={type}
                type="button"
                size="sm"
                variant={selected ? "default" : "outline"}
                onClick={() =>
                  update({
                    propertyTypes: selected
                      ? editor.propertyTypes.filter((t) => t !== type)
                      : [...editor.propertyTypes, type],
                  })
                }
                className="h-8"
              >
                {buyBoxPropertyTypeLabel(type)}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <Label htmlFor="bb-state-input" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Target markets
        </Label>
        <p className="mb-2 mt-0.5 text-[11px] text-muted-foreground">Add states you buy in. Leave empty to allow any market.</p>
        {editor.targetStates.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {editor.targetStates.map((abbr) => (
              <span key={abbr} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
                {abbr}
                <button
                  type="button"
                  aria-label={`Remove ${abbr}`}
                  onClick={() => update({ targetStates: editor.targetStates.filter((s) => s !== abbr) })}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <Input
          id="bb-state-input"
          list="bb-state-options"
          placeholder="Type a state, e.g. PA"
          value={stateInput}
          onChange={(e) => {
            const v = e.target.value;
            if (matchState(v)) addState(v);
            else setStateInput(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addState(stateInput);
            }
          }}
          className="h-10 max-w-xs text-sm"
        />
        <datalist id="bb-state-options">
          {stateOptions.map((s) => (
            <option key={s.abbr} value={`${s.abbr} — ${s.name}`} />
          ))}
        </datalist>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2.5 text-sm text-foreground">
          <input
            type="checkbox"
            checked={editor.isActive}
            onChange={(e) => update({ isActive: e.target.checked })}
            className="size-4 rounded border-border accent-[var(--brand-orange)]"
          />
          Active (show its verdict)
        </label>
        <label className="flex items-center gap-2.5 text-sm text-foreground">
          <input
            type="checkbox"
            checked={editor.isDefault}
            disabled={isOnlyBox}
            onChange={(e) => update({ isDefault: e.target.checked })}
            className="size-4 rounded border-border accent-primary disabled:opacity-50"
          />
          Default box
        </label>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => setEditor(null)} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="button" onClick={onSave} disabled={isSaving} className="gap-1.5">
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {editor.id ? "Save changes" : "Add buy box"}
        </Button>
      </div>
    </div>
  );
}
