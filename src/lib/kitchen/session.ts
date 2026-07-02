// Kitchen-app auth: a restaurant-scoped session established with the kitchen
// access code (shown in the dashboard), separate from the staff login. It
// authorizes the shared kitchen device to read/advance orders and to submit
// clock in/out actions (which are additionally guarded by each worker's PIN).

import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import {
  findRestaurantById,
  type RestaurantRecord,
} from "@/lib/restaurants/store";

export const KITCHEN_COOKIE = "tablo_kitchen";
const MAX_AGE_SECONDS = 60 * 60 * 16; // one long shift

function secretKey(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ?? "tablo-dev-secret-change-me-in-production";
  return new TextEncoder().encode(`kitchen:${secret}`);
}

export async function signKitchenSession(restaurantId: string): Promise<string> {
  return new SignJWT({ restaurantId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function verifyKitchenSession(
  token: string | undefined,
): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return typeof payload.restaurantId === "string" ? payload.restaurantId : null;
  } catch {
    return null;
  }
}

/** The restaurant the kitchen device is signed into, or null. */
export async function getKitchenRestaurant(): Promise<RestaurantRecord | null> {
  const store = await cookies();
  const restaurantId = await verifyKitchenSession(
    store.get(KITCHEN_COOKIE)?.value,
  );
  if (!restaurantId) return null;
  return findRestaurantById(restaurantId) ?? null;
}

export const kitchenCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_SECONDS,
  secure: process.env.NODE_ENV === "production",
};
