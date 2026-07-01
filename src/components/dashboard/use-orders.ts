"use client";

import * as React from "react";
import type { Order, OrderStatus } from "@/lib/orders/types";

const POLL_INTERVAL = 4000;

/**
 * Polls the orders API so the dashboard reflects new guest orders live.
 * On a 401 (expired session) it sends the user back to login.
 */
export function useOrders() {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = (await res.json()) as { orders: Order[] };
      setOrders(data.orders);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // Polling an external system (the orders API). setState happens in the
    // async fetch continuation inside load(), not synchronously — the
    // legitimate "subscribe to external state" case this rule can't detect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const id = setInterval(load, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [load]);

  const updateStatus = React.useCallback(
    async (id: string, status: OrderStatus) => {
      // Optimistic update, then reconcile with the server.
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status } : o)),
      );
      try {
        const res = await fetch(`/api/orders/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error();
      } catch {
        load(); // revert to server truth on failure
      }
    },
    [load],
  );

  return { orders, loading, error, refresh: load, updateStatus };
}
