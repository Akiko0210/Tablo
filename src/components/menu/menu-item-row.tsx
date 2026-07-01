"use client";

import { Plus } from "lucide-react";
import type { MenuItem } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ItemVisual } from "./item-visual";

export function MenuItemRow({
  item,
  onSelect,
}: {
  item: MenuItem;
  onSelect: (item: MenuItem) => void;
}) {
  const soldOut = !!item.soldOut;

  return (
    <button
      type="button"
      onClick={() => !soldOut && onSelect(item)}
      disabled={soldOut}
      aria-label={soldOut ? `${item.name} — sold out` : `View ${item.name}`}
      className={cn(
        "group flex w-full items-stretch gap-3 rounded-xl p-2 text-left transition-colors",
        soldOut ? "cursor-default opacity-60" : "hover:bg-muted/60",
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
        ) : (
          <span
            className="grid size-8 place-items-center rounded-full bg-brand text-brand-foreground shadow-sm transition-transform group-hover:scale-105 group-active:scale-95"
            aria-hidden
          >
            <Plus className="size-4" />
          </span>
        )}
      </div>
    </button>
  );
}
