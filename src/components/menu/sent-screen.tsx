"use client";

import * as React from "react";
import { Check, Star, BellRing, Gift, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { CartLine } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { cartItemCount } from "@/lib/cart";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRestaurant } from "./restaurant-context";

export interface SentOrder {
  lines: CartLine[];
  subtotal: number;
}

const FEEDBACK_CHIPS = ["Loved the food", "Great service", "Fast", "A bit slow"];

export function SentScreen({
  tableId,
  order,
  onNewOrder,
}: {
  tableId: string;
  order: SentOrder;
  onNewOrder: () => void;
}) {
  const restaurant = useRestaurant();
  const [rating, setRating] = React.useState(0);
  const [hover, setHover] = React.useState(0);
  const [chips, setChips] = React.useState<string[]>([]);
  const [submitted, setSubmitted] = React.useState(false);
  const count = cartItemCount(order.lines);

  function toggleChip(chip: string) {
    setChips((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip],
    );
  }

  function submitFeedback() {
    setSubmitted(true);
    toast.success("Thanks for the feedback!", {
      description: rating ? `You rated us ${rating}/5.` : undefined,
    });
  }

  return (
    <div className="flex min-h-full flex-col px-5 pb-8 pt-10">
      {/* Confirmation */}
      <div className="flex flex-col items-center text-center">
        <div className="grid size-16 place-items-center rounded-full bg-brand-soft text-brand">
          <Check className="size-8" strokeWidth={2.5} />
        </div>
        <h1 className="mt-4 text-2xl font-bold">Order&apos;s on its way</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Sent to the kitchen · Table {tableId}
        </p>
        <p className="mt-0.5 text-sm font-medium text-brand-strong">
          Estimated 15–20 min
        </p>
      </div>

      {/* Order summary */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>
            {count} {count === 1 ? "item" : "items"}
          </span>
          <span className="tabular-nums">{formatMoney(order.subtotal)}</span>
        </div>
        <ul className="mt-2 space-y-1 text-[13px] text-muted-foreground">
          {order.lines.map((l) => (
            <li key={l.lineId} className="flex justify-between gap-3">
              <span className="truncate">
                {l.quantity} × {l.name}
              </span>
              <span className="tabular-nums">
                {formatMoney(l.unitPrice * l.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-border pt-3 text-[12px] text-muted-foreground">
          Pay at the table with your server whenever you&apos;re ready.
        </p>
      </div>

      <Button
        variant="outline"
        className="mt-3 h-12 w-full rounded-xl"
        onClick={() => toast("A server is on the way to Table " + tableId)}
      >
        <BellRing className="size-4" /> Call a server
      </Button>

      {/* Feedback */}
      <div className="mt-4 rounded-2xl border border-border bg-card p-5 text-center">
        <h2 className="text-base font-semibold">How was everything?</h2>
        <div className="mt-3 flex justify-center gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`Rate ${n} out of 5`}
              disabled={submitted}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="p-0.5 disabled:cursor-default"
            >
              <Star
                className={cn(
                  "size-8 transition-colors",
                  (hover || rating) >= n
                    ? "fill-brand text-brand"
                    : "fill-muted text-muted-foreground/40",
                )}
              />
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {FEEDBACK_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={submitted}
              onClick={() => toggleChip(chip)}
              aria-pressed={chips.includes(chip)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-70",
                chips.includes(chip)
                  ? "border-brand bg-brand-soft text-brand-strong"
                  : "border-border bg-card hover:bg-muted",
              )}
            >
              {chip}
            </button>
          ))}
        </div>

        {!submitted ? (
          <Button
            onClick={submitFeedback}
            disabled={rating === 0 && chips.length === 0}
            className="mt-4 h-11 w-full rounded-xl"
          >
            Submit feedback
          </Button>
        ) : (
          <p className="mt-4 text-sm font-medium text-brand-strong">
            Thanks — we&apos;ve shared this with {restaurant.name}. 🧡
          </p>
        )}
      </div>

      {/* Loyalty */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-foreground p-4 text-background">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-brand-foreground">
          <Gift className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Join {restaurant.name}&apos;s table</div>
          <div className="text-[13px] text-background/70">
            Earn a free coffee on your next visit.
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => toast.success("You're in! Loyalty reward saved.")}
          className="rounded-full"
        >
          Join
        </Button>
      </div>

      <button
        type="button"
        onClick={onNewOrder}
        className="mx-auto mt-6 flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <RotateCcw className="size-4" /> Start a new order
      </button>
    </div>
  );
}
