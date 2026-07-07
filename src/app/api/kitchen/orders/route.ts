import { NextResponse } from "next/server";
import { getKitchenRestaurant } from "@/lib/kitchen/session";
import { listOrders } from "@/lib/orders/store";

// GET /api/kitchen/orders — kitchen device. The restaurant's live orders.
export async function GET() {
  const restaurant = await getKitchenRestaurant();
  if (!restaurant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ orders: await listOrders(restaurant.id) });
}
