import { NextResponse } from "next/server";
import { getStaffContext } from "@/lib/auth/current";
import { updateRestaurant } from "@/lib/restaurants/store";
import { parseRestaurantPatch } from "@/lib/restaurants/validate";

// PATCH /api/restaurant — staff only. Edit the signed-in restaurant's info
// (the details collected during onboarding, editable any time in Settings).
export async function PATCH(request: Request) {
  const ctx = await getStaffContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseRestaurantPatch(body);
  if (parsed.error || !parsed.data) {
    return NextResponse.json(
      { error: parsed.error ?? "Invalid settings" },
      { status: 400 },
    );
  }

  const restaurant = await updateRestaurant(ctx.restaurant.id, parsed.data);
  return NextResponse.json({ restaurant });
}
