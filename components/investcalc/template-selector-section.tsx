"use client";

import { useEffect, useState } from "react";
import { UseFormReturn, useFormState } from "react-hook-form";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  Lock,
  Pencil,
  Plus,
} from "lucide-react";
import { InvestmentFormValues } from "@/lib/investcalc-schema";
import type { AnalysisTemplateInput } from "@/lib/analysis-template-schema";
import {
  AnalysisTemplateOption,
  createAnalysisTemplateAction,
  getTemplateAccessAction,
  listAnalysisTemplatesAction,
  updateAnalysisTemplateAction,
} from "@/app/actions/analysis-templates";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { TemplateFormDialog } from "@/components/investcalc/template-form-dialog";
import { cn } from "@/lib/utils";

interface TemplateSelectorSectionProps {
  form: UseFormReturn<InvestmentFormValues>;
  savedTemplateFallback?: {
    id: string;
    templateName: string;
    templateDescription: string | null;
  } | null;
}

export function TemplateSelectorSection({
  form,
  savedTemplateFallback = null,
}: TemplateSelectorSectionProps) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<AnalysisTemplateOption[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AnalysisTemplateOption | null>(null);
  const [dialogInitialValues, setDialogInitialValues] = useState<AnalysisTemplateInput | null>(null);
  const [isTemplateLocked, setIsTemplateLocked] = useState(true);
  const [templateLockMessage, setTemplateLockMessage] = useState(
    "Upgrade to Pro to unlock template management."
  );

  const templateId = form.watch("templateId");
  const { errors: mainFormErrors } = useFormState({ control: form.control });
  const selectedTemplate = templates.find((t) => t.id === templateId);
  const displayTemplate =
    selectedTemplate ??
    (savedTemplateFallback && savedTemplateFallback.id === templateId
      ? savedTemplateFallback
      : null);
  const isInteractionBlocked = isTemplateLocked || isLoadingTemplates;

  const getTemplateValuesFromCurrentForm = (): AnalysisTemplateInput => ({
    templateName: "",
    templateDescription: "",
    propertyTaxPct: form.getValues("propertyTaxPct") ?? 1.1,
    insuranceInputMode: form.getValues("insuranceInputMode"),
    insurancePct: form.getValues("insurancePct"),
    insuranceMo: form.getValues("insuranceMonthly"),
    maintenancePct: form.getValues("maintenancePct"),
    vacancyPct: form.getValues("vacancyPct"),
    managementPct: form.getValues("mgmtPct"),
    capexPct: form.getValues("capexPct"),
    closingCostsPct: form.getValues("closingCostsPct") ?? 3,
    interestRatePct: form.getValues("interestRate"),
    downPaymentPct: form.getValues("downPaymentPct"),
    expenseGrowthPct: form.getValues("expenseGrowthPct"),
    rentGrowthPct: form.getValues("rentGrowthPct"),
    appreciationRatePct: form.getValues("appreciationRatePct"),
    sellingCostPct: form.getValues("sellingCostPct"),
    buildingValuePct: form.getValues("buildingValuePct"),
    depreciationYears: form.getValues("depreciationYears"),
    includeInterestDeduction: form.getValues("includeInterestDeduction"),
    taxRatePct: form.getValues("taxRatePct"),
  });

  const getTemplateValuesFromTemplate = (template: AnalysisTemplateOption): AnalysisTemplateInput => ({
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
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const access = await getTemplateAccessAction();
      if (cancelled) return;

      if (!access.allowed) {
        setTemplates([]);
        setIsTemplateLocked(true);
        setTemplateLockMessage(access.message);
        setIsOpen(false);
        setIsLoadingTemplates(false);
        return;
      }

      setIsTemplateLocked(false);
      setIsLoadingTemplates(true);
      const result = await listAnalysisTemplatesAction();
      if (cancelled) return;

      if (!result.ok) {
        toast({
          title: "Could not load templates",
          description: result.message,
          variant: "destructive",
        });
        setIsLoadingTemplates(false);
        return;
      }
      setTemplates(result.templates);
      setIsLoadingTemplates(false);
    };

    // .catch shields the outer effect from unhandled rejections if
    // either of the inner `await` calls throws (network blip, server
    // crash, transient outage). Without this, a throw becomes a
    // "Non-Error promise rejection captured" Sentry alert with no
    // useful context. Leaving templates empty + clearing the loading
    // state is the user-visible fallback.
    void load().catch((err) => {
      if (cancelled) return;
      console.warn("[templates] load failed:", err);
      setTemplates([]);
      setIsLoadingTemplates(false);
    });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const applyTemplateToForm = (tpl: AnalysisTemplateOption) => {
    form.setValue("propertyTaxPct", tpl.propertyTaxPct, { shouldDirty: true, shouldValidate: true });
    form.setValue("insuranceInputMode", tpl.insuranceInputMode, { shouldDirty: true });
    form.setValue("insurancePct", tpl.insurancePct ?? undefined, { shouldDirty: true });
    form.setValue("insuranceMonthly", tpl.insuranceMo ?? undefined, { shouldDirty: true });
    // Clamp the four expense %s to the analyzer form's 50% ceiling. New
    // templates are already capped at 50 (analysis-template-schema.ts), but a
    // legacy template saved under the old 100% cap would otherwise push the
    // form past its max and surface a "Max 50%" error on a field the user
    // never touched.
    form.setValue("maintenancePct", Math.min(tpl.maintenancePct, 50), { shouldDirty: true });
    form.setValue("vacancyPct", Math.min(tpl.vacancyPct, 50), { shouldDirty: true });
    form.setValue("mgmtPct", Math.min(tpl.managementPct, 50), { shouldDirty: true });
    form.setValue("capexPct", Math.min(tpl.capexPct, 50), { shouldDirty: true });
    form.setValue("closingCostsPct", tpl.closingCostsPct, { shouldDirty: true });
    form.setValue("interestRate", tpl.interestRatePct, { shouldDirty: true });
    form.setValue("downPaymentPct", tpl.downPaymentPct, { shouldDirty: true });
    form.setValue("expenseGrowthPct", tpl.expenseGrowthPct, { shouldDirty: true });
    form.setValue("rentGrowthPct", tpl.rentGrowthPct, { shouldDirty: true });
    form.setValue("appreciationRatePct", tpl.appreciationRatePct, { shouldDirty: true });
    form.setValue("sellingCostPct", tpl.sellingCostPct, { shouldDirty: true });
    form.setValue("buildingValuePct", tpl.buildingValuePct, { shouldDirty: true });
    form.setValue("depreciationYears", tpl.depreciationYears, { shouldDirty: true });
    form.setValue("includeInterestDeduction", tpl.includeInterestDeduction, { shouldDirty: true });
    form.setValue("taxRatePct", tpl.taxRatePct === 24 ? undefined : tpl.taxRatePct, {
      shouldDirty: true,
    });
  };

  const handleTemplateChange = (value: string) => {
    if (value === "__none__") {
      form.setValue("templateId", undefined, { shouldValidate: true, shouldDirty: true });
      setIsOpen(false);
      return;
    }
    const tpl = templates.find((t) => t.id === value);
    if (tpl) {
      applyTemplateToForm(tpl);
      form.setValue("templateId", value, { shouldValidate: true, shouldDirty: true });
    }
    setIsOpen(false);
  };

  const openDialog = () => {
    setEditingTemplate(null);
    setDialogInitialValues(getTemplateValuesFromCurrentForm());
    setIsDialogOpen(true);
  };

  const openEditDialog = (template: AnalysisTemplateOption) => {
    setEditingTemplate(template);
    setDialogInitialValues(getTemplateValuesFromTemplate(template));
    setIsDialogOpen(true);
  };

  const submitTemplate = async (values: AnalysisTemplateInput) => {
    setIsSavingTemplate(true);
    try {
      const result = editingTemplate
        ? await updateAnalysisTemplateAction(editingTemplate.id, values)
        : await createAnalysisTemplateAction(values);
      if (!result.ok) {
        if (result.code === "ENTITLEMENT_TEMPLATE") {
          toast({
            title: editingTemplate ? "Upgrade required to edit" : "Upgrade required",
            description: result.message,
            variant: "destructive",
          });
          return;
        }
        if (result.code === "DUPLICATE_TEMPLATE_NAME") {
          toast({
            title: "Duplicate template name",
            description: result.message,
            variant: "destructive",
          });
          return;
        }
        toast({
          title: editingTemplate ? "Template could not be updated" : "Template could not be saved",
          description: result.message,
          variant: "destructive",
        });
        return;
      }

      setTemplates((prev) => {
        if (!editingTemplate) return [...prev, result.template];
        return prev.map((template) =>
          template.id === result.template.id ? result.template : template
        );
      });
      applyTemplateToForm(result.template);
      form.setValue("templateId", result.template.id, { shouldDirty: true, shouldValidate: true });
      toast({
        title: editingTemplate ? "Template updated" : "Template saved",
        description: editingTemplate
          ? `Template "${result.template.templateName}" was updated successfully.`
          : `Template "${result.template.templateName}" was saved successfully.`,
      });
      setEditingTemplate(null);
      setIsDialogOpen(false);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Templates are a Pro feature, so for free/locked users we render NOTHING
  // at all - "invisible until useful". A locked control in the first-run form
  // is friction on a cold (often ad-sourced) visitor and reads as a
  // bait-and-switch on the "no signup" promise. Pro users (not locked) see the
  // picker as soon as it's useful; free users simply never see this section.
  if (isTemplateLocked) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Calculation Template
      </p>
      <div className="flex min-w-0 items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <button
            type="button"
            onClick={() => {
              if (isInteractionBlocked) return;
              setIsOpen((v) => !v);
            }}
            disabled={isInteractionBlocked}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-label={`Calculation template: ${
              isTemplateLocked ? "locked" : displayTemplate?.templateName ?? "no template"
            }`}
            aria-describedby={mainFormErrors.templateId?.message ? "templateId-error" : undefined}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all text-left",
              "bg-[var(--brand-blue-light)] border-primary/20 hover:border-primary/50",
              isInteractionBlocked && "opacity-80 cursor-not-allowed hover:border-primary/20"
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="w-5 h-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary truncate">
                  {isTemplateLocked
                    ? "Templates are locked"
                    : displayTemplate?.templateName ?? "No template"}
                </p>
                <p className="text-xs text-primary/70 truncate">
                  {isTemplateLocked
                    ? templateLockMessage
                    : displayTemplate?.templateDescription?.trim() || "Optional preset for assumptions"}
                </p>
              </div>
            </div>
            {isTemplateLocked ? (
              <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
            ) : isLoadingTemplates ? (
              <Loader2 className="w-4 h-4 text-muted-foreground shrink-0 animate-spin" />
            ) : isOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
          </button>

          {isOpen && !isTemplateLocked && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-30 overflow-hidden">
              <Command shouldFilter className="rounded-xl bg-transparent">
                <CommandInput placeholder="Search templates..." className="h-10" />
                <CommandList className="max-h-72">
                  <CommandEmpty>No templates found.</CommandEmpty>

                  <CommandItem
                    value="__none__ no template use manual values only"
                    onSelect={() => handleTemplateChange("__none__")}
                    className={cn(
                      "w-full !p-0 rounded-none data-[selected=true]:bg-transparent",
                      !selectedTemplate && "bg-[var(--brand-blue-light)]"
                    )}
                  >
                    <div
                      className={cn(
                        "w-full flex items-start gap-3 px-4 py-3.5 hover:bg-muted transition-colors text-left",
                        !selectedTemplate && "bg-[var(--brand-blue-light)]"
                      )}
                    >
                      <FileText className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">No template</p>
                        <p className="text-xs text-muted-foreground">Use manual values only</p>
                      </div>
                    </div>
                  </CommandItem>

                  {templates.map((template) => {
                    const isSelected = selectedTemplate?.id === template.id;
                    return (
                      <CommandItem
                        key={template.id}
                        value={`${template.templateName} ${template.templateDescription ?? ""}`}
                        onSelect={() => handleTemplateChange(template.id)}
                        className={cn(
                          "w-full !p-0 rounded-none data-[selected=true]:bg-transparent",
                          isSelected && "bg-[var(--brand-blue-light)]"
                        )}
                      >
                        <div
                          className={cn(
                            "w-full flex items-start justify-between gap-3 px-4 py-3.5 hover:bg-muted transition-colors text-left",
                            isSelected && "bg-[var(--brand-blue-light)]"
                          )}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <FileText className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {template.templateName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {template.templateDescription?.trim() || "No description"}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setIsOpen(false);
                              openEditDialog(template);
                            }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span className="sr-only">Edit template</span>
                          </Button>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandList>
              </Command>
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={openDialog}
          className="shrink-0"
          disabled={isInteractionBlocked}
        >
          <Plus className="w-4 h-4" />
          <span className="sr-only">Create template</span>
        </Button>
      </div>
      {mainFormErrors.templateId?.message && (
        <p id="templateId-error" role="alert" className="text-xs text-destructive">
          {mainFormErrors.templateId?.message}
        </p>
      )}

      {dialogInitialValues && (
        <TemplateFormDialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            if (!open) setEditingTemplate(null);
            setIsDialogOpen(open);
          }}
          editingTemplate={editingTemplate}
          initialValues={dialogInitialValues}
          isSaving={isSavingTemplate}
          onSubmit={submitTemplate}
          formId="template-selector-dialog-form"
          editDescription="Update your reusable assumptions."
        />
      )}
    </div>
  );
}
