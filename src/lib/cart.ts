// Pure cart math — no React, no side effects. Unit tested in cart.test.ts.

import type { AddOn, CartLine, MenuItem, SizeOption } from "./types";

/**
 * Unit price for a configured item = base price + size delta + add-on prices.
 * (Quantity is applied separately by the caller.)
 */
export function unitPriceFor(
  item: MenuItem,
  size: SizeOption | undefined,
  addons: AddOn[],
): number {
  const sizeDelta = size?.priceDelta ?? 0;
  const addonTotal = addons.reduce((sum, a) => sum + a.price, 0);
  return item.price + sizeDelta + addonTotal;
}

/** Line total = unit price × quantity. */
export function lineTotal(line: CartLine): number {
  return line.unitPrice * line.quantity;
}

/** Sum of all line totals. */
export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + lineTotal(line), 0);
}

/** Total number of items across all lines (used for the order-bar badge). */
export function cartItemCount(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

/**
 * Build a stable line id from an item + its chosen size + sorted add-on ids.
 * Two identical configurations collide (so quantities merge); different
 * configurations of the same item stay separate.
 */
export function buildLineId(
  itemId: string,
  sizeId: string | undefined,
  addonIds: string[],
): string {
  const addons = [...addonIds].sort().join(",");
  return `${itemId}|${sizeId ?? "_"}|${addons}`;
}
