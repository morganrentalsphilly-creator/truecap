"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRightLeft,
  Copy,
  FileText,
  History,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
  Target,
  Trash2,
} from "lucide-react";
import {
  STARTER_TEMPLATES,
  type StarterTemplate,
} from "@/lib/starter-templates";
import type { AnalysisTemplateOption } from "@/app/actions/analysis-templates";
import {
  applyTemplateToDealAction,
  createAnalysisTemplateAction,
  deleteAnalysisTemplateAction,
  duplicateTemplateAction,
  listTemplateVersionsAction,
  restoreTemplateVersionAction,
  setDefaultTemplateAction,
  updateAnalysisTemplateAction,
  type TemplateVersionSummary,
} from "@/app/actions/analysis-templates";
import {
  listSavedDealsBriefAction,
  type SavedDealBrief,
} from "@/app/actions/saved-analyses";
import { upsertBuyBoxAction } from "@/app/actions/user-buy-boxes";
import { useExpectedAccountUserId } from "@/components/auth/account-session-boundary";
import { trackEvent } from "@/lib/analytics";
import type { AnalysisTemplateInput } from "@/lib/analysis-template-schema";
import { isFeatureReleased } from "@/lib/entitlements-catalog";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TemplateFormDialog } from "@/components/investcalc/template-form-dialog";
import Link from "next/link";

const TEMPLATE_PAGE_SIZE = 10;
const TAX_STRATEGY_RELEASED = isFeatureReleased("tax_strategy");
const EXIT_SCENARIOS_RELEASED = isFeatureReleased("exit_scenarios");
const RELEASED_STARTER_TEMPLATES = STARTER_TEMPLATES.filter((starter) => {
  if (starter.key === "brrrr") {
    return isFeatureEnabled("brrrr_strategy_model");
  }
  if (starter.key === "hard-money-flip") {
    return isFeatureEnabled("fix_flip_strategy_model");
  }
  if (starter.key === "portfolio-refi") {
    return EXIT_SCENARIOS_RELEASED;
  }
  return true;
});

function toPercentLabel(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatBuyBoxSummary(
  bb: NonNullable<AnalysisTemplateOption["buyBox"]>,
): string {
  const parts: string[] = [];
  if (bb.minCapRatePct != null) parts.push(`cap ≥${bb.minCapRatePct}%`);
  if (bb.minCocPct != null) parts.push(`CoC ≥${bb.minCocPct}%`);
  if (bb.minDscr != null) parts.push(`DSCR ≥${bb.minDscr}`);
  if (bb.minCashFlowMonthly != null)
    parts.push(`CF ≥$${bb.minCashFlowMonthly.toLocaleString()}`);
  if (EXIT_SCENARIOS_RELEASED && bb.minIrrPct != null) {
    parts.push(`10y IRR ≥${bb.minIrrPct}%`);
  }
  if (bb.maxCashRequired != null)
    parts.push(`cash ≤$${Math.round(bb.maxCashRequired).toLocaleString()}`);
  if (bb.maxPurchasePrice != null)
    parts.push(`≤$${Math.round(bb.maxPurchasePrice).toLocaleString()}`);
  return parts.join(" · ");
}

const DEFAULT_TEMPLATE_VALUES: AnalysisTemplateInput = {
  templateName: "",
  templateDescription: "",
  propertyTaxPct: 1.1,
  insuranceInputMode: "percent",
  insurancePct: 0.5,
  insuranceMo: undefined,
  maintenancePct: 10,
  vacancyPct: 5,
  managementPct: 8,
  capexPct: 5,
  closingCostsPct: 3,
  interestRatePct: 6.5,
  downPaymentPct: 20,
  expenseGrowthPct: 3,
  rentGrowthPct: 3,
  appreciationRatePct: undefined,
  sellingCostPct: undefined,
  buildingValuePct: 85,
  depreciationYears: 27.5,
  includeInterestDeduction: true,
  taxRatePct: 24,
};

function getTemplateValues(
  template: AnalysisTemplateOption,
): AnalysisTemplateInput {
  return {
    templateName: template.templateName,
    templateDescription: template.templateDescription ?? "",
    propertyTaxPct: template.propertyTaxPct,
    insuranceInputMode: template.insuranceInputMode,
    insurancePct: template.insurancePct ?? undefined,
    insuranceMo: template.insuranceMo ?? undefined,
    maintenancePct: template.maintenancePct,
    vacancyPct: template.vacancyPct,
    managementPct: template.managementPct,
    capexPct: template.capexPct,
    closingCostsPct: template.closingCostsPct,
    interestRatePct: template.interestRatePct,
    downPaymentPct: template.downPaymentPct,
    expenseGrowthPct: template.expenseGrowthPct,
    rentGrowthPct: template.rentGrowthPct,
    appreciationRatePct: template.appreciationRatePct,
    sellingCostPct: template.sellingCostPct,
    buildingValuePct: template.buildingValuePct,
    depreciationYears: template.depreciationYears,
    includeInterestDeduction: template.includeInterestDeduction,
    taxRatePct: template.taxRatePct,
    buyBox: template.buyBox ?? undefined,
  };
}

export function TemplatesManagementPage({
  initialTemplates,
}: {
  initialTemplates: AnalysisTemplateOption[];
}) {
  const expectedUserId = useExpectedAccountUserId();
  const { toast } = useToast();
  const [templates, setTemplates] = useState(initialTemplates);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<AnalysisTemplateOption | null>(null);
  const [dialogInitialValues, setDialogInitialValues] =
    useState<AnalysisTemplateInput>(DEFAULT_TEMPLATE_VALUES);
  const [isSaving, setIsSaving] = useState(false);
  const [templateToDelete, setTemplateToDelete] =
    useState<AnalysisTemplateOption | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((template) => {
      const hay =
        `${template.templateName} ${template.templateDescription ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [searchQuery, templates]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredTemplates.length / TEMPLATE_PAGE_SIZE),
  );
  const safeCurrentPage = Math.min(currentPage, pageCount);
  const pageStartIndex =
    filteredTemplates.length === 0
      ? 0
      : (safeCurrentPage - 1) * TEMPLATE_PAGE_SIZE;
  const pageEndIndex = Math.min(
    pageStartIndex + TEMPLATE_PAGE_SIZE,
    filteredTemplates.length,
  );
  const pagedTemplates = useMemo(
    () => filteredTemplates.slice(pageStartIndex, pageEndIndex),
    [filteredTemplates, pageEndIndex, pageStartIndex],
  );

  const paginationPages = useMemo(() => {
    const pages = new Set<number>([
      1,
      pageCount,
      safeCurrentPage - 1,
      safeCurrentPage,
      safeCurrentPage + 1,
    ]);
    return [...pages]
      .filter((page) => page >= 1 && page <= pageCount)
      .sort((a, b) => a - b);
  }, [pageCount, safeCurrentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (currentPage > pageCount) {
      setCurrentPage(pageCount);
    }
  }, [currentPage, pageCount]);

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setDialogInitialValues(DEFAULT_TEMPLATE_VALUES);
    setIsFormDialogOpen(true);
  };

  /**
   * Clone a starter template into the user's library. Open the form
   * dialog pre-populated with the starter's values so the user can
   * tweak before saving - gives them a starting point AND immediate
   * agency over the defaults. The save itself happens through the
   * normal create flow so all validation + name-uniqueness rules
   * still apply.
   */
  const cloneStarterTemplate = (starter: StarterTemplate) => {
    setEditingTemplate(null);
    // Append " - Mine" so it doesn't collide with another starter copy
    // they may have saved earlier (unique-name constraint).
    const baseName = starter.template.templateName.replace(/^Starter - /, "");
    setDialogInitialValues({
      ...starter.template,
      templateName: `${baseName} - Mine`,
    });
    setIsFormDialogOpen(true);
  };

  const openEditDialog = (template: AnalysisTemplateOption) => {
    setEditingTemplate(template);
    setDialogInitialValues(getTemplateValues(template));
    setIsFormDialogOpen(true);
  };

  const submitTemplate = async (values: AnalysisTemplateInput) => {
    setIsSaving(true);
    try {
      const result = editingTemplate
        ? await updateAnalysisTemplateAction(editingTemplate.id, values)
        : await createAnalysisTemplateAction(
            values,
            undefined,
            expectedUserId,
          );

      if (!result.ok) {
        toast({
          title: editingTemplate
            ? "Template update failed"
            : "Template save failed",
          description: result.message,
          variant: "destructive",
        });
        return;
      }

      setTemplates((prev) => {
        if (!editingTemplate) return [...prev, result.template];
        return prev.map((tpl) =>
          tpl.id === result.template.id ? result.template : tpl,
        );
      });
      toast({
        title: editingTemplate ? "Template updated" : "Template created",
        description: `"${result.template.templateName}" is ready to use.`,
      });
      setIsFormDialogOpen(false);
      setEditingTemplate(null);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;
    setIsDeleting(true);
    try {
      const result = await deleteAnalysisTemplateAction(templateToDelete.id);
      if (!result.ok) {
        toast({
          title: "Delete failed",
          description: result.message,
          variant: "destructive",
        });
        return;
      }
      setTemplates((prev) =>
        prev.filter((tpl) => tpl.id !== templateToDelete.id),
      );
      toast({
        title: "Template deleted",
        description: `"${templateToDelete.templateName}" was removed.`,
      });
      setTemplateToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const [busyTemplateId, setBusyTemplateId] = useState<string | null>(null);
  const [applyForTemplate, setApplyForTemplate] =
    useState<AnalysisTemplateOption | null>(null);
  const [dealOptions, setDealOptions] = useState<SavedDealBrief[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState<string>("");
  const [applyingToDeal, setApplyingToDeal] = useState(false);
  const [versionsForTemplate, setVersionsForTemplate] =
    useState<AnalysisTemplateOption | null>(null);
  const [versions, setVersions] = useState<TemplateVersionSummary[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(
    null,
  );

  const handleSetDefault = async (template: AnalysisTemplateOption) => {
    setBusyTemplateId(template.id);
    try {
      const result = await setDefaultTemplateAction(template.id);
      if (!result.ok) {
        toast({
          title: "Couldn't set default",
          description: result.message,
          variant: "destructive",
        });
        return;
      }
      setTemplates((prev) =>
        prev.map((t) => ({ ...t, isDefault: t.id === template.id })),
      );
      toast({
        title: "Default template set",
        description: `"${template.templateName}" is now your default.`,
      });
    } finally {
      setBusyTemplateId(null);
    }
  };

  const handleDuplicate = async (template: AnalysisTemplateOption) => {
    setBusyTemplateId(template.id);
    try {
      const result = await duplicateTemplateAction(template.id);
      if (!result.ok) {
        toast({
          title: "Couldn't duplicate",
          description: result.message,
          variant: "destructive",
        });
        return;
      }
      setTemplates((prev) => [...prev, result.template]);
      toast({
        title: "Template duplicated",
        description: `Created "${result.template.templateName}".`,
      });
    } finally {
      setBusyTemplateId(null);
    }
  };

  const handleUseAsBuyBox = async (template: AnalysisTemplateOption) => {
    if (!template.buyBox) return;
    setBusyTemplateId(template.id);
    try {
      const result = await upsertBuyBoxAction({
        name: template.templateName,
        strategyKind: null,
        minCapRatePct: template.buyBox.minCapRatePct ?? null,
        minCocPct: template.buyBox.minCocPct ?? null,
        minDscr: template.buyBox.minDscr ?? null,
        minCashFlowMonthly: template.buyBox.minCashFlowMonthly ?? null,
        minIrrPct: template.buyBox.minIrrPct ?? null,
        maxCashRequired: template.buyBox.maxCashRequired ?? null,
        maxPurchasePrice: template.buyBox.maxPurchasePrice ?? null,
        propertyTypes: [],
        targetStates: [],
        isActive: true,
        isDefault: true,
      }, expectedUserId);
      if (!result.ok) {
        toast({
          title: "Couldn't set Buy Box",
          description: result.message,
          variant: "destructive",
        });
        return;
      }
      trackEvent("buy_box_saved", {
        source: "template",
        is_default: true,
        has_strategy: false,
      });
      toast({
        title: "Buy Box updated",
        description: `Now using "${template.templateName}" targets as your Buy Box.`,
      });
    } finally {
      setBusyTemplateId(null);
    }
  };

  const openApplyDialog = (template: AnalysisTemplateOption) => {
    setApplyForTemplate(template);
    setSelectedDealId("");
    setDealOptions([]);
    setLoadingDeals(true);
    void listSavedDealsBriefAction()
      .then((res) => {
        if (res.ok) setDealOptions(res.deals);
        else
          toast({
            title: "Couldn't load your deals",
            description: res.message,
            variant: "destructive",
          });
      })
      .catch(() => {
        /* non-critical */
      })
      .finally(() => setLoadingDeals(false));
  };

  const handleApplyToDeal = async () => {
    if (!applyForTemplate || !selectedDealId) return;
    setApplyingToDeal(true);
    try {
      const res = await applyTemplateToDealAction(
        selectedDealId,
        applyForTemplate.id,
      );
      if (!res.ok) {
        toast({
          title: "Couldn't apply template",
          description: res.message,
          variant: "destructive",
        });
        return;
      }
      const dealLabel =
        dealOptions.find((d) => d.id === selectedDealId)?.label ?? "the deal";
      toast({
        title: "Template applied",
        description: `Re-ran ${dealLabel} with "${applyForTemplate.templateName}".`,
      });
      setApplyForTemplate(null);
    } finally {
      setApplyingToDeal(false);
    }
  };

  const openVersionDialog = (template: AnalysisTemplateOption) => {
    setVersionsForTemplate(template);
    setVersions([]);
    setLoadingVersions(true);
    void listTemplateVersionsAction(template.id)
      .then((res) => {
        if (res.ok) setVersions(res.versions);
        else
          toast({
            title: "Couldn't load history",
            description: res.message,
            variant: "destructive",
          });
      })
      .catch(() => {
        /* non-critical */
      })
      .finally(() => setLoadingVersions(false));
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!versionsForTemplate) return;
    setRestoringVersionId(versionId);
    try {
      const res = await restoreTemplateVersionAction(
        versionsForTemplate.id,
        versionId,
      );
      if (!res.ok) {
        toast({
          title: "Couldn't restore version",
          description: res.message,
          variant: "destructive",
        });
        return;
      }
      setTemplates((prev) =>
        prev.map((t) => (t.id === res.template.id ? res.template : t)),
      );
      toast({
        title: "Version restored",
        description: `"${res.template.templateName}" was restored.`,
      });
      setVersionsForTemplate(null);
    } finally {
      setRestoringVersionId(null);
    }
  };

  return (
    <main id="main" className="min-h-full bg-muted/30 pb-12">
      <section className="w-full px-4 sm:px-6 xl:px-8 pt-6 sm:pt-8 space-y-4 sm:space-y-6">
        <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 px-1.5 text-muted-foreground bg-primary/10 sm:bg-transparent"
              asChild
            >
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                <span className="hidden xl:inline">Back</span>
              </Link>
            </Button>
            <div className="h-6 w-px bg-border" />
            <div className="space-y-1">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground xl:text-3xl">
                Templates
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground ">
                Manage reusable assumptions for your analyses.
              </p>
            </div>
          </div>
          <Button
            className="w-full rounded-full sm:ml-auto sm:w-auto"
            onClick={openCreateDialog}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Template
          </Button>
        </div>

        {/* Starter templates - released prebuilt assumption sets. Each opens the create dialog
            pre-populated with the starter's values so the user can
            tweak before saving - perfect for new users who don't yet
            know what every percent field means. */}
        <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-card to-card p-4 sm:p-5">
          <div className="flex items-baseline gap-2">
            <Sparkles className="size-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">
              Start from a strategy template
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Each one opens with editable defaults - make it yours, save it once,
            reuse it forever.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {RELEASED_STARTER_TEMPLATES.map((starter) => (
              <article
                key={starter.key}
                className="flex flex-col gap-2 rounded-xl border border-border bg-background p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold leading-tight text-foreground">
                    {starter.template.templateName.replace(/^Starter - /, "")}
                  </h3>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                    {starter.tag}
                  </span>
                </div>
                <p className="flex-1 text-xs leading-snug text-muted-foreground">
                  {starter.cardDescription}
                </p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span>
                    <strong className="text-foreground">
                      {starter.template.downPaymentPct}%
                    </strong>{" "}
                    down
                  </span>
                  <span>
                    <strong className="text-foreground">
                      {starter.template.interestRatePct}%
                    </strong>{" "}
                    rate
                  </span>
                  <span>
                    <strong className="text-foreground">
                      {starter.template.vacancyPct}%
                    </strong>{" "}
                    vacancy
                  </span>
                  <span>
                    <strong className="text-foreground">
                      {starter.template.managementPct}%
                    </strong>{" "}
                    mgmt
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-1 w-full rounded-full"
                  onClick={() => cloneStarterTemplate(starter)}
                >
                  Customize &amp; save
                </Button>
              </article>
            ))}
          </div>
        </section>

        <div className="flex items-baseline gap-2 pt-1">
          <FileText className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">
            Your templates
          </h2>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 sm:p-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              aria-label="Search templates"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-xl bg-muted/60 border-border"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="space-y-3 p-3 xl:hidden">
            {pagedTemplates.map((template) => (
              <article
                key={template.id}
                className="rounded-2xl border border-border bg-background p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <FileText className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h2 className="text-base font-bold leading-tight text-foreground">
                        {template.templateName}
                      </h2>
                      {template.isDefault ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                          <Star className="size-3" /> Default
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {template.templateDescription?.trim() || "No description"}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Used by {template.usedCount ?? 0}{" "}
                      {(template.usedCount ?? 0) === 1 ? "deal" : "deals"}
                    </p>
                    {template.buyBox ? (
                      <p className="mt-1 text-[11px] font-medium text-primary">
                        Targets: {formatBuyBoxSummary(template.buyBox)}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Down Payment
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-foreground">
                      {toPercentLabel(template.downPaymentPct)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Interest Rate
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-foreground">
                      {toPercentLabel(template.interestRatePct)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Vacancy
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-foreground">
                      {toPercentLabel(template.vacancyPct)}
                    </p>
                  </div>
                  {TAX_STRATEGY_RELEASED ? (
                    <div className="rounded-xl bg-muted/40 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Tax Rate
                      </p>
                      <p className="mt-1 text-sm font-extrabold text-foreground">
                        {toPercentLabel(template.taxRatePct)}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-xl"
                    onClick={() => openEditDialog(template)}
                  >
                    <Pencil className="w-4 h-4 mr-1.5" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-xl"
                    disabled={busyTemplateId === template.id}
                    onClick={() => handleDuplicate(template)}
                  >
                    <Copy className="w-4 h-4 mr-1.5" />
                    Duplicate
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-xl"
                    disabled={
                      template.isDefault || busyTemplateId === template.id
                    }
                    onClick={() => handleSetDefault(template)}
                  >
                    <Star className="w-4 h-4 mr-1.5" />
                    {template.isDefault ? "Default" : "Set default"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-xl text-destructive hover:text-destructive"
                    onClick={() => setTemplateToDelete(template)}
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Delete
                  </Button>
                </div>
                {template.buyBox ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-9 w-full rounded-xl text-primary"
                    disabled={busyTemplateId === template.id}
                    onClick={() => handleUseAsBuyBox(template)}
                  >
                    <Target className="w-4 h-4 mr-1.5" />
                    Use as my Buy Box
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-9 w-full rounded-xl"
                  onClick={() => openApplyDialog(template)}
                >
                  <ArrowRightLeft className="w-4 h-4 mr-1.5" />
                  Apply to a deal
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-9 w-full rounded-xl"
                  onClick={() => openVersionDialog(template)}
                >
                  <History className="w-4 h-4 mr-1.5" />
                  Version history
                </Button>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr className="h-12">
                  <th className="text-left px-4 text-xs uppercase tracking-wider text-muted-foreground font-bold">
                    Template
                  </th>
                  <th className="text-left px-4 text-xs uppercase tracking-wider text-muted-foreground font-bold">
                    Description
                  </th>
                  <th className="text-right px-4 text-xs uppercase tracking-wider text-muted-foreground font-bold">
                    Down Payment
                  </th>
                  <th className="text-right px-4 text-xs uppercase tracking-wider text-muted-foreground font-bold">
                    Interest Rate
                  </th>
                  <th className="text-right px-4 text-xs uppercase tracking-wider text-muted-foreground font-bold">
                    Vacancy
                  </th>
                  {TAX_STRATEGY_RELEASED ? (
                    <th className="text-right px-4 text-xs uppercase tracking-wider text-muted-foreground font-bold">
                      Tax Rate
                    </th>
                  ) : null}
                  <th className="text-right px-4 text-xs uppercase tracking-wider text-muted-foreground font-bold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedTemplates.map((template) => (
                  <tr
                    key={template.id}
                    className="h-[68px] border-b border-border/80 hover:bg-muted/40"
                  >
                    <td className="px-4">
                      <div className="flex items-center gap-2">
                        <span className="mt-0.5 inline-flex size-7 rounded-full bg-primary/10 text-primary items-center justify-center shrink-0">
                          <FileText className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-foreground truncate">
                              {template.templateName}
                            </p>
                            {template.isDefault ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                                <Star className="size-2.5" /> Default
                              </span>
                            ) : null}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Used by {template.usedCount ?? 0}{" "}
                            {(template.usedCount ?? 0) === 1 ? "deal" : "deals"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 text-muted-foreground max-w-[320px] truncate">
                      {template.templateDescription?.trim() || "No description"}
                    </td>
                    <td className="px-4 text-right tabular-nums text-foreground">
                      {toPercentLabel(template.downPaymentPct)}
                    </td>
                    <td className="px-4 text-right tabular-nums text-foreground">
                      {toPercentLabel(template.interestRatePct)}
                    </td>
                    <td className="px-4 text-right tabular-nums text-foreground">
                      {toPercentLabel(template.vacancyPct)}
                    </td>
                    {TAX_STRATEGY_RELEASED ? (
                      <td className="px-4 text-right tabular-nums text-foreground">
                        {toPercentLabel(template.taxRatePct)}
                      </td>
                    ) : null}
                    <td className="px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Apply to a deal"
                          onClick={() => openApplyDialog(template)}
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                          <span className="sr-only">Apply to a deal</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Edit template"
                          onClick={() => openEditDialog(template)}
                        >
                          <Pencil className="w-4 h-4" />
                          <span className="sr-only">Edit template</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          title="Delete template"
                          onClick={() => setTemplateToDelete(template)}
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="sr-only">Delete template</span>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="More actions"
                              disabled={busyTemplateId === template.id}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                              <span className="sr-only">More actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {template.buyBox ? (
                              <DropdownMenuItem
                                disabled={busyTemplateId === template.id}
                                onSelect={() => handleUseAsBuyBox(template)}
                              >
                                <Target className="mr-2 h-4 w-4 text-primary" />
                                Use as my Buy Box
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem
                              disabled={
                                template.isDefault ||
                                busyTemplateId === template.id
                              }
                              onSelect={() => handleSetDefault(template)}
                            >
                              <Star className="mr-2 h-4 w-4" />
                              {template.isDefault
                                ? "Default template"
                                : "Set as default"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={busyTemplateId === template.id}
                              onSelect={() => handleDuplicate(template)}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => openVersionDialog(template)}
                            >
                              <History className="mr-2 h-4 w-4" />
                              Version history
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredTemplates.length > 0 ? (
            <div className="flex flex-col gap-3 border-t border-border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {pageStartIndex + 1}-{pageEndIndex} of{" "}
                {filteredTemplates.length} templates
              </p>
              {pageCount > 1 ? (
                <Pagination className="mx-0 w-auto justify-start sm:justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(Math.max(1, safeCurrentPage - 1));
                        }}
                        aria-disabled={safeCurrentPage <= 1}
                        className={
                          safeCurrentPage <= 1
                            ? "pointer-events-none opacity-50"
                            : ""
                        }
                      />
                    </PaginationItem>
                    {paginationPages.map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          href="#"
                          isActive={page === safeCurrentPage}
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(page);
                          }}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(
                            Math.min(pageCount, safeCurrentPage + 1),
                          );
                        }}
                        aria-disabled={safeCurrentPage >= pageCount}
                        className={
                          safeCurrentPage >= pageCount
                            ? "pointer-events-none opacity-50"
                            : ""
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              ) : null}
            </div>
          ) : null}

          {filteredTemplates.length === 0 && (
            <div className="py-16 px-6 text-center">
              <p className="text-sm font-semibold text-foreground">
                No templates found
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Try a different search or create a new template.
              </p>
            </div>
          )}
        </div>
      </section>

      <TemplateFormDialog
        open={isFormDialogOpen}
        onOpenChange={(open) => {
          if (!open) setEditingTemplate(null);
          setIsFormDialogOpen(open);
        }}
        editingTemplate={editingTemplate}
        initialValues={dialogInitialValues}
        isSaving={isSaving}
        onSubmit={submitTemplate}
        formId="templates-management-dialog-form"
        editDescription="Update template assumptions."
      />

      <Dialog
        open={!!templateToDelete}
        onOpenChange={(open) => {
          if (!open && isDeleting) return;
          if (!open) setTemplateToDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete template?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Review the template details before
              confirming.
            </DialogDescription>
          </DialogHeader>

          {templateToDelete && (
            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {templateToDelete.templateName}
              </p>
              <p className="text-xs text-muted-foreground">
                {templateToDelete.templateDescription?.trim() ||
                  "No description"}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setTemplateToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={() => void confirmDelete()}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Template
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!applyForTemplate}
        onOpenChange={(open) => {
          if (!open && applyingToDeal) return;
          if (!open) setApplyForTemplate(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply template to a deal</DialogTitle>
            <DialogDescription>
              Re-runs the deal with{" "}
              {applyForTemplate?.templateName ?? "this template"} assumptions.
              Price, beds, and rent stay; financing, expenses, and growth
              update.
            </DialogDescription>
          </DialogHeader>

          {loadingDeals ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading your deals…
            </div>
          ) : dealOptions.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground">
                No saved deals yet — analyze a property and save it, then apply
                this template to it.
              </p>
              <Button
                asChild
                className="mt-3 rounded-full"
                onClick={() => setApplyForTemplate(null)}
              >
                <Link href="/dashboard/new?fresh=1">Analyze a property</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label
                htmlFor="apply-deal-select"
                className="text-xs font-semibold text-muted-foreground"
              >
                Choose a saved deal
              </label>
              <select
                id="apply-deal-select"
                value={selectedDealId}
                onChange={(e) => setSelectedDealId(e.target.value)}
                /* text-base below md: iOS Safari zooms the page in on sub-16px
                   form controls (the Input primitive encodes the same rule). */
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-base md:text-sm"
              >
                <option value="">Select a deal…</option>
                {dealOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={applyingToDeal}
              onClick={() => setApplyForTemplate(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!selectedDealId || applyingToDeal}
              onClick={() => void handleApplyToDeal()}
            >
              {applyingToDeal ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Applying…
                </>
              ) : (
                "Apply template"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!versionsForTemplate}
        onOpenChange={(open) => {
          if (!open && restoringVersionId) return;
          if (!open) setVersionsForTemplate(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Version history</DialogTitle>
            <DialogDescription>
              Saved versions of{" "}
              {versionsForTemplate?.templateName ?? "this template"}. Restore
              one to roll its assumptions back.
            </DialogDescription>
          </DialogHeader>

          {loadingVersions ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading history…
            </div>
          ) : versions.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              No saved versions yet. Each edit you make is recorded here.
            </p>
          ) : (
            <div className="max-h-[50vh] space-y-2 overflow-y-auto">
              {versions.map((v, i) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      v{v.version}
                      {i === 0 ? " · current" : ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(v.createdAt).toLocaleString()} ·{" "}
                      {v.downPaymentPct ?? "—"}% down ·{" "}
                      {v.interestRatePct ?? "—"}% rate · {v.vacancyPct ?? "—"}%
                      vac
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={i === 0 || restoringVersionId != null}
                    onClick={() => void handleRestoreVersion(v.id)}
                  >
                    {restoringVersionId === v.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Restore"
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setVersionsForTemplate(null)}
              disabled={restoringVersionId != null}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
