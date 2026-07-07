"use client";

import { RefreshCw, Inbox, AlertCircle, Download } from "lucide-react";
import { ORDER_STATUSES } from "@/lib/orders/types";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrders } from "./use-orders";
import { OrderCard } from "./order-card";
import { statusMeta } from "./order-status";

export function OrdersBoard() {
  const { orders, loading, error, refresh, updateStatus } = useOrders();
  const now = useNow();

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live orders from every table. Updates automatically.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ButtonLink href="/api/export/orders" variant="outline" size="sm">
            <Download className="size-3.5" /> Export CSV
          </ButtonLink>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
          <AlertCircle className="size-4" />
          Couldn&apos;t reach the server. Retrying…
        </div>
      )}

      {loading && orders.length === 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {ORDER_STATUSES.map((s) => (
            <Skeleton key={s} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {ORDER_STATUSES.map((status) => {
            const column = orders.filter((o) => o.status === status);
            const meta = statusMeta[status];
            return (
              <div key={status} className="flex flex-col gap-3">
                <div className="flex items-center gap-2 px-1">
                  <span className={cn("size-2 rounded-full", meta.dot)} />
                  <span className="text-sm font-semibold">{meta.label}</span>
                  <span className="rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground tabular-nums">
                    {column.length}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {column.length === 0 ? (
                    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-border py-8 text-muted-foreground">
                      <Inbox className="size-5" />
                      <span className="text-[12px]">None</span>
                    </div>
                  ) : (
                    column.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onAdvance={updateStatus}
                        now={now}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
