import "server-only";
import { findRestaurantById } from "@/lib/restaurants/store";
import { listMenuItems } from "@/lib/menu/store";
import { insertSeededHistory } from "@/lib/orders/store";
import { generateHistory } from "./seed-history";

/**
 * Makes sure the DEMO restaurant has sample sales history for the Analysis
 * charts. Real restaurants never get synthetic orders — their analytics start
 * empty and fill with live data (insights guard against low volume instead).
 * Runs lazily the first time the page is opened after the menu has items;
 * no-ops on every later call (historySeededAt tracks who's been seeded).
 */
export async function ensureAnalysisHistory(restaurantId: string): Promise<void> {
  const restaurant = await findRestaurantById(restaurantId);
  if (!restaurant?.demo) return;
  const menuItems = (await listMenuItems(restaurantId))
    .filter((i) => i.price > 0)
    .map((i) => ({ name: i.name, price: i.price }));
  if (menuItems.length === 0) return;
  await insertSeededHistory(restaurantId, generateHistory(restaurantId, menuItems));
}
