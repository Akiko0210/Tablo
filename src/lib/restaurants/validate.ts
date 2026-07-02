// Defensive parsing of the untrusted restaurant-settings payload. Pure.

import type { RestaurantPatch } from "./store";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

interface ParseResult {
  data?: RestaurantPatch;
  error?: string;
}

type PatchStringField = Exclude<keyof RestaurantPatch, "tableCount">;

const STRING_FIELDS: Array<[PatchStringField, number]> = [
  ["name", 80],
  ["tagline", 140],
  ["cuisine", 60],
  ["address", 200],
  ["phone", 40],
  ["description", 1000],
];

export function parseRestaurantPatch(body: unknown): ParseResult {
  if (!isRecord(body)) return { error: "Invalid request" };

  const data: RestaurantPatch = {};

  for (const [field, maxLen] of STRING_FIELDS) {
    const raw = body[field];
    if (raw === undefined) continue;
    if (raw === null || raw === "") {
      if (field === "name") return { error: "Name can't be empty" };
      data[field] = "";
      continue;
    }
    if (typeof raw !== "string") return { error: `Invalid ${field}` };
    if (raw.trim().length > maxLen) return { error: `${field} is too long` };
    data[field] = raw.trim();
  }

  const { tableCount } = body;
  if (tableCount !== undefined && tableCount !== null && tableCount !== "") {
    if (
      typeof tableCount !== "number" ||
      !Number.isInteger(tableCount) ||
      tableCount < 1 ||
      tableCount > 500
    ) {
      return { error: "Number of tables must be between 1 and 500" };
    }
    data.tableCount = tableCount;
  }

  if (Object.keys(data).length === 0) return { error: "Nothing to update" };
  return { data };
}
