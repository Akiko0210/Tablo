// Pure cart math — no React, no side effects. Unit tested in cart.test.ts.

import type { CartLine, MenuItem, ModifierOption } from "./types";

/**
 * Unit price for a configured item = base price + selected option deltas.
 * (Quantity is applied separately by the caller.)
 */
export function unitPriceFor(item: MenuItem, selected: ModifierOption[]): number {
  return selected.reduce((sum, o) => sum + o.priceDelta, item.price);
}

/**
 * Resolve selected option ids against an item's modifier groups, in menu
 * order. Ids that don't belong to the item are dropped — the caller decides
 * whether that's an error (server) or a no-op (UI).
 */
export function selectedOptionsFor(
  item: MenuItem,
  optionIds: string[],
): ModifierOption[] {
  const wanted = new Set(optionIds);
  return (item.modifierGroups ?? []).flatMap((g) =>
    g.options.filter((o) => wanted.has(o.id)),
  );
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
 * Build a stable line id from an item + its sorted selected option ids.
 * Two identical configurations collide (so quantities merge); different
 * configurations of the same item stay separate.
 */
export function buildLineId(itemId: string, optionIds: string[]): string {
  return `${itemId}|${[...optionIds].sort().join(",")}`;
}
