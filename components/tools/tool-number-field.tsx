"use client";

/**
 * The one number field on the public calculators (DESIGN.md "Field"): a
 * visible sentence-case label tied to the input by `for`, a white 48px field
 * with 16px text at every width (so iOS does not zoom), and the unit shown as
 * an aria-hidden adornment. The same field renders inside partner iframes on
 * /embed/<slug>, so it carries its own layout and needs no page wrapper.
 */

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
    <div className={cn("min-w-0", className)}>
      <Label
        htmlFor={id}
        className={cn(
          "text-sm leading-snug font-semibold text-foreground",
          labelClassName
        )}
      >
        {label}
      </Label>
      <div className="relative mt-2">
        {prefix ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground"
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
            "h-12 text-base lg:text-base",
            prefix && "pl-7",
            suffix && "pr-8",
            error && "border-destructive"
          )}
        />
        {suffix ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground"
          >
            {suffix}
          </span>
        ) : null}
      </div>
      {hint ? (
        <p id={hintId} className="mt-1.5 text-pretty text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-destructive-text">
          {error}
        </p>
      ) : null}
    </div>
  );
}
