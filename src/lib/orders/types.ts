// Order model shared between the guest menu (which creates orders) and the
// restaurant dashboard (which receives and advances them).

export type OrderStatus = "new" | "preparing" | "ready" | "served";

export const ORDER_STATUSES: OrderStatus[] = [
  "new",
  "preparing",
  "ready",
  "served",
];

export interface OrderLine {
  name: string;
  quantity: number;
  /** Unit price including size + add-ons (before quantity). */
  unitPrice: number;
  sizeLabel?: string;
  addonLabels: string[];
  note?: string;
}

export interface Order {
  id: string;
  /** Table identifier the order came from (e.g. "7"). */
  table: string;
  lines: OrderLine[];
  subtotal: number;
  kitchenNote?: string;
  status: OrderStatus;
  /** ISO timestamp. */
  createdAt: string;
}

/** Shape the guest menu POSTs to create an order. */
export interface NewOrderInput {
  table: string;
  lines: OrderLine[];
  subtotal: number;
  kitchenNote?: string;
}
