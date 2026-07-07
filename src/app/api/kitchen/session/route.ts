import { NextResponse } from "next/server";
import { findRestaurantByKitchenCode } from "@/lib/restaurants/store";
import { clientIp, limit } from "@/lib/rate-limit";
import {
  KITCHEN_COOKIE,
  getKitchenRestaurant,
  kitchenCookieOptions,
  signKitchenSession,
} from "@/lib/kitchen/session";

// GET /api/kitchen/session — which restaurant this kitchen device is signed
// into (the kitchen page checks on load).
export async function GET() {
  const restaurant = await getKitchenRestaurant();
  if (!restaurant) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  return NextResponse.json({
    restaurant: { id: restaurant.id, name: restaurant.name },
  });
}

// POST /api/kitchen/session — sign the device in with the kitchen code.
// Rate-limited per IP so codes can't be guessed by enumeration.
export async function POST(request: Request) {
  const rate = await limit(`kitchen-session:${clientIp(request)}`, 10, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many attempts — wait a minute and try again." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const code = (body as { code?: unknown })?.code;
  if (typeof code !== "string" || !code.trim()) {
    return NextResponse.json({ error: "Enter the kitchen code" }, { status: 400 });
  }

  const restaurant = await findRestaurantByKitchenCode(code);
  if (!restaurant) {
    return NextResponse.json(
      { error: "That code doesn't match any restaurant" },
      { status: 401 },
    );
  }

  const token = await signKitchenSession(restaurant.id);
  const res = NextResponse.json({
    restaurant: { id: restaurant.id, name: restaurant.name },
  });
  res.cookies.set(KITCHEN_COOKIE, token, kitchenCookieOptions);
  return res;
}

// DELETE /api/kitchen/session — sign the device out.
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(KITCHEN_COOKIE, "", { ...kitchenCookieOptions, maxAge: 0 });
  return res;
}
