"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import type { MenuItem, ModifierGroup } from "@/lib/types";
import { selectedOptionsFor, unitPriceFor } from "@/lib/cart";
import { formatMoney, formatDelta } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ItemVisual } from "./item-visual";
import { QuantityStepper } from "./quantity-stepper";
import { useCart } from "./cart-context";

/** A required group must get at least one pick even if min is 0. */
function minFor(group: ModifierGroup): number {
  return group.required ? Math.max(group.min, 1) : group.min;
}

/** Default picks per group: single-choice must-pick groups (sizes and the
 * like) preselect their first option; everything else starts empty. */
function defaultSelections(item: MenuItem | null): Record<string, string[]> {
  const selections: Record<string, string[]> = {};
  for (const group of item?.modifierGroups ?? []) {
    selections[group.id] =
      group.max === 1 && minFor(group) > 0 && group.options.length > 0
        ? [group.options[0].id]
        : [];
  }
  return selections;
}

export function ItemDetailSheet({
  item,
  open,
  onOpenChange,
}: {
  item: MenuItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { add } = useCart();

  // Focus target when the sheet opens: a non-input container, so focus stays
  // inside the dialog (Escape/screen readers still work) without the special-
  // requests textarea grabbing focus and popping the mobile keyboard.
  const focusRef = React.useRef<HTMLDivElement>(null);

  const [selections, setSelections] = React.useState<Record<string, string[]>>(
    () => defaultSelections(item),
  );
  const [note, setNote] = React.useState("");
  const [qty, setQty] = React.useState(1);

  // Reset the form when a *different* item is opened. This is React's
  // "adjust state during render" pattern — it avoids an effect and the
  // cascading render that setState-in-effect would cause.
  const [lastItemId, setLastItemId] = React.useState(item?.id);
  if (item && item.id !== lastItemId) {
    setLastItemId(item.id);
    setSelections(defaultSelections(item));
    setNote("");
    setQty(1);
  }

  if (!item) return null;

  const groups = item.modifierGroups ?? [];
  const optionIds = groups.flatMap((g) => selections[g.id] ?? []);
  const selectedOptions = selectedOptionsFor(item, optionIds);
  const unitPrice = unitPriceFor(item, selectedOptions);
  const total = unitPrice * qty;
  const missingGroup = groups.find(
    (g) => (selections[g.id] ?? []).length < minFor(g),
  );

  function toggleOption(group: ModifierGroup, optionId: string) {
    setSelections((prev) => {
      const current = prev[group.id] ?? [];
      const active = current.includes(optionId);
      let next: string[];
      if (group.max === 1) {
        // Radio; deselect is only allowed when the group is optional.
        next = active ? (minFor(group) > 0 ? current : []) : [optionId];
      } else if (active) {
        next = current.filter((id) => id !== optionId);
      } else if (current.length < group.max) {
        next = [...current, optionId];
      } else {
        return prev; // at the max — ignore further picks
      }
      return { ...prev, [group.id]: next };
    });
  }

  function handleAdd() {
    add({
      itemId: item!.id,
      name: item!.name,
      quantity: qty,
      unitPrice,
      optionIds,
      optionLabels: selectedOptions.map((o) => o.label),
      note,
    });
    toast.success(`Added to order`, {
      description: `${qty} × ${item!.name}`,
      duration: 100,
    });
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[92vh] w-full max-w-[480px] gap-0 rounded-t-2xl p-0"
        initialFocus={focusRef}
      >
        <div
          ref={focusRef}
          tabIndex={-1}
          className="flex max-h-[92vh] flex-col outline-none"
        >
          {/* Photo header */}
          <ItemVisual
            item={item}
            className="h-44 w-full shrink-0 rounded-t-2xl"
            iconClassName="size-12"
          />

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <SheetTitle className="text-xl font-semibold">
                {item.name}
              </SheetTitle>
              <span className="text-xl font-bold tabular-nums">
                {formatMoney(item.price)}
              </span>
            </div>

            {item.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className={cn(
                      "text-[11px]",
                      tag === "Spicy" && "bg-brand-soft text-brand-strong",
                    )}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <SheetDescription className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
              {item.description}
            </SheetDescription>

            {/* Choice groups (size, protein, spice level, add-ons…) */}
            {groups.map((group) => (
              <Section
                key={group.id}
                title={group.label}
                required={minFor(group) > 0}
                optional={minFor(group) === 0}
                hint={group.max > 1 ? `Pick up to ${group.max}` : undefined}
              >
                <div className="grid gap-2">
                  {group.options.map((option) => {
                    const active = (selections[group.id] ?? []).includes(
                      option.id,
                    );
                    return (
                      <OptionRow
                        key={option.id}
                        active={active}
                        onClick={() => toggleOption(group, option.id)}
                        control={group.max === 1 ? "radio" : "check"}
                        label={option.label}
                        trailing={option.note ?? formatDelta(option.priceDelta)}
                      />
                    );
                  })}
                </div>
              </Section>
            ))}

            {/* Special requests */}
            <Section title="Special requests" optional>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="No anchovies, please…"
                className="min-h-20 resize-none"
              />
            </Section>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center gap-3 border-t border-border p-4">
            <QuantityStepper value={qty} onChange={(n) => setQty(Math.max(1, n))} />
            <Button
              onClick={handleAdd}
              disabled={!!missingGroup}
              className="h-11 flex-1 rounded-xl text-[15px] font-semibold"
            >
              {missingGroup
                ? `Choose ${missingGroup.label.toLowerCase()} first`
                : `Add to order · ${formatMoney(total)}`}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({
  title,
  required,
  optional,
  hint,
  children,
}: {
  title: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-semibold">{title}</h3>
          {hint && (
            <span className="text-xs text-muted-foreground">{hint}</span>
          )}
        </div>
        {required && (
          <Badge className="bg-brand-soft text-brand-strong border-brand-border">
            Required
          </Badge>
        )}
        {optional && (
          <span className="text-xs text-muted-foreground">Optional</span>
        )}
      </div>
      {children}
    </div>
  );
}

function OptionRow({
  active,
  onClick,
  control,
  label,
  trailing,
}: {
  active: boolean;
  onClick: () => void;
  control: "radio" | "check";
  label: string;
  trailing: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
        active
          ? "border-brand bg-brand-soft"
          : "border-border bg-card hover:bg-muted/50",
      )}
    >
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center border transition-colors",
          control === "radio" ? "rounded-full" : "rounded-md",
          active ? "border-brand bg-brand text-brand-foreground" : "border-input",
        )}
      >
        {active &&
          (control === "radio" ? (
            <span className="size-2 rounded-full bg-brand-foreground" />
          ) : (
            <Check className="size-3.5" strokeWidth={3} />
          ))}
      </span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <span
        className={cn(
          "text-sm tabular-nums",
          trailing === "Included"
            ? "text-muted-foreground"
            : "font-medium text-foreground",
        )}
      >
        {trailing}
      </span>
    </button>
  );
}
