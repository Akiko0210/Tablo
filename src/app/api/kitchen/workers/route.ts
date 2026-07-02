import { NextResponse } from "next/server";
import { getKitchenRestaurant } from "@/lib/kitchen/session";
import { workerPresenceList } from "@/lib/workers/store";

// GET /api/kitchen/workers — kitchen device. Presence list for the clock
// screen. PINs are never included here; each clock action re-checks the PIN.
export async function GET() {
  const restaurant = await getKitchenRestaurant();
  if (!restaurant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ workers: workerPresenceList(restaurant.id) });
}
