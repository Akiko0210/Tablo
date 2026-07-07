import { NextResponse } from "next/server";
import { getStaffContext } from "@/lib/auth/current";
import { findRestaurantBySlug } from "@/lib/restaurants/store";
import { createOrder, listOrders } from "@/lib/orders/store";
import { parseNewOrder } from "@/lib/orders/validate";
import { priceOrder } from "@/lib/orders/price";
import { listMenuItems } from "@/lib/menu/store";
import { clientIp, limit } from "@/lib/rate-limit";

// GET /api/orders — staff only. Returns the signed-in restaurant's orders,
// newest first.
export async function GET() {
  const ctx = await getStaffContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ orders: await listOrders(ctx.restaurant.id) });
}

// POST /api/orders?restaurant=<slug> — public. Guests submit an order from
// their table; the restaurant comes from the query param the menu page set.
export async function POST(request: Request) {
  const slug = new URL(request.url).searchParams.get("restaurant") ?? "";
  const restaurant = await findRestaurantBySlug(slug);
  if (!restaurant) {
    return NextResponse.json({ error: "Unknown restaurant" }, { status: 404 });
  }

  // Public endpoint — cap per-guest volume without getting in the way of a
  // real table ordering rounds.
  const rate = await limit(
    `order:${restaurant.id}:${clientIp(request)}`,
    20,
    60_000,
  );
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many orders — give it a minute and try again." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderRequest = parseNewOrder(body);
  if (!orderRequest) {
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  }

  // Validate selections against the live menu and recompute every price —
  // the client payload carries item + option ids only, never prices.
  const priced = priceOrder(await listMenuItems(restaurant.id), orderRequest);
  if (!priced.data) {
    return NextResponse.json(
      { error: priced.error ?? "Invalid order" },
      { status: 400 },
    );
  }

  const order = await createOrder(restaurant.id, priced.data);
  return NextResponse.json({ order }, { status: 201 });
}
