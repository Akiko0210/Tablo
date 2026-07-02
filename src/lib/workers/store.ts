// Worker registry + time clock, scoped per restaurant. Managers maintain
// profiles in the dashboard; workers clock in/out from the kitchen app with
// their 4-digit PIN. Same globalThis/HMR pattern as the other stores.

import crypto from "node:crypto";
import { DEMO_RESTAURANT_ID } from "@/lib/restaurants/store";
import { minutesToday } from "./time";

export interface Worker {
  id: string;
  restaurantId: string;
  name: string;
  role: string;
  phone?: string;
  email?: string;
  /** 4-digit clock-in PIN. Plaintext is fine for a demo time clock. */
  pin: string;
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  restaurantId: string;
  workerId: string;
  clockIn: string;
  clockOut?: string;
}

interface WorkerStore {
  workers: Worker[];
  entries: TimeEntry[];
}

const globalForWorkers = globalThis as unknown as {
  __tabloWorkerStore?: WorkerStore;
};

function seed(): WorkerStore {
  const now = Date.now();
  const iso = (msAgo: number) => new Date(now - msAgo).toISOString();
  const workers: Worker[] = [
    {
      id: "w_marco",
      restaurantId: DEMO_RESTAURANT_ID,
      name: "Marco Rinaldi",
      role: "Head chef",
      phone: "(555) 010-2233",
      email: "marco@bella.com",
      pin: "1111",
      createdAt: new Date(0).toISOString(),
    },
    {
      id: "w_elena",
      restaurantId: DEMO_RESTAURANT_ID,
      name: "Elena Moretti",
      role: "Server",
      phone: "(555) 010-4455",
      email: "elena@bella.com",
      pin: "2222",
      createdAt: new Date(0).toISOString(),
    },
    {
      id: "w_luca",
      restaurantId: DEMO_RESTAURANT_ID,
      name: "Luca Bianchi",
      role: "Line cook",
      phone: "(555) 010-6677",
      pin: "3333",
      createdAt: new Date(0).toISOString(),
    },
  ];
  const entries: TimeEntry[] = [
    // Marco and Elena are on shift right now; Luca worked yesterday.
    {
      id: "te_1",
      restaurantId: DEMO_RESTAURANT_ID,
      workerId: "w_marco",
      clockIn: iso(2.2 * 60 * 60_000),
    },
    {
      id: "te_2",
      restaurantId: DEMO_RESTAURANT_ID,
      workerId: "w_elena",
      clockIn: iso(48 * 60_000),
    },
    {
      id: "te_3",
      restaurantId: DEMO_RESTAURANT_ID,
      workerId: "w_luca",
      clockIn: iso(30 * 60 * 60_000),
      clockOut: iso(24 * 60 * 60_000),
    },
  ];
  return { workers, entries };
}

function getStore(): WorkerStore {
  if (!globalForWorkers.__tabloWorkerStore) {
    globalForWorkers.__tabloWorkerStore = seed();
  }
  return globalForWorkers.__tabloWorkerStore;
}

export function listWorkers(restaurantId: string): Worker[] {
  return getStore().workers.filter((w) => w.restaurantId === restaurantId);
}

export function findWorker(
  restaurantId: string,
  workerId: string,
): Worker | undefined {
  return getStore().workers.find(
    (w) => w.restaurantId === restaurantId && w.id === workerId,
  );
}

export interface WorkerInput {
  name: string;
  role: string;
  phone?: string;
  email?: string;
  pin: string;
}

export function createWorker(restaurantId: string, input: WorkerInput): Worker {
  const worker: Worker = {
    id: `w_${crypto.randomUUID().slice(0, 8)}`,
    restaurantId,
    name: input.name.trim(),
    role: input.role.trim(),
    phone: input.phone?.trim() || undefined,
    email: input.email?.trim() || undefined,
    pin: input.pin,
    createdAt: new Date().toISOString(),
  };
  getStore().workers.push(worker);
  return worker;
}

export function updateWorker(
  restaurantId: string,
  workerId: string,
  patch: Partial<WorkerInput>,
): Worker | undefined {
  const worker = findWorker(restaurantId, workerId);
  if (!worker) return undefined;
  if (patch.name?.trim()) worker.name = patch.name.trim();
  if (patch.role?.trim()) worker.role = patch.role.trim();
  if (patch.phone !== undefined) worker.phone = patch.phone.trim() || undefined;
  if (patch.email !== undefined) worker.email = patch.email.trim() || undefined;
  if (patch.pin) worker.pin = patch.pin;
  return worker;
}

/** Removes the worker; their past time entries are kept for the record but an
 * open shift is closed. */
export function deleteWorker(restaurantId: string, workerId: string): boolean {
  const store = getStore();
  const idx = store.workers.findIndex(
    (w) => w.restaurantId === restaurantId && w.id === workerId,
  );
  if (idx === -1) return false;
  const open = openEntry(restaurantId, workerId);
  if (open) open.clockOut = new Date().toISOString();
  store.workers.splice(idx, 1);
  return true;
}

export function openEntry(
  restaurantId: string,
  workerId: string,
): TimeEntry | undefined {
  return getStore().entries.find(
    (e) =>
      e.restaurantId === restaurantId && e.workerId === workerId && !e.clockOut,
  );
}

export function clockIn(
  restaurantId: string,
  workerId: string,
): TimeEntry | { error: string } {
  if (!findWorker(restaurantId, workerId)) return { error: "Unknown worker" };
  if (openEntry(restaurantId, workerId))
    return { error: "Already clocked in" };
  const entry: TimeEntry = {
    id: `te_${crypto.randomUUID().slice(0, 8)}`,
    restaurantId,
    workerId,
    clockIn: new Date().toISOString(),
  };
  getStore().entries.push(entry);
  return entry;
}

export function clockOut(
  restaurantId: string,
  workerId: string,
): TimeEntry | { error: string } {
  const open = openEntry(restaurantId, workerId);
  if (!open) return { error: "Not clocked in" };
  open.clockOut = new Date().toISOString();
  return open;
}

export function verifyWorkerPin(
  restaurantId: string,
  workerId: string,
  pin: string,
): boolean {
  const worker = findWorker(restaurantId, workerId);
  return !!worker && worker.pin === pin;
}

/** Presence + hours summary the dashboard and kitchen app both render.
 * PIN intentionally excluded — callers that need it (manager UI) fetch the
 * worker records separately. */
export interface WorkerPresence {
  id: string;
  name: string;
  role: string;
  phone?: string;
  email?: string;
  clockedIn: boolean;
  /** ISO of the open shift's start, when clocked in. */
  since?: string;
  minutesToday: number;
}

export function workerPresenceList(
  restaurantId: string,
  now = new Date(),
): WorkerPresence[] {
  const entries = getStore().entries.filter(
    (e) => e.restaurantId === restaurantId,
  );
  return listWorkers(restaurantId).map((worker) => {
    const own = entries.filter((e) => e.workerId === worker.id);
    const open = own.find((e) => !e.clockOut);
    return {
      id: worker.id,
      name: worker.name,
      role: worker.role,
      phone: worker.phone,
      email: worker.email,
      clockedIn: !!open,
      since: open?.clockIn,
      minutesToday: minutesToday(own, now),
    };
  });
}
