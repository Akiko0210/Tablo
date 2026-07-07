import { NextResponse } from "next/server";
import { getStaffContext } from "@/lib/auth/current";
import { deleteMenuItem, updateMenuItem } from "@/lib/menu/store";
import { parseMenuItemPatch } from "@/lib/menu/validate";

// PATCH /api/menu/[id] — staff only. Edit a menu item (incl. AI-generated).
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

  const parsed = parseMenuItemPatch(body);
  if (parsed.error || !parsed.data) {
    return NextResponse.json(
      { error: parsed.error ?? "Invalid patch" },
      { status: 400 },
    );
  }

  const item = await updateMenuItem(ctx.restaurant.id, id, parsed.data);
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  return NextResponse.json({ item });
}

// DELETE /api/menu/[id] — staff only.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getStaffContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const ok = await deleteMenuItem(ctx.restaurant.id, id);
  if (!ok) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
