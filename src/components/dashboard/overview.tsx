"use client";

import { DollarSign, Receipt, Flame, ArrowRight, Layers } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrders } from "./use-orders";
import { OrderCard } from "./order-card";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function Overview({ firstName }: { firstName: string }) {
  const { orders, loading, updateStatus } = useOrders();
  const now = useNow();

  const count = orders.length;
  const sales = orders.reduce((sum, o) => sum + o.subtotal, 0);
  const items = orders.reduce(
    (sum, o) => sum + o.lines.reduce((n, l) => n + l.quantity, 0),
    0,
  );
  const avg = count ? sales / count : 0;
  const itemsPerOrder = count ? items / count : 0;
  const active = orders.filter((o) => o.status !== "served");

  const stats = [
    { label: "Sales today", value: formatMoney(sales), icon: DollarSign },
    { label: "Orders", value: String(count), icon: Receipt },
    { label: "Avg order", value: formatMoney(avg), icon: Receipt },
    { label: "Items / order", value: itemsPerOrder.toFixed(1), icon: Layers },
    { label: "In the kitchen", value: String(active.length), icon: Flame },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        {greeting()}, {firstName}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Here&apos;s what&apos;s happening across your tables right now.
      </p>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {stats.map((s) =>
          loading && count === 0 ? (
            <Skeleton key={s.label} className="h-24 rounded-2xl" />
          ) : (
            <div
              key={s.label}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[13px] font-medium">{s.label}</span>
                <span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-brand">
                  <s.icon className="size-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold tabular-nums">
                {s.value}
              </div>
            </div>
          ),
        )}
      </div>

      {/* Active orders */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Active orders</h2>
        <ButtonLink href="/dashboard/orders" variant="ghost" size="sm">
          View all <ArrowRight className="size-3.5" />
        </ButtonLink>
      </div>

      {active.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          No active orders. New orders from guests will appear here instantly.
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.slice(0, 6).map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onAdvance={updateStatus}
              now={now}
            />
          ))}
        </div>
      )}
    </div>
  );
}
