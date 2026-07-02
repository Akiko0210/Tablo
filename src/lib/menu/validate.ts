// Defensive parsing of untrusted menu-item payloads from the dashboard.
// Pure — unit tested. Mirrors the parse-or-error pattern in auth/validate-signup.

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
}

interface ParseResult<T> {
  data?: T;
  error?: string;
}

function parsePrice(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0 || raw > 10000)
    return null;
  return Math.round(raw * 100) / 100;
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

  return {
    data: {
      name: name.trim(),
      description: typeof description === "string" ? description.trim() : "",
      price: parsedPrice,
      category: category.trim(),
      soldOut,
      popular,
      emoji: emoji?.trim() || undefined,
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

  if (Object.keys(patch).length === 0) return { error: "Nothing to update" };
  return { data: patch };
}
