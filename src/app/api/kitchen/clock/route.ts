import { NextResponse } from "next/server";
import { getKitchenRestaurant } from "@/lib/kitchen/session";
import { clockIn, clockOut, findWorkerByPin, openEntry } from "@/lib/workers/store";
import { clientIp, limit } from "@/lib/rate-limit";

// POST /api/kitchen/clock — kitchen device. Clock a worker in or out with
// their PIN alone: the server resolves which worker it belongs to, so the
// device never sees a roster. Body: { pin, action?: "in" | "out" } — when
// action is omitted the shift toggles.
//
// Only 10^4 PINs exist, so attempts are rate-limited per device/IP on top of
// the scrypt-hashed comparison.
export async function POST(request: Request) {
  const restaurant = await getKitchenRestaurant();
  if (!restaurant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rate = await limit(
    `kitchen-clock:${restaurant.id}:${clientIp(request)}`,
    8,
    60_000,
  );
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many attempts — wait a minute and try again." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { pin, action } = (body ?? {}) as { pin?: unknown; action?: unknown };
  if (
    typeof pin !== "string" ||
    !/^\d{4}$/.test(pin) ||
    (action !== undefined && action !== "in" && action !== "out")
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const worker = await findWorkerByPin(restaurant.id, pin);
  if (!worker) {
    return NextResponse.json({ error: "Wrong PIN" }, { status: 403 });
  }

  const resolvedAction =
    action ?? ((await openEntry(restaurant.id, worker.id)) ? "out" : "in");
  const result =
    resolvedAction === "in"
      ? await clockIn(restaurant.id, worker.id)
      : await clockOut(restaurant.id, worker.id);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  // First name only — enough for the confirmation toast, no roster data.
  return NextResponse.json({
    entry: result,
    action: resolvedAction,
    worker: { firstName: worker.name.split(" ")[0] },
  });
}
