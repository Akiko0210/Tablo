import { NextResponse } from "next/server";
import { getKitchenRestaurant } from "@/lib/kitchen/session";
import { updateOrderStatus } from "@/lib/orders/store";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/orders/types";

// PATCH /api/kitchen/orders/[id] — kitchen device. Advance an order.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const restaurant = await getKitchenRestaurant();
  if (!restaurant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const status = (body as { status?: unknown })?.status;
  if (
    typeof status !== "string" ||
    !ORDER_STATUSES.includes(status as OrderStatus)
  ) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const order = updateOrderStatus(restaurant.id, id, status as OrderStatus);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  return NextResponse.json({ order });
}
