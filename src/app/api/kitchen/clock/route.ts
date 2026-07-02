import { NextResponse } from "next/server";
import { getKitchenRestaurant } from "@/lib/kitchen/session";
import { clockIn, clockOut, verifyWorkerPin } from "@/lib/workers/store";

// POST /api/kitchen/clock — kitchen device. Clock a worker in or out.
// Body: { workerId, pin, action: "in" | "out" }. The PIN is the worker-level
// auth on top of the device-level kitchen session.
export async function POST(request: Request) {
  const restaurant = await getKitchenRestaurant();
  if (!restaurant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { workerId, pin, action } = (body ?? {}) as {
    workerId?: unknown;
    pin?: unknown;
    action?: unknown;
  };
  if (
    typeof workerId !== "string" ||
    typeof pin !== "string" ||
    (action !== "in" && action !== "out")
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!verifyWorkerPin(restaurant.id, workerId, pin)) {
    return NextResponse.json({ error: "Wrong PIN" }, { status: 403 });
  }

  const result =
    action === "in"
      ? clockIn(restaurant.id, workerId)
      : clockOut(restaurant.id, workerId);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  return NextResponse.json({ entry: result });
}
