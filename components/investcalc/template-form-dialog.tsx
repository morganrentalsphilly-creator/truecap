"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Home,
  Loader2,
  Save,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { AnalysisTemplateOption } from "@/app/actions/analysis-templates";
import {
  analysisTemplateSchema,
  type AnalysisTemplateInput,
  TEMPLATE_DESCRIPTION_MAX_LENGTH,
} from "@/lib/analysis-template-schema";
import { DEFAULT_APPRECIATION_RATE, DEFAULT_SELLING_COST_PCT } from "@/lib/exit-scenarios";
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
import { cn } from "@/lib/utils";

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

type TemplateFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTemplate: AnalysisTemplateOption | null;
  initialValues: AnalysisTemplateInput;
  isSaving: boolean;
  onSubmit: (values: AnalysisTemplateInput) => void | Promise<void>;
  formId: string;
  createDescription?: string;
  editDescription?: string;
};

function getFieldSuffix(name: NumericTemplateField): string {
  return name === "insuranceMo" ? "$" : "%";
}

function NumberInputField({
  form,
  name,
  label,
  hint,
  step = "0.01",
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
        <FormItem className="rounded-lg border border-border bg-card px-3 py-2.5">
          <FormLabel className="text-xs font-semibold text-foreground">{label}</FormLabel>
          <div className="relative mt-1.5">
            <FormControl>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step={step}
                value={Number.isFinite(field.value) ? field.value : ""}
                onChange={(e) => {
                  const next = e.target.value;
                  field.onChange(next === "" ? (allowEmpty ? undefined : 0) : Number(next));
                }}
                className="h-10 rounded-md pr-8"
              />
            </FormControl>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
              {getFieldSuffix(name)}
            </span>
          </div>
          {hint ? (
            <p className="mt-1 text-[11px] text-muted-foreground min-h-[14px]">{hint}</p>
          ) : (
            <p className="mt-1 min-h-[14px]" />
          )}
          <FormMessage className="text-[11px]" />
        </FormItem>
      )}
    />
  );
}

export function TemplateFormDialog({
  open,
  onOpenChange,
  editingTemplate,
  initialValues,
  isSaving,
  onSubmit,
  formId,
  createDescription = "Save reusable assumptions for future calculations.",
  editDescription = "Update your reusable assumptions.",
}: TemplateFormDialogProps) {
  const [showAdvanced, setShowAdvanced] = useState(true);
  const templateForm = useForm<AnalysisTemplateInput>({
    resolver: zodResolver(analysisTemplateSchema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    if (!open) return;
    setShowAdvanced(true);
    templateForm.reset(initialValues);
  }, [initialValues, open, templateForm]);

  const submitTemplate = async (values: AnalysisTemplateInput) => {
    await onSubmit(values);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isSaving) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-6xl h-[92vh] max-h-[92vh] overflow-hidden  p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-2 border-b border-border/70">
          <DialogTitle className="flex items-center gap-3">
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClipboardList className="w-4 h-4" />
            </span>
            <span>{editingTemplate ? "Edit Calculation Template" : "Create Calculation Template"}</span>
          </DialogTitle>
          <DialogDescription>{editingTemplate ? editDescription : createDescription}</DialogDescription>
          <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute right-4 top-4 h-9 w-9 rounded-full border-input bg-white/90 dark:bg-[#111827]/90"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <Form {...templateForm}>
            <form
              id={formId}
              onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void templateForm.handleSubmit(submitTemplate)(event);
              }}
              noValidate
              className="space-y-6 bg-background px-6 py-5"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={templateForm.control}
                  name="templateName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Rental Template" {...field} className="h-11 rounded-xl" />
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
                          className="h-11 rounded-xl"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Home className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Property & Insurance</p>
                    <p className="text-xs text-muted-foreground">Core property and insurance assumptions</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
                      <FormItem className="sm:col-span-2 xl:col-span-1 rounded-lg border border-border bg-card px-3 py-2.5">
                        <FormLabel className="text-xs font-semibold text-foreground">Insurance Input</FormLabel>
                        <div className="mt-1.5 flex rounded-lg border border-border bg-muted/40 p-1">
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
                        <p className="mt-1 text-[11px] text-muted-foreground min-h-[14px]">
                          Save insurance assumptions as an annual percent or a flat monthly cost.
                        </p>
                        <FormMessage className="text-[11px]" />
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
              </div>

              <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="w-full flex items-center justify-between gap-2 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <SlidersHorizontal className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Advanced Assumptions</p>
                      <p className="text-xs text-muted-foreground">Financing, growth, and exit assumptions</p>
                    </div>
                  </div>
                  {showAdvanced ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>

                {showAdvanced && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
                        <FormItem className="rounded-lg border border-border bg-card px-3 py-2.5">
                          <FormLabel className="text-xs font-semibold text-foreground">
                            Depreciation Period
                          </FormLabel>
                          <FormControl>
                            <select
                              className="mt-1.5 w-full h-10 rounded-md border border-border px-3 text-sm bg-background"
                              value={field.value}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            >
                              <option value={27.5}>27.5 years (Residential)</option>
                              <option value={39}>39 years (Commercial)</option>
                            </select>
                          </FormControl>
                          <p className="mt-1 min-h-[14px]" />
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={templateForm.control}
                  name="includeInterestDeduction"
                  render={({ field }) => (
                    <FormItem className="rounded-lg border border-border bg-card px-4 py-3 flex items-center justify-between gap-3">
                      <div>
                        <FormLabel
                          htmlFor={`${formId}-include-interest-deduction`}
                          className="text-sm font-semibold text-foreground cursor-pointer"
                        >
                          Include Interest Deduction
                        </FormLabel>
                        <p className="text-[11px] text-muted-foreground">
                          Include mortgage interest deduction in cash flow and taxes.
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          id={`${formId}-include-interest-deduction`}
                          checked={field.value ?? true}
                          onCheckedChange={field.onChange}
                          aria-label="Include interest deduction in template tax assumptions"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </div>
        <DialogFooter className="border-t border-border/70 px-6 py-4 bg-background">
          <Button type="button" variant="outline" disabled={isSaving} onClick={() => onOpenChange(false)} className="rounded-xl">
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={isSaving} className="rounded-xl">
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
      </DialogContent>
    </Dialog>
  );
}
