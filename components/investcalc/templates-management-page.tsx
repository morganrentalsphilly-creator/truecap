"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import type { AnalysisTemplateOption } from "@/app/actions/analysis-templates";
import {
  createAnalysisTemplateAction,
  deleteAnalysisTemplateAction,
  updateAnalysisTemplateAction,
} from "@/app/actions/analysis-templates";
import type { AnalysisTemplateInput } from "@/lib/analysis-template-schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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

const TEMPLATE_PAGE_SIZE = 10;

function toPercentLabel(value: number): string {
  return `${value.toFixed(1)}%`;
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

function getTemplateValues(template: AnalysisTemplateOption): AnalysisTemplateInput {
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
  };
}

export function TemplatesManagementPage({
  initialTemplates,
}: {
  initialTemplates: AnalysisTemplateOption[];
}) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState(initialTemplates);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AnalysisTemplateOption | null>(null);
  const [dialogInitialValues, setDialogInitialValues] =
    useState<AnalysisTemplateInput>(DEFAULT_TEMPLATE_VALUES);
  const [isSaving, setIsSaving] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<AnalysisTemplateOption | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((template) => {
      const hay = `${template.templateName} ${template.templateDescription ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [searchQuery, templates]);

  const pageCount = Math.max(1, Math.ceil(filteredTemplates.length / TEMPLATE_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, pageCount);
  const pageStartIndex = filteredTemplates.length === 0 ? 0 : (safeCurrentPage - 1) * TEMPLATE_PAGE_SIZE;
  const pageEndIndex = Math.min(pageStartIndex + TEMPLATE_PAGE_SIZE, filteredTemplates.length);
  const pagedTemplates = useMemo(
    () => filteredTemplates.slice(pageStartIndex, pageEndIndex),
    [filteredTemplates, pageEndIndex, pageStartIndex]
  );

  const paginationPages = useMemo(() => {
    const pages = new Set<number>([1, pageCount, safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1]);
    return [...pages].filter((page) => page >= 1 && page <= pageCount).sort((a, b) => a - b);
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
        : await createAnalysisTemplateAction(values);

      if (!result.ok) {
        toast({
          title: editingTemplate ? "Template update failed" : "Template save failed",
          description: result.message,
          variant: "destructive",
        });
        return;
      }

      setTemplates((prev) => {
        if (!editingTemplate) return [...prev, result.template];
        return prev.map((tpl) => (tpl.id === result.template.id ? result.template : tpl));
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
      setTemplates((prev) => prev.filter((tpl) => tpl.id !== templateToDelete.id));
      toast({
        title: "Template deleted",
        description: `"${templateToDelete.templateName}" was removed.`,
      });
      setTemplateToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main className="min-h-full bg-muted/30 pb-12">
      <section className="w-full px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              Calculation Templates
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage reusable assumptions for your analyses.
            </p>
          </div>
          <Button className="rounded-full" onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-1.5" />
            New Template
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3 sm:p-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-xl bg-muted/60 border-border"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-sm">
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
                  <th className="text-right px-4 text-xs uppercase tracking-wider text-muted-foreground font-bold">
                    Tax Rate
                  </th>
                  <th className="text-right px-4 text-xs uppercase tracking-wider text-muted-foreground font-bold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedTemplates.map((template) => (
                  <tr key={template.id} className="h-[68px] border-b border-border/80 hover:bg-muted/40">
                    <td className="px-4">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 inline-flex size-7 rounded-full bg-primary/10 text-primary items-center justify-center shrink-0">
                          <FileText className="w-3.5 h-3.5" />
                        </span>
                        <p className="font-semibold text-foreground">{template.templateName}</p>
                      </div>
                    </td>
                    <td className="px-4 text-muted-foreground max-w-[320px] truncate">
                      {template.templateDescription?.trim() || "No description"}
                    </td>
                    <td className="px-4 text-right tabular-nums text-foreground">{toPercentLabel(template.downPaymentPct)}</td>
                    <td className="px-4 text-right tabular-nums text-foreground">{toPercentLabel(template.interestRatePct)}</td>
                    <td className="px-4 text-right tabular-nums text-foreground">{toPercentLabel(template.vacancyPct)}</td>
                    <td className="px-4 text-right tabular-nums text-foreground">{toPercentLabel(template.taxRatePct)}</td>
                    <td className="px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
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
                          onClick={() => setTemplateToDelete(template)}
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="sr-only">Delete template</span>
                        </Button>
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
                Showing {pageStartIndex + 1}-{pageEndIndex} of {filteredTemplates.length} templates
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
                        className={safeCurrentPage <= 1 ? "pointer-events-none opacity-50" : ""}
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
                          setCurrentPage(Math.min(pageCount, safeCurrentPage + 1));
                        }}
                        aria-disabled={safeCurrentPage >= pageCount}
                        className={safeCurrentPage >= pageCount ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              ) : null}
            </div>
          ) : null}

          {filteredTemplates.length === 0 && (
            <div className="py-16 px-6 text-center">
              <p className="text-sm font-semibold text-foreground">No templates found</p>
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
              This action cannot be undone. Review the template details before confirming.
            </DialogDescription>
          </DialogHeader>

          {templateToDelete && (
            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1">
              <p className="text-sm font-semibold text-foreground">{templateToDelete.templateName}</p>
              <p className="text-xs text-muted-foreground">
                {templateToDelete.templateDescription?.trim() || "No description"}
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
    </main>
  );
}
