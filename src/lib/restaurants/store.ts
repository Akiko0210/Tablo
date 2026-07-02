// Registry of restaurants — the tenancy root. Every dashboard account owns
// exactly one restaurant; orders, menu items, workers, and QR codes are all
// scoped by restaurantId. Same globalThis/HMR pattern as the other stores.

import crypto from "node:crypto";
import { restaurant as demoMenu } from "@/lib/menu-data";
import { initialsFrom } from "@/lib/auth/initials";
import { kitchenCodeFor, normalizeKitchenCode, uniqueSlug } from "./slug";

export interface RestaurantRecord {
  id: string;
  /** URL-safe identifier used in guest menu paths, e.g. /m/bella/7. */
  slug: string;
  name: string;
  initials: string;
  tagline: string;
  cuisine?: string;
  currency: string;
  tableCount: number;
  /** Access code for the kitchen app (shown in the dashboard). */
  kitchenCode: string;
  address?: string;
  phone?: string;
  description?: string;
  /** Session/user id of the owner (account id, or the seeded demo user id). */
  ownerUserId: string;
  demo?: boolean;
  createdAt: string;
}

interface RestaurantStore {
  restaurants: RestaurantRecord[];
}

import {
  DEMO_KITCHEN_CODE,
  DEMO_RESTAURANT_ID,
  DEMO_RESTAURANT_SLUG,
} from "./demo";

export { DEMO_KITCHEN_CODE, DEMO_RESTAURANT_ID, DEMO_RESTAURANT_SLUG };

const DEMO_OWNER_USER_ID = "u_sofia";

const globalForRestaurants = globalThis as unknown as {
  __tabloRestaurantStore?: RestaurantStore;
};

function seed(): RestaurantStore {
  return {
    restaurants: [
      {
        id: DEMO_RESTAURANT_ID,
        slug: DEMO_RESTAURANT_SLUG,
        name: demoMenu.name,
        initials: demoMenu.initials,
        tagline: demoMenu.tagline,
        cuisine: "Italian",
        currency: demoMenu.currency,
        tableCount: demoMenu.tableCount,
        kitchenCode: DEMO_KITCHEN_CODE,
        ownerUserId: DEMO_OWNER_USER_ID,
        demo: true,
        createdAt: new Date(0).toISOString(),
      },
    ],
  };
}

function getStore(): RestaurantStore {
  if (!globalForRestaurants.__tabloRestaurantStore) {
    globalForRestaurants.__tabloRestaurantStore = seed();
  }
  return globalForRestaurants.__tabloRestaurantStore;
}

export function findRestaurantById(id: string): RestaurantRecord | undefined {
  return getStore().restaurants.find((r) => r.id === id);
}

export function findRestaurantBySlug(slug: string): RestaurantRecord | undefined {
  return getStore().restaurants.find((r) => r.slug === slug);
}

export function findRestaurantByOwner(
  ownerUserId: string,
): RestaurantRecord | undefined {
  return getStore().restaurants.find((r) => r.ownerUserId === ownerUserId);
}

export function findRestaurantByKitchenCode(
  code: string,
): RestaurantRecord | undefined {
  const normalized = normalizeKitchenCode(code);
  return getStore().restaurants.find((r) => r.kitchenCode === normalized);
}

export interface CreateRestaurantInput {
  name: string;
  ownerUserId: string;
}

export function createRestaurant(input: CreateRestaurantInput): RestaurantRecord {
  const store = getStore();
  const taken = new Set(store.restaurants.map((r) => r.slug));
  const slug = uniqueSlug(input.name, taken);
  const digits = String(crypto.randomInt(1000, 10000));
  const record: RestaurantRecord = {
    id: `rest_${crypto.randomUUID()}`,
    slug,
    name: input.name.trim(),
    initials: initialsFrom(input.name),
    tagline: "Now serving",
    currency: "USD",
    tableCount: 12,
    kitchenCode: kitchenCodeFor(slug, digits),
    ownerUserId: input.ownerUserId,
    createdAt: new Date().toISOString(),
  };
  store.restaurants.push(record);
  return record;
}

export interface RestaurantPatch {
  name?: string;
  tagline?: string;
  cuisine?: string;
  tableCount?: number;
  address?: string;
  phone?: string;
  description?: string;
}

export function updateRestaurant(
  id: string,
  patch: RestaurantPatch,
): RestaurantRecord | undefined {
  const record = findRestaurantById(id);
  if (!record) return undefined;
  if (patch.name?.trim()) {
    record.name = patch.name.trim();
    record.initials = initialsFrom(record.name);
  }
  if (patch.tagline?.trim()) record.tagline = patch.tagline.trim();
  if (patch.cuisine !== undefined) record.cuisine = patch.cuisine || undefined;
  if (patch.tableCount && patch.tableCount >= 1 && patch.tableCount <= 500) {
    record.tableCount = Math.floor(patch.tableCount);
  }
  if (patch.address !== undefined) record.address = patch.address || undefined;
  if (patch.phone !== undefined) record.phone = patch.phone || undefined;
  if (patch.description !== undefined)
    record.description = patch.description || undefined;
  return record;
}
