import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/current";
import { createOrder, listOrders } from "@/lib/orders/store";
import { parseNewOrder } from "@/lib/orders/validate";

// GET /api/orders — staff only. Returns all orders, newest first.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ orders: listOrders() });
}

// POST /api/orders — public. Guests submit an order from their table.
export async function POST(request: Request) {
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

  const order = createOrder(input);
  return NextResponse.json({ order }, { status: 201 });
}
