"use client";

import { ArrowRight } from "lucide-react";
import { cartItemCount, cartSubtotal } from "@/lib/cart";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useCart } from "./cart-context";

/** Sticky bottom bar summarising the order, shown while browsing. */
export function OrderBar({ onView }: { onView: () => void }) {
  const { lines } = useCart();
  const count = cartItemCount(lines);
  const subtotal = cartSubtotal(lines);

  if (count === 0) return null;

  return (
    <div className="pointer-events-none sticky bottom-0 z-20 px-3 pb-3">
      <Button
        onClick={onView}
        className="pointer-events-auto flex h-14 w-full items-center gap-3 rounded-2xl px-4 text-[15px] font-semibold shadow-lg shadow-brand/25"
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-foreground/20 text-sm tabular-nums">
          {count}
        </span>
        <span className="flex-1 text-left">View order</span>
        <span className="tabular-nums">{formatMoney(subtotal)}</span>
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}
