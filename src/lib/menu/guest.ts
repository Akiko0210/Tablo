import "server-only";
import type { GuestRestaurant } from "@/components/menu/restaurant-context";
import { findRestaurantBySlug } from "@/lib/restaurants/store";
import { categoriesFor, listMenuItems } from "@/lib/menu/store";

/** Serializable snapshot of a restaurant + its live menu for the guest app.
 * Null when the slug doesn't resolve. */
export function guestRestaurantForSlug(slug: string): GuestRestaurant | null {
  const record = findRestaurantBySlug(slug);
  if (!record) return null;
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    initials: record.initials,
    tagline: record.tagline,
    currency: record.currency,
    tableCount: record.tableCount,
    categories: categoriesFor(record.id),
    // Pick only the guest-facing fields so the client payload stays lean.
    items: listMenuItems(record.id).map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      categoryId: item.categoryId,
      tags: item.tags,
      emoji: item.emoji,
      soldOut: item.soldOut,
      popular: item.popular,
      sizes: item.sizes,
      addons: item.addons,
    })),
  };
}
