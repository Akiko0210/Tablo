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
  /** Unit price including selected options (before quantity). */
  unitPrice: number;
  /** Selected option labels, denormalized so history survives menu edits.
   * Old orders' `sizeLabel`/`addonLabels` are folded in here on read. */
  optionLabels: string[];
  note?: string;
}

export interface Order {
  id: string;
  /** Tenancy: which restaurant this order belongs to. */
  restaurantId: string;
  /** Table identifier the order came from (e.g. "7"). */
  table: string;
  lines: OrderLine[];
  subtotal: number;
  kitchenNote?: string;
  status: OrderStatus;
  /** ISO timestamp. */
  createdAt: string;
  /** True for synthetic history generated for the analysis charts. Seeded
   * orders are excluded from the live orders board. */
  seeded?: boolean;
}

/** One line of the untrusted payload the guest menu POSTs: item + selected
 * option ids only. The server resolves names and recomputes all prices. */
export interface NewOrderRequestLine {
  itemId: string;
  quantity: number;
  optionIds: string[];
  note?: string;
}

/** Shape the guest menu POSTs to create an order (restaurant resolved from the
 * URL slug server-side; prices never trusted from the body). */
export interface NewOrderRequest {
  table: string;
  lines: NewOrderRequestLine[];
  kitchenNote?: string;
}

/** Fully priced order input the store persists — produced server-side by
 * priceOrder(), never taken from the client. */
export interface NewOrderInput {
  table: string;
  lines: OrderLine[];
  subtotal: number;
  kitchenNote?: string;
}
