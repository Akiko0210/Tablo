"use client";

import { Clock, StickyNote } from "lucide-react";
import type { Order, OrderStatus } from "@/lib/orders/types";
import { formatMoney } from "@/lib/format";
import { timeAgo } from "@/lib/orders/time";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { statusMeta } from "./order-status";

/** Kitchen timer escalation: quiet → amber at 10 min → red at 20 min. */
const AMBER_AFTER_MS = 10 * 60_000;
const RED_AFTER_MS = 20 * 60_000;

export function OrderCard({
  order,
  onAdvance,
  now,
  escalate = false,
}: {
  order: Order;
  onAdvance: (id: string, status: OrderStatus) => void;
  /** Ticking clock from useNow() so elapsed labels update live. */
  now: number;
  /** Kitchen mode: color the card by how long the order has been waiting. */
  escalate?: boolean;
}) {
  const meta = statusMeta[order.status];
  const waitedMs = now - new Date(order.createdAt).getTime();
  const level =
    !escalate || order.status === "served"
      ? "none"
      : waitedMs >= RED_AFTER_MS
        ? "red"
        : waitedMs >= AMBER_AFTER_MS
          ? "amber"
          : "none";

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-3.5 shadow-sm",
        level === "none" && "border-border",
        level === "amber" && "border-amber-400/70 bg-amber-50/40",
        level === "red" && "border-red-400/80 bg-red-50/40",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">Table {order.table}</span>
          <Badge className={cn("border", meta.badge)}>{meta.label}</Badge>
        </div>
        <span
          className={cn(
            "flex items-center gap-1 text-[11px]",
            level === "none" && "text-muted-foreground",
            level === "amber" && "font-semibold text-amber-700",
            level === "red" && "font-semibold text-red-700",
          )}
        >
          <Clock className="size-3" />
          {timeAgo(order.createdAt, now)}
        </span>
      </div>

      <ul className="mt-2.5 space-y-1.5">
        {order.lines.map((line, i) => (
          <li key={i} className="text-[13px]">
            <div className="flex justify-between gap-2">
              <span>
                <span className="font-semibold tabular-nums">
                  {line.quantity}×
                </span>{" "}
                {line.name}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {formatMoney(line.unitPrice * line.quantity)}
              </span>
            </div>
            {line.optionLabels.length > 0 && (
              <div className="text-[11px] text-muted-foreground">
                {line.optionLabels.join(" · ")}
              </div>
            )}
            {line.note && (
              <div className="text-[11px] italic text-muted-foreground">
                “{line.note}”
              </div>
            )}
          </li>
        ))}
      </ul>

      {order.kitchenNote && (
        <div className="mt-2.5 flex gap-1.5 rounded-lg bg-brand-soft px-2.5 py-1.5 text-[11px] text-brand-strong">
          <StickyNote className="size-3.5 shrink-0" />
          <span>{order.kitchenNote}</span>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
        <span className="text-sm font-bold tabular-nums">
          {formatMoney(order.subtotal)}
        </span>
        {meta.next && meta.nextLabel && (
          <Button
            size="sm"
            variant={order.status === "new" ? "default" : "outline"}
            onClick={() => onAdvance(order.id, meta.next!)}
          >
            {meta.nextLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
