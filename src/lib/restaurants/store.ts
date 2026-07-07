// Registry of restaurants — the tenancy root. Every dashboard account owns
// exactly one restaurant; orders, menu items, workers, and QR codes are all
// scoped by restaurantId. Backed by Postgres via Prisma; the exports keep the
// same names/shapes as the old in-memory store, just async.

import crypto from "node:crypto";
import type { Restaurant as RestaurantRow } from "@prisma/client";
import { prisma } from "@/lib/db";
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

import {
  DEMO_KITCHEN_CODE,
  DEMO_RESTAURANT_ID,
  DEMO_RESTAURANT_SLUG,
} from "./demo";

export { DEMO_KITCHEN_CODE, DEMO_RESTAURANT_ID, DEMO_RESTAURANT_SLUG };

function toRecord(row: RestaurantRow): RestaurantRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    initials: row.initials,
    tagline: row.tagline,
    cuisine: row.cuisine ?? undefined,
    currency: row.currency,
    tableCount: row.tableCount,
    kitchenCode: row.kitchenCode,
    address: row.address ?? undefined,
    phone: row.phone ?? undefined,
    description: row.description ?? undefined,
    ownerUserId: row.ownerUserId,
    demo: row.demo || undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function findRestaurantById(
  id: string,
): Promise<RestaurantRecord | undefined> {
  const row = await prisma.restaurant.findUnique({ where: { id } });
  return row ? toRecord(row) : undefined;
}

export async function findRestaurantBySlug(
  slug: string,
): Promise<RestaurantRecord | undefined> {
  const row = await prisma.restaurant.findUnique({ where: { slug } });
  return row ? toRecord(row) : undefined;
}

export async function findRestaurantByOwner(
  ownerUserId: string,
): Promise<RestaurantRecord | undefined> {
  const row = await prisma.restaurant.findUnique({ where: { ownerUserId } });
  return row ? toRecord(row) : undefined;
}

export async function findRestaurantByKitchenCode(
  code: string,
): Promise<RestaurantRecord | undefined> {
  const normalized = normalizeKitchenCode(code);
  const row = await prisma.restaurant.findUnique({
    where: { kitchenCode: normalized },
  });
  return row ? toRecord(row) : undefined;
}

export interface CreateRestaurantInput {
  name: string;
  ownerUserId: string;
}

export async function createRestaurant(
  input: CreateRestaurantInput,
): Promise<RestaurantRecord> {
  const existing = await prisma.restaurant.findMany({ select: { slug: true } });
  const taken = new Set(existing.map((r) => r.slug));
  const slug = uniqueSlug(input.name, taken);
  const digits = String(crypto.randomInt(1000, 10000));
  const row = await prisma.restaurant.create({
    data: {
      id: `rest_${crypto.randomUUID()}`,
      slug,
      name: input.name.trim(),
      initials: initialsFrom(input.name),
      tagline: "Now serving",
      currency: "USD",
      tableCount: 12,
      kitchenCode: kitchenCodeFor(slug, digits),
      ownerUserId: input.ownerUserId,
    },
  });
  return toRecord(row);
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

export async function updateRestaurant(
  id: string,
  patch: RestaurantPatch,
): Promise<RestaurantRecord | undefined> {
  const data: Record<string, unknown> = {};
  if (patch.name?.trim()) {
    data.name = patch.name.trim();
    data.initials = initialsFrom(patch.name);
  }
  if (patch.tagline?.trim()) data.tagline = patch.tagline.trim();
  if (patch.cuisine !== undefined) data.cuisine = patch.cuisine || null;
  if (patch.tableCount && patch.tableCount >= 1 && patch.tableCount <= 500) {
    data.tableCount = Math.floor(patch.tableCount);
  }
  if (patch.address !== undefined) data.address = patch.address || null;
  if (patch.phone !== undefined) data.phone = patch.phone || null;
  if (patch.description !== undefined)
    data.description = patch.description || null;
  try {
    const row = await prisma.restaurant.update({ where: { id }, data });
    return toRecord(row);
  } catch {
    return undefined;
  }
}
