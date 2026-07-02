// In-memory order store, scoped per restaurant. Persists for the lifetime of
// the server process, which is enough for the demo: guests POST orders and the
// dashboard reads them live. Swap the internals for SQLite/Postgres later
// without changing callers.
//
// Attached to globalThis so it survives dev HMR module reloads.

import { DEMO_RESTAURANT_ID } from "@/lib/restaurants/store";
import type { NewOrderInput, Order, OrderStatus } from "./types";

interface OrderStore {
  orders: Order[];
  seq: number;
  /** Restaurants whose synthetic analysis history has been generated. */
  historySeeded: Set<string>;
}

const globalForStore = globalThis as unknown as {
  __tabloOrderStore?: OrderStore;
};

function seed(): OrderStore {
  const now = Date.now();
  const store: OrderStore = {
    orders: [],
    seq: 0,
    historySeeded: new Set(),
  };
  // A couple of orders already "in the kitchen" so the dashboard isn't empty
  // the first time it's opened.
  store.orders.push(
    {
      id: "ord-1001",
      restaurantId: DEMO_RESTAURANT_ID,
      table: "4",
      lines: [
        {
          name: "Margherita",
          quantity: 1,
          unitPrice: 14,
          sizeLabel: 'Regular · 12"',
          addonLabels: [],
        },
        { name: "Aperol Spritz", quantity: 2, unitPrice: 11, addonLabels: [] },
      ],
      subtotal: 36,
      status: "preparing",
      createdAt: new Date(now - 8 * 60_000).toISOString(),
    },
    {
      id: "ord-1002",
      restaurantId: DEMO_RESTAURANT_ID,
      table: "9",
      lines: [
        {
          name: "Tagliatelle al Ragù",
          quantity: 1,
          unitPrice: 18,
          addonLabels: ["Extra parmesan"],
          note: "No chili",
        },
      ],
      subtotal: 20,
      kitchenNote: "Guest has a nut allergy.",
      status: "new",
      createdAt: new Date(now - 2 * 60_000).toISOString(),
    },
  );
  store.seq = 1002;
  return store;
}

function getStore(): OrderStore {
  if (!globalForStore.__tabloOrderStore) {
    globalForStore.__tabloOrderStore = seed();
  }
  return globalForStore.__tabloOrderStore;
}

/** Live (non-seeded) orders for one restaurant, newest first. */
export function listOrders(restaurantId: string): Order[] {
  return getStore()
    .orders.filter((o) => o.restaurantId === restaurantId && !o.seeded)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Every order for a restaurant including synthetic history — analysis only. */
export function listAllOrdersForAnalysis(restaurantId: string): Order[] {
  return getStore().orders.filter((o) => o.restaurantId === restaurantId);
}

export function createOrder(restaurantId: string, input: NewOrderInput): Order {
  const store = getStore();
  store.seq += 1;
  const order: Order = {
    id: `ord-${store.seq}`,
    restaurantId,
    table: input.table,
    lines: input.lines,
    subtotal: input.subtotal,
    kitchenNote: input.kitchenNote?.trim() || undefined,
    status: "new",
    createdAt: new Date().toISOString(),
  };
  store.orders.push(order);
  return order;
}

/** Advance an order's status. The restaurantId guard prevents one tenant from
 * touching another tenant's orders. */
export function updateOrderStatus(
  restaurantId: string,
  id: string,
  status: OrderStatus,
): Order | undefined {
  const order = getStore().orders.find(
    (o) => o.id === id && o.restaurantId === restaurantId,
  );
  if (!order) return undefined;
  order.status = status;
  return order;
}

/** Bulk-insert synthetic history (used by the analysis seeder). Idempotent per
 * restaurant: the second call is a no-op. Returns whether seeding ran. */
export function insertSeededHistory(
  restaurantId: string,
  orders: Omit<Order, "seeded">[],
): boolean {
  const store = getStore();
  if (store.historySeeded.has(restaurantId)) return false;
  store.historySeeded.add(restaurantId);
  for (const order of orders) {
    store.orders.push({ ...order, seeded: true });
  }
  return true;
}
