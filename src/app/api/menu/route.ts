import { NextResponse } from "next/server";
import { getStaffContext } from "@/lib/auth/current";
import {
  addMenuItem,
  categoriesFor,
  listMenuItems,
} from "@/lib/menu/store";
import { parseMenuItemInput } from "@/lib/menu/validate";
import { getGenerationJob } from "@/lib/menu/generation-store";

// GET /api/menu — staff only. The restaurant's menu items + AI job status.
export async function GET() {
  const ctx = await getStaffContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    items: listMenuItems(ctx.restaurant.id),
    categories: categoriesFor(ctx.restaurant.id),
    generation: getGenerationJob(ctx.restaurant.id),
  });
}

// POST /api/menu — staff only. Add a menu item by hand.
export async function POST(request: Request) {
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

  const parsed = parseMenuItemInput(body);
  if (parsed.error || !parsed.data) {
    return NextResponse.json(
      { error: parsed.error ?? "Invalid item" },
      { status: 400 },
    );
  }

  const item = addMenuItem(ctx.restaurant.id, parsed.data, "manual");
  return NextResponse.json({ item }, { status: 201 });
}
