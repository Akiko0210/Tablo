// Defensive parsing of the untrusted order payload a guest POSTs. Returns a
// clean NewOrderInput or null if the shape is invalid. Pure — unit tested.

import type { NewOrderInput, OrderLine } from "./types";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parseLine(raw: unknown): OrderLine | null {
  if (!isRecord(raw)) return null;
  const { name, quantity, unitPrice, sizeLabel, addonLabels, note } = raw;
  if (typeof name !== "string" || !name.trim()) return null;
  if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity < 1)
    return null;
  if (typeof unitPrice !== "number" || !Number.isFinite(unitPrice) || unitPrice < 0)
    return null;
  return {
    name: name.trim(),
    quantity: Math.floor(quantity),
    unitPrice,
    sizeLabel: typeof sizeLabel === "string" ? sizeLabel : undefined,
    addonLabels: Array.isArray(addonLabels)
      ? addonLabels.filter((a): a is string => typeof a === "string")
      : [],
    note: typeof note === "string" && note.trim() ? note.trim() : undefined,
  };
}

export function parseNewOrder(body: unknown): NewOrderInput | null {
  if (!isRecord(body)) return null;
  const { table, lines, subtotal, kitchenNote } = body;

  if (typeof table !== "string" || !table.trim()) return null;
  if (!Array.isArray(lines) || lines.length === 0) return null;

  const parsedLines: OrderLine[] = [];
  for (const raw of lines) {
    const line = parseLine(raw);
    if (!line) return null;
    parsedLines.push(line);
  }

  if (typeof subtotal !== "number" || !Number.isFinite(subtotal) || subtotal < 0)
    return null;

  return {
    table: table.trim(),
    lines: parsedLines,
    subtotal,
    kitchenNote:
      typeof kitchenNote === "string" && kitchenNote.trim()
        ? kitchenNote.trim()
        : undefined,
  };
}
