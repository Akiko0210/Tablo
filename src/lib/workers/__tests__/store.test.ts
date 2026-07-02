// @vitest-environment node
import { describe, it, expect } from "vitest";
import { DEMO_RESTAURANT_ID } from "@/lib/restaurants/demo";
import {
  clockIn,
  clockOut,
  createWorker,
  deleteWorker,
  listWorkers,
  openEntry,
  updateWorker,
  verifyWorkerPin,
  workerPresenceList,
} from "../store";

function freshRestaurantId() {
  return `rest-workers-${Date.now()}-${Math.random()}`;
}

const INPUT = {
  name: "Kai Tanaka",
  role: "Line cook",
  phone: "(555) 111-2222",
  email: "kai@luna.com",
  pin: "4321",
};

describe("worker store", () => {
  it("seeds demo workers with two on shift", () => {
    const presence = workerPresenceList(DEMO_RESTAURANT_ID);
    expect(presence.length).toBeGreaterThanOrEqual(3);
    expect(presence.filter((p) => p.clockedIn).length).toBeGreaterThanOrEqual(2);
    // Presence payload never carries PINs.
    expect(
      presence.every((p) => !("pin" in (p as unknown as Record<string, unknown>))),
    ).toBe(true);
  });

  it("creates, updates, and deletes workers scoped per restaurant", () => {
    const rest = freshRestaurantId();
    const worker = createWorker(rest, INPUT);
    expect(listWorkers(rest)).toHaveLength(1);
    expect(listWorkers(freshRestaurantId())).toHaveLength(0);

    const updated = updateWorker(rest, worker.id, { role: "Sous chef", pin: "9999" });
    expect(updated?.role).toBe("Sous chef");
    expect(verifyWorkerPin(rest, worker.id, "9999")).toBe(true);
    expect(verifyWorkerPin(rest, worker.id, "4321")).toBe(false);

    expect(deleteWorker(rest, worker.id)).toBe(true);
    expect(listWorkers(rest)).toHaveLength(0);
  });

  it("clocks in and out, rejecting double actions", () => {
    const rest = freshRestaurantId();
    const worker = createWorker(rest, INPUT);

    const entry = clockIn(rest, worker.id);
    expect("error" in entry).toBe(false);
    expect(openEntry(rest, worker.id)).toBeDefined();

    const again = clockIn(rest, worker.id);
    expect(again).toEqual({ error: "Already clocked in" });

    const out = clockOut(rest, worker.id);
    expect("error" in out).toBe(false);
    expect(openEntry(rest, worker.id)).toBeUndefined();

    expect(clockOut(rest, worker.id)).toEqual({ error: "Not clocked in" });
  });

  it("reports presence with minutes today", () => {
    const rest = freshRestaurantId();
    const worker = createWorker(rest, INPUT);
    clockIn(rest, worker.id);
    const [presence] = workerPresenceList(rest);
    expect(presence.clockedIn).toBe(true);
    expect(presence.since).toBeDefined();
    expect(presence.minutesToday).toBeGreaterThanOrEqual(0);
  });

  it("closes an open shift when a worker is deleted", () => {
    const rest = freshRestaurantId();
    const worker = createWorker(rest, INPUT);
    clockIn(rest, worker.id);
    deleteWorker(rest, worker.id);
    expect(openEntry(rest, worker.id)).toBeUndefined();
  });
});
