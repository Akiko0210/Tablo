import { NextResponse } from "next/server";
import { getStaffContext } from "@/lib/auth/current";
import { createWorker, workerPresenceList } from "@/lib/workers/store";
import { parseWorkerInput } from "@/lib/workers/validate";

// GET /api/workers — staff only. Worker profiles + live presence. PINs are
// never returned: they're hashed at rest and known only to whoever set them
// (the manager types the PIN when creating/editing the worker).
export async function GET() {
  const ctx = await getStaffContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    workers: await workerPresenceList(ctx.restaurant.id),
  });
}

// POST /api/workers — staff only. Add a worker profile.
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

  const parsed = parseWorkerInput(body);
  if (parsed.error || !parsed.data) {
    return NextResponse.json(
      { error: parsed.error ?? "Invalid worker" },
      { status: 400 },
    );
  }

  const worker = await createWorker(ctx.restaurant.id, parsed.data);
  if ("error" in worker) {
    return NextResponse.json({ error: worker.error }, { status: 409 });
  }
  return NextResponse.json({ worker }, { status: 201 });
}
