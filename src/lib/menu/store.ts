// Per-restaurant menu store, backed by Postgres via Prisma. Exports keep the
// old in-memory names/shapes, just async.

import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { Category, MenuItem, ModifierGroup } from "@/lib/types";
import { restaurant as demoMenu } from "@/lib/menu-data";
import { DEMO_RESTAURANT_ID } from "@/lib/restaurants/demo";
import { slugify } from "@/lib/restaurants/slug";
import { prisma } from "@/lib/db";

export type MenuItemSource = "seed" | "ai" | "manual";

export interface MenuItemRecord extends MenuItem {
  restaurantId: string;
  source: MenuItemSource;
  createdAt: string;
}

type ItemWithGroups = Prisma.MenuItemGetPayload<{
  include: { modifierGroups: { include: { options: true } } };
}>;

const itemInclude = {
  modifierGroups: {
    include: { options: { orderBy: { sortIndex: "asc" as const } } },
    orderBy: { sortIndex: "asc" as const },
  },
};

function toRecord(row: ItemWithGroups): MenuItemRecord {
  const modifierGroups: ModifierGroup[] = row.modifierGroups.map((g) => ({
    id: g.id,
    label: g.label,
    min: g.minSelect,
    max: g.maxSelect,
    required: g.required,
    options: g.options.map((o) => ({
      id: o.id,
      label: o.label,
      priceDelta: Number(o.priceDelta),
      note: o.note ?? undefined,
    })),
  }));
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    categoryId: row.categoryId,
    tags: row.tags as MenuItem["tags"],
    emoji: row.emoji ?? undefined,
    imageUrl: row.imageUrl ?? undefined,
    soldOut: row.soldOut || undefined,
    popular: row.popular || undefined,
    modifierGroups: modifierGroups.length ? modifierGroups : undefined,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listMenuItems(
  restaurantId: string,
): Promise<MenuItemRecord[]> {
  const rows = await prisma.menuItem.findMany({
    where: { restaurantId },
    include: itemInclude,
    orderBy: [{ sortIndex: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toRecord);
}

export async function findMenuItem(
  restaurantId: string,
  itemId: string,
): Promise<MenuItemRecord | undefined> {
  const row = await prisma.menuItem.findFirst({
    where: { restaurantId, id: itemId },
    include: itemInclude,
  });
  return row ? toRecord(row) : undefined;
}

/**
 * Categories for a restaurant's menu, derived from its items. The demo
 * restaurant keeps its curated category order; others get categories in
 * first-appearance order. "Popular" is prepended when any item is flagged.
 */
export async function categoriesFor(restaurantId: string): Promise<Category[]> {
  if (restaurantId === DEMO_RESTAURANT_ID) return demoMenu.categories;

  const items = await prisma.menuItem.findMany({
    where: { restaurantId },
    select: { categoryId: true, popular: true },
    orderBy: [{ sortIndex: "asc" }, { createdAt: "asc" }],
  });
  const seen = new Map<string, string>();
  for (const item of items) {
    if (!seen.has(item.categoryId)) {
      seen.set(item.categoryId, categoryLabelFromId(item.categoryId));
    }
  }
  const categories: Category[] = [...seen].map(([id, label]) => ({ id, label }));
  if (items.some((i) => i.popular)) {
    categories.unshift({ id: "popular", label: "Popular" });
  }
  return categories;
}

function categoryLabelFromId(id: string): string {
  return id
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export interface MenuItemInput {
  name: string;
  description: string;
  price: number;
  category: string;
  tags?: MenuItem["tags"];
  emoji?: string;
  imageUrl?: string;
  popular?: boolean;
  soldOut?: boolean;
  /** Groups whose option ids may be "" — the store assigns ids to new rows. */
  modifierGroups?: ModifierGroup[];
}

function optionId(existing: string | undefined, prefix: string): string {
  return existing?.trim()
    ? existing
    : `${prefix}_${crypto.randomUUID().slice(0, 6)}`;
}

/** Nested-create payload for an item's modifier groups. An empty list is
 * omitted so the guest item sheet hides the options entirely. */
function groupsCreate(
  groups: ModifierGroup[] | undefined,
): Prisma.ModifierGroupCreateNestedManyWithoutMenuItemInput | undefined {
  if (!groups || groups.length === 0) return undefined;
  return {
    create: groups.map((g, gi) => ({
      id: optionId(g.id, "mg"),
      label: g.label,
      minSelect: g.min,
      maxSelect: g.max,
      required: g.required,
      sortIndex: gi,
      options: {
        create: g.options.map((o, oi) => ({
          id: optionId(o.id, "opt"),
          label: o.label,
          priceDelta: o.priceDelta,
          note: o.note ?? null,
          sortIndex: oi,
        })),
      },
    })),
  };
}

export async function addMenuItem(
  restaurantId: string,
  input: MenuItemInput,
  source: MenuItemSource,
): Promise<MenuItemRecord> {
  const row = await prisma.menuItem.create({
    data: {
      id: `mi_${crypto.randomUUID().slice(0, 8)}`,
      restaurantId,
      name: input.name.trim(),
      description: input.description.trim(),
      price: input.price,
      categoryId: slugify(input.category),
      tags: input.tags ?? [],
      emoji: input.emoji ?? null,
      imageUrl: input.imageUrl ?? null,
      popular: input.popular ?? false,
      soldOut: input.soldOut ?? false,
      source,
      modifierGroups: groupsCreate(input.modifierGroups),
    },
    include: itemInclude,
  });
  return toRecord(row);
}

export interface MenuItemPatch {
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  soldOut?: boolean;
  popular?: boolean;
  emoji?: string;
  imageUrl?: string;
  modifierGroups?: ModifierGroup[];
}

export async function updateMenuItem(
  restaurantId: string,
  itemId: string,
  patch: MenuItemPatch,
): Promise<MenuItemRecord | undefined> {
  const current = await findMenuItem(restaurantId, itemId);
  if (!current) return undefined;

  const data: Prisma.MenuItemUpdateInput = {};
  if (patch.name?.trim()) data.name = patch.name.trim();
  if (patch.description !== undefined) data.description = patch.description.trim();
  if (
    patch.price !== undefined &&
    Number.isFinite(patch.price) &&
    patch.price >= 0
  ) {
    data.price = patch.price;
  }
  if (patch.category?.trim()) data.categoryId = slugify(patch.category);
  if (patch.soldOut !== undefined) data.soldOut = patch.soldOut;
  if (patch.popular !== undefined) data.popular = patch.popular;
  if (patch.emoji !== undefined) data.emoji = patch.emoji || null;
  // Presence of the key (even undefined) means "set the photo" — an explicit
  // undefined clears it.
  if ("imageUrl" in patch) data.imageUrl = patch.imageUrl || null;

  // Group edits replace the item's groups wholesale (simplest correct model
  // for a full-form editor; option ids are preserved when the editor sends
  // them back).
  if (patch.modifierGroups !== undefined) {
    data.modifierGroups = {
      deleteMany: {},
      ...groupsCreate(patch.modifierGroups),
    };
  }

  const row = await prisma.menuItem.update({
    where: { id: itemId },
    data,
    include: itemInclude,
  });
  return toRecord(row);
}

export async function deleteMenuItem(
  restaurantId: string,
  itemId: string,
): Promise<boolean> {
  const { count } = await prisma.menuItem.deleteMany({
    where: { restaurantId, id: itemId },
  });
  return count > 0;
}

/** Used by the AI generator: replaces previously AI-generated items wholesale
 * (a re-run shouldn't duplicate), leaving seed/manual items untouched. */
export async function replaceAiItems(
  restaurantId: string,
  inputs: MenuItemInput[],
): Promise<MenuItemRecord[]> {
  await prisma.menuItem.deleteMany({ where: { restaurantId, source: "ai" } });
  const records: MenuItemRecord[] = [];
  for (const input of inputs) {
    records.push(await addMenuItem(restaurantId, input, "ai"));
  }
  return records;
}
