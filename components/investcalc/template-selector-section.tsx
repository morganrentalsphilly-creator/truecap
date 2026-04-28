"use client";

import { useEffect, useState } from "react";
import { UseFormReturn, useForm, useFormState } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Save,
  X,
} from "lucide-react";
import { InvestmentFormValues } from "@/lib/investcalc-schema";
import {
  AnalysisTemplateInput,
  TEMPLATE_DESCRIPTION_MAX_LENGTH,
  analysisTemplateSchema,
} from "@/lib/analysis-template-schema";
import {
  AnalysisTemplateOption,
  createAnalysisTemplateAction,
  getTemplateAccessAction,
  listAnalysisTemplatesAction,
  updateAnalysisTemplateAction,
} from "@/app/actions/analysis-templates";
import { DEFAULT_APPRECIATION_RATE, DEFAULT_SELLING_COST_PCT } from "@/lib/exit-scenarios";
import { useToast } from "@/hooks/use-toast";
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
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface TemplateSelectorSectionProps {
  form: UseFormReturn<InvestmentFormValues>;
  savedTemplateFallback?: {
    id: string;
    templateName: string;
    templateDescription: string | null;
  } | null;
}

type NumericTemplateField =
  | "propertyTaxPct"
  | "insurancePct"
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
  | "appreciationRatePct"
  | "sellingCostPct"
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

export function TemplateSelectorSection({
  form,
  savedTemplateFallback = null,
}: TemplateSelectorSectionProps) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<AnalysisTemplateOption[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AnalysisTemplateOption | null>(null);
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

  const templateForm = useForm<AnalysisTemplateInput>({
    resolver: zodResolver(analysisTemplateSchema),
    defaultValues: {
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
    },
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

    void load();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const applyTemplateToForm = (tpl: AnalysisTemplateOption) => {
    form.setValue("propertyTaxPct", tpl.propertyTaxPct, { shouldDirty: true, shouldValidate: true });
    form.setValue("insuranceInputMode", tpl.insuranceInputMode, { shouldDirty: true });
    form.setValue("insurancePct", tpl.insurancePct ?? undefined, { shouldDirty: true });
    form.setValue("insuranceMonthly", tpl.insuranceMo ?? undefined, { shouldDirty: true });
    form.setValue("maintenancePct", tpl.maintenancePct, { shouldDirty: true });
    form.setValue("vacancyPct", tpl.vacancyPct, { shouldDirty: true });
    form.setValue("mgmtPct", tpl.managementPct, { shouldDirty: true });
    form.setValue("capexPct", tpl.capexPct, { shouldDirty: true });
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
    setShowAdvanced(false);
    setEditingTemplate(null);
    templateForm.reset({
      ...templateForm.getValues(),
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
    setIsDialogOpen(true);
  };

  const openEditDialog = (template: AnalysisTemplateOption) => {
    setShowAdvanced(false);
    setEditingTemplate(template);
    templateForm.reset({
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

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Calculation Template
      </p>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => {
              if (isInteractionBlocked) return;
              setIsOpen((v) => !v);
            }}
            disabled={isInteractionBlocked}
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
        <p className="text-xs text-destructive">{mainFormErrors.templateId?.message}</p>
      )}

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open && isSavingTemplate) return;
          if (!open) setEditingTemplate(null);
          setIsDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Calculation Template" : "Create Calculation Template"}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? "Update your reusable assumptions."
                : "Save reusable assumptions for future calculations."}
            </DialogDescription>
          </DialogHeader>

          <Form {...templateForm}>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void templateForm.handleSubmit(submitTemplate)(event);
              }}
              className="space-y-5"
            >
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
                <FormField
                  control={templateForm.control}
                  name="insuranceInputMode"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2 lg:col-span-1">
                      <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                        Insurance Input
                      </FormLabel>
                      <div className="flex rounded-lg border border-border bg-muted/40 p-1">
                        {[
                          { value: "percent", label: "Annual %" },
                          { value: "monthly", label: "Monthly $" },
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => field.onChange(option.value)}
                            className={cn(
                              "flex-1 rounded-md px-3 py-2 text-xs font-semibold transition-colors",
                              field.value === option.value
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Save insurance assumptions as an annual percent or a flat monthly cost.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {templateForm.watch("insuranceInputMode") === "percent" ? (
                  <NumberInputField
                    form={templateForm}
                    name="insurancePct"
                    label="Insurance % (Annual)"
                    hint="Applied to purchase price each year."
                  />
                ) : (
                  <NumberInputField
                    form={templateForm}
                    name="insuranceMo"
                    label="Insurance (Monthly $)"
                    hint="Fixed monthly insurance cost."
                  />
                )}
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
                {showAdvanced ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Hide Advanced
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Show Advanced
                  </>
                )}
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <NumberInputField form={templateForm} name="interestRatePct" label="Interest Rate %" />
                  <NumberInputField form={templateForm} name="downPaymentPct" label="Down Payment %" />
                  <NumberInputField form={templateForm} name="expenseGrowthPct" label="Expense Growth %" />
                  <NumberInputField form={templateForm} name="rentGrowthPct" label="Rent Growth %" />
                  <NumberInputField
                    form={templateForm}
                    name="appreciationRatePct"
                    label="Annual Appreciation % (Optional)"
                    hint={`Used for exit scenarios. Defaults to ${DEFAULT_APPRECIATION_RATE}% when omitted.`}
                    allowEmpty
                  />
                  <NumberInputField
                    form={templateForm}
                    name="sellingCostPct"
                    label="Selling Cost % (Optional)"
                    hint={`Defaults to ${DEFAULT_SELLING_COST_PCT}% when omitted.`}
                    allowEmpty
                  />
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
                      <FormItem className=" px-3 py-2.5 flex items-center  mt-5">
                        <FormLabel
                          htmlFor="template-include-interest-deduction"
                          className="text-xs font-semibold uppercase tracking-wide cursor-pointer"
                        >
                          Include Interest Deduction
                        </FormLabel>
                        <FormControl>
                          <Switch
                            id="template-include-interest-deduction"
                            checked={field.value ?? true}
                            onCheckedChange={field.onChange}
                            aria-label="Include interest deduction in template tax assumptions"
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
                  disabled={isSavingTemplate}
                  onClick={() => {
                    setEditingTemplate(null);
                    setIsDialogOpen(false);
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button type="submit" disabled={isSavingTemplate}>
                  {isSavingTemplate ? (
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
    </div>
  );
}
