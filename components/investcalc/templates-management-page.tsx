"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FileText,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { AnalysisTemplateOption } from "@/app/actions/analysis-templates";
import {
  createAnalysisTemplateAction,
  deleteAnalysisTemplateAction,
  updateAnalysisTemplateAction,
} from "@/app/actions/analysis-templates";
import {
  analysisTemplateSchema,
  type AnalysisTemplateInput,
  TEMPLATE_DESCRIPTION_MAX_LENGTH,
} from "@/lib/analysis-template-schema";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type NumericTemplateField =
  | "propertyTaxPct"
  | "insuranceMo"
  | "maintenancePct"
  | "vacancyPct"
  | "managementPct"
  | "capexPct"
  | "closingCostsPct"
  | "interestRatePct"
  | "downPaymentPct"
  | "expenseGrowthPct"
  | "rentGrowthPct"
  | "buildingValuePct"
  | "taxRatePct";

function NumberInputField({
  form,
  name,
  label,
  hint,
  step = "0.1",
  allowEmpty = false,
}: {
  form: ReturnType<typeof useForm<AnalysisTemplateInput>>;
  name: NumericTemplateField;
  label: string;
  hint?: string;
  step?: string;
  allowEmpty?: boolean;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-xs font-semibold uppercase tracking-wide">{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              min={0}
              step={step}
              value={Number.isFinite(field.value) ? field.value : ""}
              onChange={(e) => {
                const next = e.target.value;
                field.onChange(next === "" ? (allowEmpty ? undefined : 0) : Number(next));
              }}
            />
          </FormControl>
          {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AnalysisTemplateOption | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<AnalysisTemplateOption | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const templateForm = useForm<AnalysisTemplateInput>({
    resolver: zodResolver(analysisTemplateSchema),
    defaultValues: {
      templateName: "",
      templateDescription: "",
      propertyTaxPct: 1.1,
      insuranceMo: 0,
      maintenancePct: 10,
      vacancyPct: 5,
      managementPct: 8,
      capexPct: 5,
      closingCostsPct: 3,
      interestRatePct: 6.5,
      downPaymentPct: 20,
      expenseGrowthPct: 3,
      rentGrowthPct: 3,
      buildingValuePct: 85,
      depreciationYears: 27.5,
      includeInterestDeduction: true,
      taxRatePct: 24,
    },
  });

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((template) => {
      const hay = `${template.templateName} ${template.templateDescription ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [searchQuery, templates]);

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setShowAdvanced(false);
    templateForm.reset({
      templateName: "",
      templateDescription: "",
      propertyTaxPct: 1.1,
      insuranceMo: 0,
      maintenancePct: 10,
      vacancyPct: 5,
      managementPct: 8,
      capexPct: 5,
      closingCostsPct: 3,
      interestRatePct: 6.5,
      downPaymentPct: 20,
      expenseGrowthPct: 3,
      rentGrowthPct: 3,
      buildingValuePct: 85,
      depreciationYears: 27.5,
      includeInterestDeduction: true,
      taxRatePct: 24,
    });
    setIsFormDialogOpen(true);
  };

  const openEditDialog = (template: AnalysisTemplateOption) => {
    setEditingTemplate(template);
    setShowAdvanced(false);
    templateForm.reset({
      templateName: template.templateName,
      templateDescription: template.templateDescription ?? "",
      propertyTaxPct: template.propertyTaxPct,
      insuranceMo: template.insuranceMo,
      maintenancePct: template.maintenancePct,
      vacancyPct: template.vacancyPct,
      managementPct: template.managementPct,
      capexPct: template.capexPct,
      closingCostsPct: template.closingCostsPct,
      interestRatePct: template.interestRatePct,
      downPaymentPct: template.downPaymentPct,
      expenseGrowthPct: template.expenseGrowthPct,
      rentGrowthPct: template.rentGrowthPct,
      buildingValuePct: template.buildingValuePct,
      depreciationYears: template.depreciationYears,
      includeInterestDeduction: template.includeInterestDeduction,
      taxRatePct: template.taxRatePct,
    });
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
    <main className="min-h-[calc(100vh-4rem)] bg-muted/30 pb-12">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
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
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr className="h-12">
                  <th className="text-left px-4 text-xs uppercase tracking-wider text-muted-foreground font-bold">
                    Template
                  </th>
                  <th className="text-left px-4 text-xs uppercase tracking-wider text-muted-foreground font-bold">
                    Description
                  </th>
                  <th className="text-right px-4 text-xs uppercase tracking-wider text-muted-foreground font-bold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTemplates.map((template) => (
                  <tr key={template.id} className="h-[68px] border-b border-border/80 hover:bg-muted/40">
                    <td className="px-4">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 inline-flex size-7 rounded-full bg-primary/10 text-primary items-center justify-center shrink-0">
                          <FileText className="w-3.5 h-3.5" />
                        </span>
                        <p className="font-semibold text-foreground">{template.templateName}</p>
                      </div>
                    </td>
                    <td className="px-4 text-muted-foreground">
                      {template.templateDescription?.trim() || "No description"}
                    </td>
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

      <Dialog
        open={isFormDialogOpen}
        onOpenChange={(open) => {
          if (!open && isSaving) return;
          if (!open) setEditingTemplate(null);
          setIsFormDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Calculation Template" : "Create Calculation Template"}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? "Update template assumptions."
                : "Save reusable assumptions for future calculations."}
            </DialogDescription>
          </DialogHeader>

          <Form {...templateForm}>
            <form onSubmit={templateForm.handleSubmit(submitTemplate)} className="space-y-5">
              <FormField
                control={templateForm.control}
                name="templateName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Rental Template" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={templateForm.control}
                name="templateDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Short Description</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Traditional rental property"
                        maxLength={TEMPLATE_DESCRIPTION_MAX_LENGTH}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <NumberInputField
                  form={templateForm}
                  name="propertyTaxPct"
                  label="Property Tax % (Annual)"
                  hint="Annual property tax rate used in calculations."
                />
                <NumberInputField
                  form={templateForm}
                  name="insuranceMo"
                  label="Insurance (Monthly $)"
                  hint="Fixed monthly insurance cost."
                />
                <NumberInputField form={templateForm} name="maintenancePct" label="Maintenance %" />
                <NumberInputField form={templateForm} name="vacancyPct" label="Vacancy %" />
                <NumberInputField form={templateForm} name="managementPct" label="Management %" />
                <NumberInputField form={templateForm} name="capexPct" label="CapEx %" />
                <NumberInputField
                  form={templateForm}
                  name="closingCostsPct"
                  label="Closing Costs % (Optional)"
                  hint="Defaults to 3% if left blank."
                  allowEmpty
                />
              </div>

              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
                  "hover:bg-muted transition-colors"
                )}
              >
                {showAdvanced ? "Hide Advanced" : "Show Advanced"}
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <NumberInputField form={templateForm} name="interestRatePct" label="Interest Rate %" />
                  <NumberInputField form={templateForm} name="downPaymentPct" label="Down Payment %" />
                  <NumberInputField form={templateForm} name="expenseGrowthPct" label="Expense Growth %" />
                  <NumberInputField form={templateForm} name="rentGrowthPct" label="Rent Growth %" />
                  <NumberInputField form={templateForm} name="buildingValuePct" label="Building Value %" />
                  <NumberInputField
                    form={templateForm}
                    name="taxRatePct"
                    label="Tax Rate % (Optional)"
                    allowEmpty
                  />
                  <FormField
                    control={templateForm.control}
                    name="depreciationYears"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                          Depreciation Period
                        </FormLabel>
                        <FormControl>
                          <select
                            className="w-full h-10 rounded-md border px-3 text-sm bg-background"
                            value={field.value}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          >
                            <option value={27.5}>27.5 years (Residential)</option>
                            <option value={39}>39 years (Commercial)</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={templateForm.control}
                    name="includeInterestDeduction"
                    render={({ field }) => (
                      <FormItem className="rounded-md border px-3 py-2.5 flex items-center justify-between gap-3">
                        <FormLabel
                          htmlFor="template-include-interest-deduction-page"
                          className="text-xs font-semibold uppercase tracking-wide cursor-pointer"
                        >
                          Include Interest Deduction
                        </FormLabel>
                        <FormControl>
                          <Switch
                            id="template-include-interest-deduction-page"
                            checked={field.value ?? true}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaving}
                  onClick={() => setIsFormDialogOpen(false)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {editingTemplate ? "Updating Template..." : "Saving Template..."}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {editingTemplate ? "Update Template" : "Save Template"}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

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
