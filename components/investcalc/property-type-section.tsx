"use client";

import { useRef, type KeyboardEvent } from "react";
import { UseFormReturn } from "react-hook-form";
import { Home, Building2, KeyRound, Target } from "lucide-react";
import { InvestmentFormValues, PROPERTY_TYPES } from "@/lib/investcalc-schema";
import { cn } from "@/lib/utils";
import { TemplateSelectorSection } from "./template-selector-section";

const ICONS = {
  home: Home,
  building: Building2,
  key: KeyRound,
};

interface PropertyTypeSectionProps {
  form: UseFormReturn<InvestmentFormValues>;
  savedTemplateFallback?: {
    id: string;
    templateName: string;
    templateDescription: string | null;
  } | null;
  /** Passed through to the template selector (see template-selector-section). */
  onTemplatesLoaded?: Parameters<
    typeof TemplateSelectorSection
  >[0]["onTemplatesLoaded"];
  /** Passed through to the template selector (see template-selector-section). */
  onExplicitTemplateChange?: Parameters<
    typeof TemplateSelectorSection
  >[0]["onExplicitTemplateChange"];
}

export function PropertyTypeSection({
  form,
  savedTemplateFallback = null,
  onTemplatesLoaded,
  onExplicitTemplateChange,
}: PropertyTypeSectionProps) {
  const selected = form.watch("propertyType");

  // A11Y (ARIA radiogroup keyboard pattern): the type buttons were each a tab
  // stop with no arrow-key handling. A radiogroup should be ONE tab stop
  // (roving tabindex) with Arrow/Home/End moving focus AND changing the
  // selection. Refs let us move focus onto the newly selected radio.
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = Math.max(
    0,
    PROPERTY_TYPES.findIndex((t) => t.value === selected),
  );
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let next = selectedIndex;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = (selectedIndex + 1) % PROPERTY_TYPES.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next =
          (selectedIndex - 1 + PROPERTY_TYPES.length) % PROPERTY_TYPES.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = PROPERTY_TYPES.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    form.setValue(
      "propertyType",
      PROPERTY_TYPES[next]!.value as InvestmentFormValues["propertyType"],
    );
    btnRefs.current[next]?.focus();
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-4 shadow-sm sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm text-foreground">
          Property Setup
        </span>
      </div>

      {/* Property type - segmented control. A 3-way choice doesn't need a
          dropdown: inline segments are one tap, always visible, and drop the
          icon+title+subtitle density the old dropdown carried. */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Property Type
        </p>
        <div
          role="radiogroup"
          aria-label="Property type"
          className="grid grid-cols-1 gap-2 min-[320px]:grid-cols-3"
          onKeyDown={handleKeyDown}
        >
          {PROPERTY_TYPES.map((type, i) => {
            const Icon = ICONS[type.icon];
            const isSelected = selected === type.value;
            return (
              <button
                key={type.value}
                id={`property-type-${type.value}`}
                ref={(el) => {
                  btnRefs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={isSelected}
                // Roving tabindex: only the selected radio is in the tab order.
                tabIndex={i === selectedIndex ? 0 : -1}
                aria-label={`${type.label} - ${type.description}`}
                title={type.description}
                onClick={() =>
                  form.setValue(
                    "propertyType",
                    type.value as InvestmentFormValues["propertyType"],
                  )
                }
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-colors",
                  isSelected
                    ? "border-primary/30 bg-[var(--brand-blue-light)]"
                    : "border-border bg-card hover:border-primary/30 hover:bg-muted/40",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    isSelected ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-medium leading-tight",
                    isSelected ? "text-primary" : "text-foreground",
                  )}
                >
                  {type.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Template - optional. Demoted below the type (behind a divider) so it
          reads as a secondary "advanced" choice, not co-equal with the type. */}
      <div className="mt-4 border-t border-border pt-4">
        <TemplateSelectorSection
          form={form}
          savedTemplateFallback={savedTemplateFallback}
          onTemplatesLoaded={onTemplatesLoaded}
          onExplicitTemplateChange={onExplicitTemplateChange}
        />
      </div>
    </div>
  );
}
