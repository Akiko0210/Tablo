// Defensive parsing of the untrusted order payload a guest POSTs. Only shape
// checks live here — pricing and menu validation happen in price.ts against
// the restaurant's real menu. Pure — unit tested.

import type { NewOrderRequest, NewOrderRequestLine } from "./types";

/** Hard caps so a hostile payload can't create absurd rows. */
const MAX_LINES = 50;
const MAX_QUANTITY = 99;
const MAX_OPTION_IDS = 40;
const MAX_NOTE_LENGTH = 300;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parseLine(raw: unknown): NewOrderRequestLine | null {
  if (!isRecord(raw)) return null;
  const { itemId, quantity, optionIds, note } = raw;
  if (typeof itemId !== "string" || !itemId.trim()) return null;
  if (
    typeof quantity !== "number" ||
    !Number.isFinite(quantity) ||
    quantity < 1 ||
    quantity > MAX_QUANTITY
  )
    return null;
  let ids: string[] = [];
  if (optionIds !== undefined) {
    if (!Array.isArray(optionIds) || optionIds.length > MAX_OPTION_IDS)
      return null;
    if (!optionIds.every((id): id is string => typeof id === "string"))
      return null;
    ids = optionIds;
  }
  if (note !== undefined && typeof note !== "string") return null;
  const trimmedNote = typeof note === "string" ? note.trim() : "";
  if (trimmedNote.length > MAX_NOTE_LENGTH) return null;
  return {
    itemId: itemId.trim(),
    quantity: Math.floor(quantity),
    optionIds: ids,
    note: trimmedNote || undefined,
  };
}

export function parseNewOrder(body: unknown): NewOrderRequest | null {
  if (!isRecord(body)) return null;
  const { table, lines, kitchenNote } = body;

  if (typeof table !== "string" || !table.trim()) return null;
  if (!Array.isArray(lines) || lines.length === 0 || lines.length > MAX_LINES)
    return null;

  const parsedLines: NewOrderRequestLine[] = [];
  for (const raw of lines) {
    const line = parseLine(raw);
    if (!line) return null;
    parsedLines.push(line);
  }

  if (kitchenNote !== undefined && typeof kitchenNote !== "string") return null;
  const trimmedKitchenNote =
    typeof kitchenNote === "string" ? kitchenNote.trim() : "";
  if (trimmedKitchenNote.length > MAX_NOTE_LENGTH) return null;

  return {
    table: table.trim(),
    lines: parsedLines,
    kitchenNote: trimmedKitchenNote || undefined,
  };
}
