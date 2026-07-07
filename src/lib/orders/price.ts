// Server-side order pricing. Takes a shape-checked NewOrderRequest plus the
// restaurant's live menu, validates every selection against the item's
// modifier groups, and recomputes all prices — client-supplied prices are
// never trusted. Pure — unit tested.

import type { MenuItem } from "@/lib/types";
import type { NewOrderInput, NewOrderRequest, OrderLine } from "./types";

interface PriceResult {
  data?: NewOrderInput;
  /** Guest-safe message describing the first problem found. */
  error?: string;
}

/** Effective minimum picks for a group: a required group demands at least 1. */
function minFor(group: { min: number; required: boolean }): number {
  return group.required ? Math.max(group.min, 1) : group.min;
}

function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

export function priceOrder(
  menuItems: MenuItem[],
  request: NewOrderRequest,
): PriceResult {
  const byId = new Map(menuItems.map((i) => [i.id, i]));
  const lines: OrderLine[] = [];
  let subtotal = 0;

  for (const line of request.lines) {
    const item = byId.get(line.itemId);
    if (!item) return { error: "An item in your order is no longer on the menu." };
    if (item.soldOut) return { error: `${item.name} just sold out.` };

    const remaining = new Set(line.optionIds);
    if (remaining.size !== line.optionIds.length)
      return { error: "Invalid options selected." };

    const optionLabels: string[] = [];
    let unitPrice = item.price;

    for (const group of item.modifierGroups ?? []) {
      let picks = 0;
      for (const option of group.options) {
        if (!remaining.has(option.id)) continue;
        remaining.delete(option.id);
        picks += 1;
        unitPrice += option.priceDelta;
        optionLabels.push(option.label);
      }
      if (picks < minFor(group) || picks > group.max) {
        return { error: `Please review the ${group.label} choice for ${item.name}.` };
      }
    }

    // Ids that matched no group on this item.
    if (remaining.size > 0) return { error: "Invalid options selected." };

    unitPrice = roundCents(unitPrice);
    subtotal += unitPrice * line.quantity;
    lines.push({
      name: item.name,
      quantity: line.quantity,
      unitPrice,
      optionLabels,
      note: line.note,
    });
  }

  return {
    data: {
      table: request.table,
      lines,
      subtotal: roundCents(subtotal),
      kitchenNote: request.kitchenNote,
    },
  };
}
