"use client";

import { Minus, Plus } from "lucide-react";
import type { MenuItem } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ItemVisual } from "./item-visual";
import { useCart } from "./cart-context";

export function MenuItemRow({
  item,
  onSelect,
}: {
  item: MenuItem;
  onSelect: (item: MenuItem) => void;
}) {
  const soldOut = !!item.soldOut;
  const { lines, add, setQuantity } = useCart();

  // Total of this item across all cart lines (an item can appear as several
  // lines with different options); +/- act on the most-recent configuration.
  const itemLines = lines.filter((l) => l.itemId === item.id);
  const qty = itemLines.reduce((n, l) => n + l.quantity, 0);
  const lastLine = itemLines[itemLines.length - 1];
  const hasOptions = (item.modifierGroups?.length ?? 0) > 0;

  function increment() {
    if (qty === 0) {
      // Items with choices must be configured in the sheet; others add directly.
      if (hasOptions) {
        onSelect(item);
      } else {
        add({
          itemId: item.id,
          name: item.name,
          quantity: 1,
          unitPrice: item.price,
          optionIds: [],
          optionLabels: [],
        });
      }
    } else if (lastLine) {
      // Another of the same configuration.
      setQuantity(lastLine.lineId, lastLine.quantity + 1);
    }
  }

  function decrement() {
    if (lastLine) setQuantity(lastLine.lineId, lastLine.quantity - 1);
  }

  return (
    <div
      className={cn(
        "group flex w-full items-stretch gap-3 rounded-xl p-2",
        soldOut && "opacity-60",
      )}
    >
      {/* Tapping the item opens the detail sheet (options, notes, quantity). */}
      <button
        type="button"
        onClick={() => !soldOut && onSelect(item)}
        disabled={soldOut}
        aria-label={soldOut ? `${item.name} — sold out` : `View ${item.name}`}
        className={cn(
          "flex min-w-0 flex-1 items-stretch gap-3 rounded-lg text-left transition-colors",
          soldOut ? "cursor-default" : "hover:bg-muted/60",
        )}
      >
        <ItemVisual
          item={item}
          className={cn("size-[68px] shrink-0 rounded-lg", soldOut && "grayscale")}
        />

        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold text-foreground">
              {item.name}
            </span>
            {item.popular && !soldOut && (
              <Badge className="bg-brand-soft text-brand-strong border-brand-border shrink-0">
                Most loved
              </Badge>
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">
            {item.description}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {item.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className={cn(
                  "text-[11px] font-medium",
                  tag === "Spicy" && "bg-brand-soft text-brand-strong",
                )}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </button>

      <div className="flex flex-col items-end justify-between py-0.5">
        <span
          className={cn(
            "font-semibold tabular-nums",
            soldOut && "text-muted-foreground",
          )}
        >
          {formatMoney(item.price)}
        </span>

        {soldOut ? (
          <span className="text-[11px] font-medium text-muted-foreground">
            Sold out
          </span>
        ) : qty === 0 ? (
          <button
            type="button"
            onClick={increment}
            aria-label={`Add ${item.name}`}
            className="grid size-8 place-items-center rounded-full bg-brand text-brand-foreground shadow-sm transition-transform hover:scale-105 active:scale-95"
          >
            <Plus className="size-4" />
          </button>
        ) : (
          <div className="inline-flex items-center rounded-full border border-brand-border bg-brand-soft">
            <button
              type="button"
              onClick={decrement}
              aria-label={qty === 1 ? `Remove ${item.name}` : `Remove one ${item.name}`}
              className="grid size-8 place-items-center rounded-full text-brand-strong transition-colors hover:bg-brand/10"
            >
              <Minus className="size-4" />
            </button>
            <span
              className="min-w-5 text-center text-sm font-bold tabular-nums text-brand-strong"
              aria-live="polite"
              aria-label={`${qty} in order`}
            >
              {qty}
            </span>
            <button
              type="button"
              onClick={increment}
              aria-label={`Add another ${item.name}`}
              className="grid size-8 place-items-center rounded-full text-brand-strong transition-colors hover:bg-brand/10"
            >
              <Plus className="size-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
