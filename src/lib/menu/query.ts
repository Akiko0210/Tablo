// Pure menu-query helpers shared by the guest menu, parameterized by the
// item list (multi-tenant — no module-level restaurant). Unit tested.

import type { MenuItem } from "@/lib/types";

/** Items to show for a given category id. "popular" is a virtual category. */
export function itemsForCategory(
  items: MenuItem[],
  categoryId: string,
): MenuItem[] {
  if (categoryId === "popular") return items.filter((i) => i.popular);
  return items.filter((i) => i.categoryId === categoryId);
}

/** Case-insensitive search across name, description, and tags. */
export function searchItems(items: MenuItem[], query: string): MenuItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return items.filter((i) => {
    const haystack = `${i.name} ${i.description} ${i.tags.join(" ")}`.toLowerCase();
    return haystack.includes(q);
  });
}
