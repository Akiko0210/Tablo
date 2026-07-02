import { NextResponse } from "next/server";
import { getStaffContext } from "@/lib/auth/current";
import { updateOrderStatus } from "@/lib/orders/store";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/orders/types";

// PATCH /api/orders/[id] — staff only. Advance an order's status. Scoped to
// the signed-in restaurant, so one tenant can't touch another's orders.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getStaffContext();
  if (!ctx) {
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

  const order = updateOrderStatus(ctx.restaurant.id, id, status as OrderStatus);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  return NextResponse.json({ order });
}
