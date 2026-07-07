import "server-only";
import type { GuestRestaurant } from "@/components/menu/restaurant-context";
import { findRestaurantBySlug } from "@/lib/restaurants/store";
import { categoriesFor, listMenuItems } from "@/lib/menu/store";

/** Serializable snapshot of a restaurant + its live menu for the guest app.
 * Null when the slug doesn't resolve. */
export async function guestRestaurantForSlug(
  slug: string,
): Promise<GuestRestaurant | null> {
  const record = await findRestaurantBySlug(slug);
  if (!record) return null;
  const [categories, menuItems] = await Promise.all([
    categoriesFor(record.id),
    listMenuItems(record.id),
  ]);
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    initials: record.initials,
    tagline: record.tagline,
    currency: record.currency,
    tableCount: record.tableCount,
    categories,
    // Pick only the guest-facing fields so the client payload stays lean.
    items: menuItems.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      categoryId: item.categoryId,
      tags: item.tags,
      imageUrl: item.imageUrl,
      soldOut: item.soldOut,
      popular: item.popular,
      modifierGroups: item.modifierGroups,
    })),
  };
}
