import { NextResponse } from "next/server";
import { getStaffContext } from "@/lib/auth/current";
import { deleteWorker, updateWorker } from "@/lib/workers/store";
import { parseWorkerPatch } from "@/lib/workers/validate";

// PATCH /api/workers/[id] — staff only. Edit a worker profile.
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

  const parsed = parseWorkerPatch(body);
  if (parsed.error || !parsed.data) {
    return NextResponse.json(
      { error: parsed.error ?? "Invalid patch" },
      { status: 400 },
    );
  }

  const worker = updateWorker(ctx.restaurant.id, id, parsed.data);
  if (!worker) {
    return NextResponse.json({ error: "Worker not found" }, { status: 404 });
  }
  return NextResponse.json({ worker });
}

// DELETE /api/workers/[id] — staff only. Remove a worker (their open shift,
// if any, is closed; history is kept).
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getStaffContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const ok = deleteWorker(ctx.restaurant.id, id);
  if (!ok) {
    return NextResponse.json({ error: "Worker not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
