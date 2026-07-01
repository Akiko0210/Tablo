"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import type { AddOn, MenuItem, SizeOption } from "@/lib/types";
import { unitPriceFor } from "@/lib/cart";
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

  const [sizeId, setSizeId] = React.useState<string | undefined>(
    item?.sizes?.[0]?.id,
  );
  const [addonIds, setAddonIds] = React.useState<string[]>([]);
  const [note, setNote] = React.useState("");
  const [qty, setQty] = React.useState(1);

  // Reset the form when a *different* item is opened. This is React's
  // "adjust state during render" pattern — it avoids an effect and the
  // cascading render that setState-in-effect would cause.
  const [lastItemId, setLastItemId] = React.useState(item?.id);
  if (item && item.id !== lastItemId) {
    setLastItemId(item.id);
    setSizeId(item.sizes?.[0]?.id);
    setAddonIds([]);
    setNote("");
    setQty(1);
  }

  if (!item) return null;

  const size: SizeOption | undefined = item.sizes?.find((s) => s.id === sizeId);
  const selectedAddons: AddOn[] =
    item.addons?.filter((a) => addonIds.includes(a.id)) ?? [];
  const unitPrice = unitPriceFor(item, size, selectedAddons);
  const total = unitPrice * qty;

  function toggleAddon(id: string) {
    setAddonIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleAdd() {
    add({
      itemId: item!.id,
      name: item!.name,
      quantity: qty,
      unitPrice,
      sizeId,
      sizeLabel: size?.label,
      addonIds,
      addonLabels: selectedAddons.map((a) => a.label),
      note,
    });
    toast.success(`Added to order`, {
      description: `${qty} × ${item!.name}`,
    });
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[92vh] w-full max-w-[480px] gap-0 rounded-t-2xl p-0"
      >
        <div className="flex max-h-[92vh] flex-col">
          {/* Photo header */}
          <ItemVisual
            item={item}
            className="h-44 w-full shrink-0 rounded-t-2xl text-6xl"
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

            {/* Size */}
            {item.sizes && item.sizes.length > 0 && (
              <Section title="Size" required>
                <div className="grid gap-2">
                  {item.sizes.map((s) => {
                    const active = s.id === sizeId;
                    return (
                      <OptionRow
                        key={s.id}
                        active={active}
                        onClick={() => setSizeId(s.id)}
                        control="radio"
                        label={s.label}
                        trailing={s.note ?? formatDelta(s.priceDelta)}
                      />
                    );
                  })}
                </div>
              </Section>
            )}

            {/* Add-ons */}
            {item.addons && item.addons.length > 0 && (
              <Section title="Add-ons" optional>
                <div className="grid gap-2">
                  {item.addons.map((a) => {
                    const active = addonIds.includes(a.id);
                    return (
                      <OptionRow
                        key={a.id}
                        active={active}
                        onClick={() => toggleAddon(a.id)}
                        control="check"
                        label={a.label}
                        trailing={formatDelta(a.price)}
                      />
                    );
                  })}
                </div>
              </Section>
            )}

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
              className="h-11 flex-1 rounded-xl text-[15px] font-semibold"
            >
              Add to order · {formatMoney(total)}
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
  children,
}: {
  title: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
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
