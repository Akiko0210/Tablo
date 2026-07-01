"use client";

import { Clock, StickyNote } from "lucide-react";
import type { Order, OrderStatus } from "@/lib/orders/types";
import { formatMoney } from "@/lib/format";
import { timeAgo } from "@/lib/orders/time";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { statusMeta } from "./order-status";

export function OrderCard({
  order,
  onAdvance,
}: {
  order: Order;
  onAdvance: (id: string, status: OrderStatus) => void;
}) {
  const meta = statusMeta[order.status];

  return (
    <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">Table {order.table}</span>
          <Badge className={cn("border", meta.badge)}>{meta.label}</Badge>
        </div>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="size-3" />
          {timeAgo(order.createdAt)}
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
            {(line.sizeLabel || line.addonLabels.length > 0) && (
              <div className="text-[11px] text-muted-foreground">
                {[line.sizeLabel, ...line.addonLabels].filter(Boolean).join(" · ")}
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
