"use client";

import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Home, Building2, KeyRound, ChevronDown, ChevronUp, Target } from "lucide-react";
import { InvestmentFormValues, PROPERTY_TYPES } from "@/lib/investcalc-schema";
import { cn } from "@/lib/utils";

const ICONS = {
  home: Home,
  building: Building2,
  key: KeyRound,
};

interface PropertyTypeSectionProps {
  form: UseFormReturn<InvestmentFormValues>;
}

export function PropertyTypeSection({ form }: PropertyTypeSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = form.watch("propertyType");
  const selectedType = PROPERTY_TYPES.find((t) => t.value === selected);
  const SelectedIcon = selectedType ? ICONS[selectedType.icon] : Home;

  const handleSelect = (value: InvestmentFormValues["propertyType"]) => {
    form.setValue("propertyType", value);
    setIsOpen(false);
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm text-foreground">Property Type</span>
      </div>

      <div className="relative">
        {/* Trigger */}
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className={cn(
            "w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all",
            "bg-[var(--brand-blue-light)] border-primary/20 hover:border-primary/50"
          )}
        >
          <div className="flex items-center gap-3">
            <SelectedIcon className="w-5 h-5 text-primary" />
            <div className="text-left">
              <p className="text-sm font-semibold text-primary">
                {selectedType?.label}
              </p>
              <p className="text-xs text-primary/70">{selectedType?.description}</p>
            </div>
          </div>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-30 overflow-hidden">
            {PROPERTY_TYPES.map((type) => {
              const Icon = ICONS[type.icon];
              const isSelected = selected === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleSelect(type.value as InvestmentFormValues["propertyType"])}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted transition-colors text-left",
                    isSelected && "bg-[var(--brand-blue-light)]"
                  )}
                >
                  <Icon className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{type.label}</p>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
