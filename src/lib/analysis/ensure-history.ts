import "server-only";
import { listMenuItems } from "@/lib/menu/store";
import { insertSeededHistory } from "@/lib/orders/store";
import { generateHistory } from "./seed-history";

/**
 * Makes sure a restaurant has sample sales history for the Analysis charts.
 * Runs lazily the first time the page is opened after the menu has items;
 * no-ops on every later call (the store tracks who's been seeded).
 */
export function ensureAnalysisHistory(restaurantId: string): void {
  const menuItems = listMenuItems(restaurantId)
    .filter((i) => i.price > 0)
    .map((i) => ({ name: i.name, price: i.price }));
  if (menuItems.length === 0) return;
  insertSeededHistory(restaurantId, generateHistory(restaurantId, menuItems));
}
