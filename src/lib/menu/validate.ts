// Defensive parsing of untrusted menu-item payloads from the dashboard.
// Pure — unit tested. Mirrors the parse-or-error pattern in auth/validate-signup.

import type { AddOn, SizeOption } from "@/lib/types";

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
  /** Guest-facing size choices (e.g. Regular / Large). */
  sizes?: SizeOption[];
  /** Guest-facing add-ons (e.g. Extra mozzarella). */
  addons?: AddOn[];
}

interface ParseResult<T> {
  data?: T;
  error?: string;
}

/** How many size / add-on rows a single item may carry. */
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

/** Parse the "Size" rows shown on the guest item sheet. Ids are optional — the
 * store assigns one to any row that arrives without it. */
function parseSizes(raw: unknown): ParseResult<SizeOption[]> {
  if (!Array.isArray(raw)) return { error: "Invalid sizes" };
  if (raw.length > MAX_OPTIONS) return { error: "Too many sizes" };
  const sizes: SizeOption[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) return { error: "Invalid size" };
    if (typeof entry.label !== "string" || !entry.label.trim())
      return { error: "Each size needs a label" };
    if (entry.label.trim().length > 60) return { error: "Size label is too long" };
    const priceDelta = parsePrice(entry.priceDelta);
    if (priceDelta === null) return { error: "Size price must be 0 or more" };
    if (
      entry.note !== undefined &&
      (typeof entry.note !== "string" || entry.note.length > 40)
    )
      return { error: "Invalid size note" };
    sizes.push({
      id: parseOptionId(entry.id) ?? "",
      label: entry.label.trim(),
      priceDelta,
      note:
        typeof entry.note === "string" && entry.note.trim()
          ? entry.note.trim()
          : undefined,
    });
  }
  return { data: sizes };
}

/** Parse the "Add-ons" rows shown on the guest item sheet. */
function parseAddons(raw: unknown): ParseResult<AddOn[]> {
  if (!Array.isArray(raw)) return { error: "Invalid add-ons" };
  if (raw.length > MAX_OPTIONS) return { error: "Too many add-ons" };
  const addons: AddOn[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) return { error: "Invalid add-on" };
    if (typeof entry.label !== "string" || !entry.label.trim())
      return { error: "Each add-on needs a label" };
    if (entry.label.trim().length > 60)
      return { error: "Add-on label is too long" };
    const price = parsePrice(entry.price);
    if (price === null) return { error: "Add-on price must be 0 or more" };
    addons.push({
      id: parseOptionId(entry.id) ?? "",
      label: entry.label.trim(),
      price,
    });
  }
  return { data: addons };
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

  let sizes: SizeOption[] | undefined;
  if (body.sizes !== undefined) {
    const parsed = parseSizes(body.sizes);
    if (parsed.error || !parsed.data) return { error: parsed.error };
    sizes = parsed.data;
  }

  let addons: AddOn[] | undefined;
  if (body.addons !== undefined) {
    const parsed = parseAddons(body.addons);
    if (parsed.error || !parsed.data) return { error: parsed.error };
    addons = parsed.data;
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
      sizes,
      addons,
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
  if (body.sizes !== undefined) {
    const parsed = parseSizes(body.sizes);
    if (parsed.error || !parsed.data) return { error: parsed.error };
    patch.sizes = parsed.data;
  }
  if (body.addons !== undefined) {
    const parsed = parseAddons(body.addons);
    if (parsed.error || !parsed.data) return { error: parsed.error };
    patch.addons = parsed.data;
  }

  if (Object.keys(patch).length === 0) return { error: "Nothing to update" };
  return { data: patch };
}
