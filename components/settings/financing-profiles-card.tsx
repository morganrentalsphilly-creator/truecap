"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  BadgeDollarSign,
  Check,
  Loader2,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  Star,
  Trash2,
  X,
} from "lucide-react";
import {
  createFinancingProfileAction,
  deleteFinancingProfileAction,
  listFinancingProfilesAction,
  setDefaultFinancingProfileAction,
  updateFinancingProfileAction,
  type FinancingProfilesActionResult,
} from "@/app/actions/financing-profiles";
import { useExpectedAccountUserId } from "@/components/auth/account-session-boundary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import {
  FINANCING_PROFILE_LOAN_TYPES,
  financingProfileLoanTypeLabel,
  type FinancingProfile,
  type FinancingProfileInput,
} from "@/lib/financing-profiles";

type NumericEditorKey =
  | "interestRatePct"
  | "downPaymentPct"
  | "ltvPct"
  | "amortizationYears"
  | "loanTermYears"
  | "pointsPct"
  | "lenderFees"
  | "closingCostsPct"
  | "interestOnlyMonths"
  | "pmiAnnualRatePct";

type EditorState = {
  id?: string;
  name: string;
  loanType: string;
  lenderName: string;
  notes: string;
  lastVerifiedDate: string;
  numeric: Record<NumericEditorKey, string>;
  pmiNoCancel: boolean;
  isActive: boolean;
  isDefault: boolean;
};

const NUMERIC_FIELDS: Array<{
  key: NumericEditorKey;
  label: string;
  suffix?: string;
  prefix?: string;
  step: string;
  hint?: string;
}> = [
  { key: "interestRatePct", label: "Interest rate", suffix: "%", step: "0.01" },
  { key: "downPaymentPct", label: "Down payment", suffix: "%", step: "0.1" },
  { key: "ltvPct", label: "LTV", suffix: "%", step: "0.1", hint: "Used when down payment is blank" },
  { key: "amortizationYears", label: "Amortization", suffix: "yr", step: "1" },
  { key: "loanTermYears", label: "Loan term", suffix: "yr", step: "1" },
  { key: "pointsPct", label: "Points", suffix: "%", step: "0.125" },
  { key: "lenderFees", label: "Lender fees", prefix: "$", step: "100" },
  { key: "closingCostsPct", label: "Closing costs", suffix: "%", step: "0.1" },
  { key: "interestOnlyMonths", label: "Interest-only", suffix: "mo", step: "1" },
  { key: "pmiAnnualRatePct", label: "PMI / MIP", suffix: "%", step: "0.05" },
];

function numericFieldUnit(field: (typeof NUMERIC_FIELDS)[number]): string | null {
  if (field.prefix === "$") return "dollars";
  if (field.suffix === "%") return "percent";
  if (field.suffix === "yr") return "years";
  if (field.suffix === "mo") return "months";
  return null;
}

function emptyEditor(makeDefault: boolean): EditorState {
  return {
    name: "",
    loanType: "custom",
    lenderName: "",
    notes: "",
    lastVerifiedDate: "",
    numeric: Object.fromEntries(NUMERIC_FIELDS.map((field) => [field.key, ""])) as Record<
      NumericEditorKey,
      string
    >,
    pmiNoCancel: false,
    isActive: true,
    isDefault: makeDefault,
  };
}

function profileToEditor(profile: FinancingProfile): EditorState {
  const value = (number: number | null) => (number == null ? "" : String(number));
  return {
    id: profile.id,
    name: profile.name,
    loanType: profile.loanType,
    lenderName: profile.lenderName ?? "",
    notes: profile.notes ?? "",
    lastVerifiedDate: profile.lastVerifiedAt?.slice(0, 10) ?? "",
    numeric: {
      interestRatePct: value(profile.interestRatePct),
      downPaymentPct: value(profile.downPaymentPct),
      ltvPct: value(profile.ltvPct),
      amortizationYears: value(profile.amortizationYears),
      loanTermYears: value(profile.loanTermYears),
      pointsPct: value(profile.pointsPct),
      lenderFees: value(profile.lenderFees),
      closingCostsPct: value(profile.closingCostsPct),
      interestOnlyMonths: value(profile.interestOnlyMonths),
      pmiAnnualRatePct: value(profile.pmiAnnualRatePct),
    },
    pmiNoCancel: profile.pmiNoCancel === true,
    isActive: profile.isActive,
    isDefault: profile.isDefault,
  };
}

function nullableNumber(raw: string): number | null {
  if (!raw.trim()) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function localDateInputValue(date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function editorToInput(editor: EditorState): FinancingProfileInput {
  return {
    name: editor.name.trim(),
    loanType: editor.loanType,
    interestRatePct: nullableNumber(editor.numeric.interestRatePct),
    downPaymentPct: nullableNumber(editor.numeric.downPaymentPct),
    ltvPct: nullableNumber(editor.numeric.ltvPct),
    amortizationYears: nullableNumber(editor.numeric.amortizationYears),
    loanTermYears: nullableNumber(editor.numeric.loanTermYears),
    pointsPct: nullableNumber(editor.numeric.pointsPct),
    lenderFees: nullableNumber(editor.numeric.lenderFees),
    closingCostsPct: nullableNumber(editor.numeric.closingCostsPct),
    interestOnlyMonths: nullableNumber(editor.numeric.interestOnlyMonths),
    pmiAnnualRatePct: nullableNumber(editor.numeric.pmiAnnualRatePct),
    pmiNoCancel: editor.pmiNoCancel,
    lenderName: editor.lenderName.trim() || null,
    notes: editor.notes.trim() || null,
    lastVerifiedAt: editor.lastVerifiedDate
      ? new Date(`${editor.lastVerifiedDate}T12:00:00.000Z`).toISOString()
      : null,
    isActive: editor.isActive,
    isDefault: editor.isDefault,
  };
}

function formatVerified(value: string | null): string {
  if (!value) return "Not verified yet";
  return `Verified ${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value))}`;
}

function profileTerms(profile: FinancingProfile): string {
  const terms: string[] = [];
  if (profile.interestRatePct != null) terms.push(`${profile.interestRatePct.toFixed(2)}%`);
  if (profile.downPaymentPct != null) terms.push(`${profile.downPaymentPct}% down`);
  else if (profile.ltvPct != null) terms.push(`${profile.ltvPct}% LTV`);
  if (profile.amortizationYears != null) terms.push(`${profile.amortizationYears}-yr amortization`);
  else if (profile.loanTermYears != null) terms.push(`${profile.loanTermYears}-yr term`);
  return terms.length ? terms.join(" · ") : "Terms not entered yet";
}

export function FinancingProfilesCard() {
  const expectedUserId = useExpectedAccountUserId();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<FinancingProfile[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [available, setAvailable] = useState(true);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [maxVerifiedDate, setMaxVerifiedDate] = useState("");
  const [isSaving, startSaving] = useTransition();
  const restoreAddFocusRef = useRef(false);
  const editorOpen = editor !== null;
  const editorId = editor?.id;

  useEffect(() => {
    setMaxVerifiedDate(localDateInputValue());
  }, []);

  useEffect(() => {
    const targetId = editorOpen
      ? "financing-profile-name"
      : restoreAddFocusRef.current
        ? "financing-profile-add"
        : null;
    if (!targetId) return;
    restoreAddFocusRef.current = false;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editorId, editorOpen]);

  useEffect(() => {
    if (!confirmDeleteId) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`financing-profile-confirm-delete-${confirmDeleteId}`)?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [confirmDeleteId]);

  useEffect(() => {
    let cancelled = false;
    void listFinancingProfilesAction()
      .then((result) => {
        if (cancelled) return;
        if (result.ok) setProfiles(result.profiles);
        else if (result.code === "FEATURE_DISABLED" || result.code === "MIGRATION_PENDING") {
          setAvailable(false);
        }
        setLoaded(true);
      })
      .catch((error) => {
        if (!cancelled) {
          Sentry.captureException(error, { tags: { feature: "financing-profiles" } });
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function applyResult(result: FinancingProfilesActionResult, title?: string): boolean {
    if (result.ok) {
      setProfiles(result.profiles);
      if (title) toast({ title });
      return true;
    }
    if (result.code === "FEATURE_DISABLED" || result.code === "MIGRATION_PENDING") {
      setAvailable(false);
      return false;
    }
    toast({ title: "Financing profile error", description: result.message, variant: "destructive" });
    return false;
  }

  function handleSave() {
    if (!editor) return;
    startSaving(async () => {
      try {
        const payload = editorToInput(editor);
        const result = editor.id
          ? await updateFinancingProfileAction(editor.id, payload)
          : await createFinancingProfileAction(payload, expectedUserId);
        if (applyResult(result, editor.id ? "Financing profile updated" : "Financing profile created")) {
          if (!editor.id) trackEvent("financing_profile_created", { loan_type: payload.loanType });
          closeEditor();
        }
      } catch (error) {
        Sentry.captureException(error, { tags: { feature: "financing-profiles" } });
        toast({
          title: "Financing profile error",
          description: "Something interrupted the request. Check your connection and try again.",
          variant: "destructive",
        });
      }
    });
  }

  function closeEditor() {
    restoreAddFocusRef.current = true;
    setEditor(null);
  }

  function cancelDelete(id: string) {
    setConfirmDeleteId(null);
    window.requestAnimationFrame(() => {
      document.getElementById(`financing-profile-delete-${id}`)?.focus();
    });
  }

  async function handleDefault(id: string) {
    setBusyId(id);
    try {
      applyResult(await setDefaultFinancingProfileAction(id), "Default financing profile updated");
    } catch (error) {
      Sentry.captureException(error, { tags: { feature: "financing-profiles" } });
      toast({ title: "Could not update the default profile", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    try {
      if (applyResult(await deleteFinancingProfileAction(id), "Financing profile deleted")) {
        setConfirmDeleteId(null);
      }
    } catch (error) {
      Sentry.captureException(error, { tags: { feature: "financing-profiles" } });
      toast({ title: "Could not delete the financing profile", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  if (!loaded || !available) return null;

  return (
    <section
      id="financing-profiles"
      aria-labelledby="financing-profiles-heading"
      className="scroll-mt-20 rounded-2xl border border-border bg-card p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BadgeDollarSign aria-hidden className="size-4 text-primary" />
            <h2 id="financing-profiles-heading" className="text-base font-bold text-foreground">
              Financing Profiles
            </h2>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Save lender terms once, then apply them to an analysis. Saved deals keep the exact
            profile version used at the time, so later edits never rewrite an old decision.
          </p>
        </div>
        {!editor ? (
          <Button
            id="financing-profile-add"
            type="button"
            size="sm"
            className="min-h-11"
            onClick={() => setEditor(emptyEditor(profiles.length === 0))}
          >
            <Plus aria-hidden /> Add profile
          </Button>
        ) : null}
      </div>

      {profiles.length > 0 && !editor ? (
        <div className="mt-5 space-y-3">
          {profiles.map((profile) => (
            <div key={profile.id} className="rounded-xl border border-border/70 bg-background p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-words font-semibold text-foreground">{profile.name}</p>
                    {profile.isDefault ? (
                      <Badge variant="secondary"><Star aria-hidden className="size-3" /> Default</Badge>
                    ) : null}
                    {!profile.isActive ? <Badge variant="outline">Inactive</Badge> : null}
                    <Badge variant="outline">v{profile.termsVersion}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-foreground/80">{profileTerms(profile)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {financingProfileLoanTypeLabel(profile.loanType)}
                    {profile.lenderName ? ` · ${profile.lenderName}` : ""} · {formatVerified(profile.lastVerifiedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5" aria-live="polite">
                  {!profile.isDefault ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="min-h-11"
                      disabled={busyId === profile.id}
                      onClick={() => void handleDefault(profile.id)}
                    >
                      <Star aria-hidden /> Make default
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11"
                    onClick={() => setEditor(profileToEditor(profile))}
                  >
                    <Pencil aria-hidden /> Edit
                  </Button>
                  {confirmDeleteId === profile.id ? (
                    <>
                      <Button
                        type="button"
                        id={`financing-profile-confirm-delete-${profile.id}`}
                        variant="destructive"
                        size="sm"
                        className="min-h-11"
                        disabled={busyId === profile.id}
                        aria-busy={busyId === profile.id}
                        aria-label={`Confirm deletion of ${profile.name}`}
                        onClick={() => void handleDelete(profile.id)}
                      >
                        {busyId === profile.id ? <Loader2 aria-hidden className="animate-spin" /> : <Check aria-hidden />}
                        Confirm
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-11"
                        onClick={() => cancelDelete(profile.id)}
                        aria-label={`Cancel deletion of ${profile.name}`}
                      >
                        <X aria-hidden />
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      id={`financing-profile-delete-${profile.id}`}
                      variant="ghost"
                      size="icon-sm"
                      className="size-11"
                      onClick={() => setConfirmDeleteId(profile.id)}
                      aria-label={`Delete ${profile.name}`}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {profiles.length === 0 && !editor ? (
        <div className="mt-5 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
          Add your first lender profile to stop retyping financing assumptions on every deal.
        </div>
      ) : null}

      {editor ? (
        <form
          aria-label={editor.id ? `Edit ${editor.name} financing profile` : "Add financing profile"}
          aria-busy={isSaving}
          className="mt-5 space-y-5 rounded-xl border border-border bg-background p-4 sm:p-5"
          onSubmit={(event) => {
            event.preventDefault();
            handleSave();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="financing-profile-name">Profile name</Label>
              <Input
                id="financing-profile-name"
                required
                maxLength={100}
                value={editor.name}
                placeholder="DSCR 75% LTV"
                className="h-11"
                onChange={(event) => setEditor((current) => current ? { ...current, name: event.target.value } : current)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="financing-profile-loan-type">Loan type</Label>
              <select
                id="financing-profile-loan-type"
                value={editor.loanType}
                onChange={(event) => setEditor((current) => current ? { ...current, loanType: event.target.value } : current)}
                className="h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {FINANCING_PROFILE_LOAN_TYPES.map((loanType) => (
                  <option key={loanType} value={loanType}>{financingProfileLoanTypeLabel(loanType)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {NUMERIC_FIELDS.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={`financing-profile-${field.key}`}>
                  {field.label}
                  {numericFieldUnit(field) ? (
                    <span className="sr-only"> ({numericFieldUnit(field)})</span>
                  ) : null}
                </Label>
                <div className="relative">
                  {field.prefix ? <span aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{field.prefix}</span> : null}
                  <Input
                    id={`financing-profile-${field.key}`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step={field.step}
                    value={editor.numeric[field.key]}
                    aria-describedby={field.hint ? `financing-profile-${field.key}-hint` : undefined}
                    onChange={(event) =>
                      setEditor((current) => current ? {
                        ...current,
                        numeric: { ...current.numeric, [field.key]: event.target.value },
                      } : current)
                    }
                    className={`h-11 ${field.prefix ? "pl-7" : ""} ${field.suffix ? "pr-10" : ""}`}
                  />
                  {field.suffix ? <span aria-hidden className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{field.suffix}</span> : null}
                </div>
                {field.hint ? <p id={`financing-profile-${field.key}-hint`} className="text-[10px] text-muted-foreground">{field.hint}</p> : null}
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="financing-profile-lender">Lender name (optional)</Label>
              <Input
                id="financing-profile-lender"
                maxLength={160}
                value={editor.lenderName}
                className="h-11"
                onChange={(event) => setEditor((current) => current ? { ...current, lenderName: event.target.value } : current)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="financing-profile-verified">Last verified</Label>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Input
                  id="financing-profile-verified"
                  type="date"
                  max={maxVerifiedDate || undefined}
                  value={editor.lastVerifiedDate}
                  className="h-11"
                  aria-describedby="financing-profile-verified-hint"
                  onChange={(event) => setEditor((current) => current ? { ...current, lastVerifiedDate: event.target.value } : current)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 w-full min-[400px]:w-auto"
                  onClick={() => setEditor((current) => current ? { ...current, lastVerifiedDate: localDateInputValue() } : current)}
                >
                  <ShieldCheck aria-hidden /> Today
                </Button>
              </div>
              <p id="financing-profile-verified-hint" className="text-[10px] leading-relaxed text-muted-foreground">
                Set this only after confirming the current lender quote or term sheet. A date
                within 30 days can raise Input Confidence; older terms remain visible but do not.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="financing-profile-notes">Notes (optional)</Label>
            <textarea
              id="financing-profile-notes"
              maxLength={5000}
              rows={3}
              value={editor.notes}
              onChange={(event) => setEditor((current) => current ? { ...current, notes: event.target.value } : current)}
              className="min-h-24 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Quote source, prepayment penalty, recourse, or other lender notes"
            />
          </div>

          <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 sm:grid-cols-3">
            <div className="flex min-h-11 items-center gap-2">
              <Switch
                id="financing-profile-pmi-no-cancel"
                checked={editor.pmiNoCancel}
                onCheckedChange={(checked) => setEditor((current) => current ? { ...current, pmiNoCancel: checked } : current)}
              />
              <Label htmlFor="financing-profile-pmi-no-cancel" className="cursor-pointer leading-snug">
                PMI / MIP runs for loan life
              </Label>
            </div>
            <div className="flex min-h-11 items-center gap-2">
              <Switch
                id="financing-profile-active"
                checked={editor.isActive}
                onCheckedChange={(checked) => setEditor((current) => current ? { ...current, isActive: checked } : current)}
              />
              <Label htmlFor="financing-profile-active" className="cursor-pointer">Active</Label>
            </div>
            <div className="flex min-h-11 items-center gap-2">
              <Switch
                id="financing-profile-default"
                checked={editor.isDefault}
                onCheckedChange={(checked) => setEditor((current) => current ? { ...current, isDefault: checked } : current)}
              />
              <Label htmlFor="financing-profile-default" className="cursor-pointer">Default profile</Label>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            The current cash-flow engine applies rate, down payment/LTV, amortization,
            closing costs, and PMI. Points, lender fees, a balloon maturity, and an
            interest-only period remain documented on the frozen profile snapshot but
            are not yet included in payment or return calculations.
          </p>

          <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full sm:w-auto"
              onClick={closeEditor}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="min-h-11 w-full sm:w-auto"
              disabled={isSaving}
            >
              {isSaving ? <Loader2 aria-hidden className="animate-spin" /> : <Save aria-hidden />}
              Save profile
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
