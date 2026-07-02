import { NextResponse } from "next/server";
import { getStaffContext } from "@/lib/auth/current";
import {
  createWorker,
  listWorkers,
  workerPresenceList,
} from "@/lib/workers/store";
import { parseWorkerInput } from "@/lib/workers/validate";

// GET /api/workers — staff only. Worker profiles + live presence. The manager
// view includes each worker's PIN so they can hand it out.
export async function GET() {
  const ctx = await getStaffContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const pins = new Map(listWorkers(ctx.restaurant.id).map((w) => [w.id, w.pin]));
  const workers = workerPresenceList(ctx.restaurant.id).map((p) => ({
    ...p,
    pin: pins.get(p.id),
  }));
  return NextResponse.json({ workers });
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

  const worker = createWorker(ctx.restaurant.id, parsed.data);
  return NextResponse.json({ worker }, { status: 201 });
}
