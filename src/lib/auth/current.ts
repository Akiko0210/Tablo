import "server-only";
import { cookies } from "next/headers";
import type { RestaurantRecord } from "@/lib/restaurants/store";
import { restaurantForUser } from "./directory";
import { SESSION_COOKIE, verifySession, type SessionPayload } from "./session";

/** Read + verify the session from the request cookies. Server-only. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

export interface StaffContext {
  session: SessionPayload;
  restaurant: RestaurantRecord;
}

/** Session + the restaurant it belongs to, or null if either is missing.
 * Every staff API route and dashboard page goes through this so all reads and
 * writes are tenant-scoped. */
export async function getStaffContext(): Promise<StaffContext | null> {
  const session = await getSession();
  if (!session) return null;
  const restaurant = restaurantForUser(session.userId);
  if (!restaurant) return null;
  return { session, restaurant };
}
