// Per-restaurant menu store. The demo restaurant is seeded from the in-repo
// mock menu; other restaurants start empty and are filled by the AI photo
// analysis (source: "ai") or by hand in the dashboard (source: "manual").
// Same globalThis/HMR pattern as the other stores.

import crypto from "node:crypto";
import type { AddOn, Category, MenuItem, SizeOption } from "@/lib/types";
import { restaurant as demoMenu } from "@/lib/menu-data";
import { DEMO_RESTAURANT_ID } from "@/lib/restaurants/store";
import { slugify } from "@/lib/restaurants/slug";

export type MenuItemSource = "seed" | "ai" | "manual";

export interface MenuItemRecord extends MenuItem {
  restaurantId: string;
  source: MenuItemSource;
  createdAt: string;
}

interface MenuStore {
  items: MenuItemRecord[];
}

const globalForMenu = globalThis as unknown as {
  __tabloMenuStore?: MenuStore;
};

function seed(): MenuStore {
  const createdAt = new Date(0).toISOString();
  return {
    items: demoMenu.items.map((item) => ({
      ...item,
      restaurantId: DEMO_RESTAURANT_ID,
      source: "seed" as const,
      createdAt,
    })),
  };
}

function getStore(): MenuStore {
  if (!globalForMenu.__tabloMenuStore) {
    globalForMenu.__tabloMenuStore = seed();
  }
  return globalForMenu.__tabloMenuStore;
}

export function listMenuItems(restaurantId: string): MenuItemRecord[] {
  return getStore().items.filter((i) => i.restaurantId === restaurantId);
}

export function findMenuItem(
  restaurantId: string,
  itemId: string,
): MenuItemRecord | undefined {
  return getStore().items.find(
    (i) => i.restaurantId === restaurantId && i.id === itemId,
  );
}

/**
 * Categories for a restaurant's menu, derived from its items. The demo
 * restaurant keeps its curated category order; others get categories in
 * first-appearance order. "Popular" is prepended when any item is flagged.
 */
export function categoriesFor(restaurantId: string): Category[] {
  if (restaurantId === DEMO_RESTAURANT_ID) return demoMenu.categories;

  const items = listMenuItems(restaurantId);
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
  sizes?: SizeOption[];
  addons?: AddOn[];
}

/** Ensure every size/add-on row carries a stable id — the dashboard editor may
 * send new rows without one. Empty lists collapse to undefined so the guest
 * item sheet hides the section entirely. */
function withOptionIds<T extends { id: string }>(
  list: T[] | undefined,
  prefix: string,
): T[] | undefined {
  if (!list || list.length === 0) return undefined;
  return list.map((option) => ({
    ...option,
    id: option.id?.trim() ? option.id : `${prefix}_${crypto.randomUUID().slice(0, 6)}`,
  }));
}

export function addMenuItem(
  restaurantId: string,
  input: MenuItemInput,
  source: MenuItemSource,
): MenuItemRecord {
  const store = getStore();
  const record: MenuItemRecord = {
    id: `mi_${crypto.randomUUID().slice(0, 8)}`,
    restaurantId,
    name: input.name.trim(),
    description: input.description.trim(),
    price: input.price,
    categoryId: slugify(input.category),
    tags: input.tags ?? [],
    emoji: input.emoji,
    imageUrl: input.imageUrl,
    popular: input.popular,
    soldOut: input.soldOut,
    sizes: withOptionIds(input.sizes, "sz"),
    addons: withOptionIds(input.addons, "ad"),
    source,
    createdAt: new Date().toISOString(),
  };
  store.items.push(record);
  return record;
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
  sizes?: SizeOption[];
  addons?: AddOn[];
}

export function updateMenuItem(
  restaurantId: string,
  itemId: string,
  patch: MenuItemPatch,
): MenuItemRecord | undefined {
  const record = findMenuItem(restaurantId, itemId);
  if (!record) return undefined;
  if (patch.name?.trim()) record.name = patch.name.trim();
  if (patch.description !== undefined) record.description = patch.description.trim();
  if (
    patch.price !== undefined &&
    Number.isFinite(patch.price) &&
    patch.price >= 0
  ) {
    record.price = patch.price;
  }
  if (patch.category?.trim()) record.categoryId = slugify(patch.category);
  if (patch.soldOut !== undefined) record.soldOut = patch.soldOut;
  if (patch.popular !== undefined) record.popular = patch.popular;
  if (patch.emoji !== undefined) record.emoji = patch.emoji || undefined;
  // Presence of the key (even undefined) means "set the photo" — an explicit
  // undefined clears it.
  if ("imageUrl" in patch) record.imageUrl = patch.imageUrl || undefined;
  if (patch.sizes !== undefined) record.sizes = withOptionIds(patch.sizes, "sz");
  if (patch.addons !== undefined) record.addons = withOptionIds(patch.addons, "ad");
  return record;
}

export function deleteMenuItem(restaurantId: string, itemId: string): boolean {
  const store = getStore();
  const idx = store.items.findIndex(
    (i) => i.restaurantId === restaurantId && i.id === itemId,
  );
  if (idx === -1) return false;
  store.items.splice(idx, 1);
  return true;
}

/** Used by the AI generator: replaces previously AI-generated items wholesale
 * (a re-run shouldn't duplicate), leaving seed/manual items untouched. */
export function replaceAiItems(
  restaurantId: string,
  inputs: MenuItemInput[],
): MenuItemRecord[] {
  const store = getStore();
  store.items = store.items.filter(
    (i) => !(i.restaurantId === restaurantId && i.source === "ai"),
  );
  return inputs.map((input) => addMenuItem(restaurantId, input, "ai"));
}
