import { NextResponse } from "next/server";
import { getStaffContext } from "@/lib/auth/current";
import { findRestaurantBySlug } from "@/lib/restaurants/store";
import { createOrder, listOrders } from "@/lib/orders/store";
import { parseNewOrder } from "@/lib/orders/validate";

// GET /api/orders — staff only. Returns the signed-in restaurant's orders,
// newest first.
export async function GET() {
  const ctx = await getStaffContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ orders: listOrders(ctx.restaurant.id) });
}

// POST /api/orders?restaurant=<slug> — public. Guests submit an order from
// their table; the restaurant comes from the query param the menu page set.
export async function POST(request: Request) {
  const slug = new URL(request.url).searchParams.get("restaurant") ?? "";
  const restaurant = findRestaurantBySlug(slug);
  if (!restaurant) {
    return NextResponse.json({ error: "Unknown restaurant" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const input = parseNewOrder(body);
  if (!input) {
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  }

  const order = createOrder(restaurant.id, input);
  return NextResponse.json({ order }, { status: 201 });
}
