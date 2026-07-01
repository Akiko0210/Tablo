"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
}

/** Compact −/qty/+ control used in the item sheet and the order review. */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  size = "md",
  className,
  ...rest
}: QuantityStepperProps) {
  const dim = size === "sm" ? "size-7" : "size-9";
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-card",
        className,
      )}
      aria-label={rest["aria-label"]}
    >
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label="Decrease quantity"
        className={cn(
          dim,
          "grid place-items-center rounded-full text-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent",
        )}
      >
        <Minus className="size-4" />
      </button>
      <span
        className={cn(
          "min-w-6 text-center text-sm font-semibold tabular-nums",
          size === "sm" && "min-w-5",
        )}
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label="Increase quantity"
        className={cn(
          dim,
          "grid place-items-center rounded-full text-foreground transition-colors hover:bg-muted",
        )}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
