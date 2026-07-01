// In-memory order store. Persists for the lifetime of the server process, which
// is enough for the demo: guests POST orders and the dashboard reads them live.
// Swap the internals for SQLite/Postgres later without changing callers.
//
// Attached to globalThis so it survives dev HMR module reloads.

import type { NewOrderInput, Order, OrderStatus } from "./types";

interface OrderStore {
  orders: Order[];
  seq: number;
}

const globalForStore = globalThis as unknown as {
  __tabloOrderStore?: OrderStore;
};

function seed(): OrderStore {
  const now = Date.now();
  const store: OrderStore = { orders: [], seq: 0 };
  // A couple of orders already "in the kitchen" so the dashboard isn't empty
  // the first time it's opened.
  store.orders.push(
    {
      id: "ord-1001",
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

/** All orders, newest first. */
export function listOrders(): Order[] {
  return [...getStore().orders].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function createOrder(input: NewOrderInput): Order {
  const store = getStore();
  store.seq += 1;
  const order: Order = {
    id: `ord-${store.seq}`,
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

export function updateOrderStatus(
  id: string,
  status: OrderStatus,
): Order | undefined {
  const order = getStore().orders.find((o) => o.id === id);
  if (!order) return undefined;
  order.status = status;
  return order;
}
