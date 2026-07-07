// Defensive parsing of untrusted menu-item payloads from the dashboard.
// Pure — unit tested. Mirrors the parse-or-error pattern in auth/validate-signup.

import type { ModifierGroup, ModifierOption } from "@/lib/types";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export interface MenuItemBody {
  name: string;
  description: string;
  price: number;
  category: string;
  soldOut?: boolean;
  popular?: boolean;
  emoji?: string;
  /** Path to an uploaded photo (/api/uploads/[id]), or undefined to clear it. */
  imageUrl?: string;
  /** Guest-facing choice groups (sizes, protein, spice level, add-ons…). */
  modifierGroups?: ModifierGroup[];
}

interface ParseResult<T> {
  data?: T;
  error?: string;
}

/** How many choice groups a single item may carry. */
const MAX_GROUPS = 6;
/** How many option rows a single group may carry. */
const MAX_OPTIONS = 20;

function parsePrice(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0 || raw > 10000)
    return null;
  return Math.round(raw * 100) / 100;
}

function parseOptionId(raw: unknown): string | undefined {
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

/** An empty string clears the photo; otherwise it must be one of our own
 * upload paths (never an arbitrary/external URL rendered into an <img src>). */
function parseImageUrl(
  raw: unknown,
): { ok: true; value: string | undefined } | { ok: false } {
  if (typeof raw !== "string") return { ok: false };
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: undefined };
  if (trimmed.length > 300 || !trimmed.startsWith("/api/uploads/"))
    return { ok: false };
  return { ok: true, value: trimmed };
}

/** Parse one group's option rows. Ids are optional — the store assigns one to
 * any row that arrives without it. */
function parseOptions(raw: unknown): ParseResult<ModifierOption[]> {
  if (!Array.isArray(raw) || raw.length === 0)
    return { error: "Each choice group needs at least one option" };
  if (raw.length > MAX_OPTIONS) return { error: "Too many options in a group" };
  const options: ModifierOption[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) return { error: "Invalid option" };
    if (typeof entry.label !== "string" || !entry.label.trim())
      return { error: "Each option needs a label" };
    if (entry.label.trim().length > 60)
      return { error: "Option label is too long" };
    const priceDelta = parsePrice(entry.priceDelta);
    if (priceDelta === null) return { error: "Option price must be 0 or more" };
    if (
      entry.note !== undefined &&
      (typeof entry.note !== "string" || entry.note.length > 40)
    )
      return { error: "Invalid option note" };
    options.push({
      id: parseOptionId(entry.id) ?? "",
      label: entry.label.trim(),
      priceDelta,
      note:
        typeof entry.note === "string" && entry.note.trim()
          ? entry.note.trim()
          : undefined,
    });
  }
  return { data: options };
}

/** Parse the item's choice groups. Enforces min ≤ max ≤ option count and
 * normalizes a required group's min to at least 1. */
function parseModifierGroups(raw: unknown): ParseResult<ModifierGroup[]> {
  if (!Array.isArray(raw)) return { error: "Invalid choice groups" };
  if (raw.length > MAX_GROUPS) return { error: "Too many choice groups" };
  const groups: ModifierGroup[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) return { error: "Invalid choice group" };
    if (typeof entry.label !== "string" || !entry.label.trim())
      return { error: "Each choice group needs a label" };
    if (entry.label.trim().length > 60)
      return { error: "Group label is too long" };
    const required = entry.required === true;
    const options = parseOptions(entry.options);
    if (options.error || !options.data) return { error: options.error };
    const min = parseSelectCount(entry.min, 0);
    const max = parseSelectCount(entry.max, 1);
    if (min === null || max === null)
      return { error: "Invalid min/max selection counts" };
    const effectiveMin = required ? Math.max(min, 1) : min;
    if (effectiveMin > max || max > options.data.length)
      return { error: "Selection counts must fit the options (min ≤ max ≤ options)" };
    groups.push({
      id: parseOptionId(entry.id) ?? "",
      label: entry.label.trim(),
      min: effectiveMin,
      max,
      required,
      options: options.data,
    });
  }
  return { data: groups };
}

function parseSelectCount(raw: unknown, fallback: number): number | null {
  if (raw === undefined) return fallback;
  if (
    typeof raw !== "number" ||
    !Number.isInteger(raw) ||
    raw < 0 ||
    raw > MAX_OPTIONS
  )
    return null;
  return raw;
}

export function parseMenuItemInput(body: unknown): ParseResult<MenuItemBody> {
  if (!isRecord(body)) return { error: "Invalid request" };
  const { name, description, price, category, soldOut, popular, emoji } = body;

  if (typeof name !== "string" || !name.trim())
    return { error: "Name is required" };
  if (name.trim().length > 80) return { error: "Name is too long" };

  if (description !== undefined && typeof description !== "string")
    return { error: "Invalid description" };
  if (typeof description === "string" && description.length > 300)
    return { error: "Description is too long" };

  const parsedPrice = parsePrice(price);
  if (parsedPrice === null)
    return { error: "Price must be a number between 0 and 10000" };

  if (typeof category !== "string" || !category.trim())
    return { error: "Category is required" };
  if (category.trim().length > 40) return { error: "Category is too long" };

  if (soldOut !== undefined && typeof soldOut !== "boolean")
    return { error: "Invalid soldOut" };
  if (popular !== undefined && typeof popular !== "boolean")
    return { error: "Invalid popular" };
  if (emoji !== undefined && (typeof emoji !== "string" || emoji.length > 8))
    return { error: "Invalid emoji" };

  let imageUrl: string | undefined;
  if (body.imageUrl !== undefined) {
    const parsed = parseImageUrl(body.imageUrl);
    if (!parsed.ok) return { error: "Invalid image" };
    imageUrl = parsed.value;
  }

  let modifierGroups: ModifierGroup[] | undefined;
  if (body.modifierGroups !== undefined) {
    const parsed = parseModifierGroups(body.modifierGroups);
    if (parsed.error || !parsed.data) return { error: parsed.error };
    modifierGroups = parsed.data;
  }

  return {
    data: {
      name: name.trim(),
      description: typeof description === "string" ? description.trim() : "",
      price: parsedPrice,
      category: category.trim(),
      soldOut,
      popular,
      emoji: emoji?.trim() || undefined,
      imageUrl,
      modifierGroups,
    },
  };
}

/** Same fields, but everything optional (PATCH). At least one must be set. */
export function parseMenuItemPatch(
  body: unknown,
): ParseResult<Partial<MenuItemBody>> {
  if (!isRecord(body)) return { error: "Invalid request" };
  const patch: Partial<MenuItemBody> = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim() || body.name.length > 80)
      return { error: "Invalid name" };
    patch.name = body.name.trim();
  }
  if (body.description !== undefined) {
    if (typeof body.description !== "string" || body.description.length > 300)
      return { error: "Invalid description" };
    patch.description = body.description.trim();
  }
  if (body.price !== undefined) {
    const price = parsePrice(body.price);
    if (price === null) return { error: "Invalid price" };
    patch.price = price;
  }
  if (body.category !== undefined) {
    if (
      typeof body.category !== "string" ||
      !body.category.trim() ||
      body.category.length > 40
    )
      return { error: "Invalid category" };
    patch.category = body.category.trim();
  }
  if (body.soldOut !== undefined) {
    if (typeof body.soldOut !== "boolean") return { error: "Invalid soldOut" };
    patch.soldOut = body.soldOut;
  }
  if (body.popular !== undefined) {
    if (typeof body.popular !== "boolean") return { error: "Invalid popular" };
    patch.popular = body.popular;
  }
  if (body.emoji !== undefined) {
    if (typeof body.emoji !== "string" || body.emoji.length > 8)
      return { error: "Invalid emoji" };
    patch.emoji = body.emoji.trim();
  }
  if (body.imageUrl !== undefined) {
    const parsed = parseImageUrl(body.imageUrl);
    if (!parsed.ok) return { error: "Invalid image" };
    // Present-but-undefined = clear the photo; the store treats the key's
    // presence as intent, so this still counts as a change.
    patch.imageUrl = parsed.value;
  }
  if (body.modifierGroups !== undefined) {
    const parsed = parseModifierGroups(body.modifierGroups);
    if (parsed.error || !parsed.data) return { error: parsed.error };
    patch.modifierGroups = parsed.data;
  }

  if (Object.keys(patch).length === 0) return { error: "Nothing to update" };
  return { data: patch };
}
