"use client";

import type { ChangeEventHandler } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function ToolNumberField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  prefix,
  suffix,
  min,
  max,
  step,
  className,
  labelClassName,
}: {
  id: string;
  label: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  error: string | null;
  hint?: string;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  labelClassName?: string;
}) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hint ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className={className}>
      <Label
        htmlFor={id}
        className={cn(
          "text-xs font-bold uppercase tracking-widest text-muted-foreground",
          labelClassName
        )}
      >
        {label}
      </Label>
      <div className="relative mt-1">
        {prefix ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
          >
            {prefix}
          </span>
        ) : null}
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={onChange}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            prefix && "pl-7",
            suffix && "pr-8",
            error && "border-destructive focus-visible:ring-destructive"
          )}
        />
        {suffix ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
          >
            {suffix}
          </span>
        ) : null}
      </div>
      {hint ? (
        <p id={hintId} className="mt-1 text-[11px] text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="mt-1 text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
