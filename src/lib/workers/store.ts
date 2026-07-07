// Worker registry + time clock, scoped per restaurant, backed by Postgres via
// Prisma. Managers maintain profiles in the dashboard; workers clock in/out
// from the kitchen app with their 4-digit PIN.

import crypto from "node:crypto";
import type {
  TimeEntry as TimeEntryRow,
  Worker as WorkerRow,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { minutesToday } from "./time";

export interface Worker {
  id: string;
  restaurantId: string;
  name: string;
  role: string;
  phone?: string;
  email?: string;
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  restaurantId: string;
  workerId: string;
  clockIn: string;
  clockOut?: string;
}

function toWorker(row: WorkerRow): Worker {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    name: row.name,
    role: row.role,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

function toEntry(row: TimeEntryRow): TimeEntry {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    // Null only for deleted workers' historical shifts, which presence never
    // queries — coalesce to keep the external shape.
    workerId: row.workerId ?? "",
    clockIn: row.clockIn.toISOString(),
    clockOut: row.clockOut?.toISOString(),
  };
}

export async function listWorkers(restaurantId: string): Promise<Worker[]> {
  const rows = await prisma.worker.findMany({
    where: { restaurantId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toWorker);
}

export async function findWorker(
  restaurantId: string,
  workerId: string,
): Promise<Worker | undefined> {
  const row = await prisma.worker.findFirst({
    where: { restaurantId, id: workerId },
  });
  return row ? toWorker(row) : undefined;
}

export interface WorkerInput {
  name: string;
  role: string;
  phone?: string;
  email?: string;
  pin: string;
}

/** PINs are unique per restaurant so the kitchen app can resolve a worker
 * from the PIN alone. Salted hashes can't be unique-indexed, so the check
 * verifies the candidate against every existing hash. */
async function pinTaken(
  restaurantId: string,
  pin: string,
  excludeWorkerId?: string,
): Promise<boolean> {
  const rows = await prisma.worker.findMany({
    where: { restaurantId, ...(excludeWorkerId ? { id: { not: excludeWorkerId } } : {}) },
    select: { pinHash: true },
  });
  for (const row of rows) {
    if (await verifyPassword(pin, row.pinHash)) return true;
  }
  return false;
}

export type WorkerResult = Worker | { error: string };

export async function createWorker(
  restaurantId: string,
  input: WorkerInput,
): Promise<WorkerResult> {
  if (await pinTaken(restaurantId, input.pin)) {
    return { error: "That PIN is already in use — pick a different one." };
  }
  const row = await prisma.worker.create({
    data: {
      id: `w_${crypto.randomUUID().slice(0, 8)}`,
      restaurantId,
      name: input.name.trim(),
      role: input.role.trim(),
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      pinHash: await hashPassword(input.pin),
    },
  });
  return toWorker(row);
}

export async function updateWorker(
  restaurantId: string,
  workerId: string,
  patch: Partial<WorkerInput>,
): Promise<WorkerResult | undefined> {
  const worker = await findWorker(restaurantId, workerId);
  if (!worker) return undefined;
  const data: Record<string, unknown> = {};
  if (patch.name?.trim()) data.name = patch.name.trim();
  if (patch.role?.trim()) data.role = patch.role.trim();
  if (patch.phone !== undefined) data.phone = patch.phone.trim() || null;
  if (patch.email !== undefined) data.email = patch.email.trim() || null;
  if (patch.pin) {
    if (await pinTaken(restaurantId, patch.pin, workerId)) {
      return { error: "That PIN is already in use — pick a different one." };
    }
    data.pinHash = await hashPassword(patch.pin);
  }
  const row = await prisma.worker.update({ where: { id: workerId }, data });
  return toWorker(row);
}

/** Removes the worker; their past time entries are kept for the record but an
 * open shift is closed. */
export async function deleteWorker(
  restaurantId: string,
  workerId: string,
): Promise<boolean> {
  const worker = await findWorker(restaurantId, workerId);
  if (!worker) return false;
  await prisma.timeEntry.updateMany({
    where: { restaurantId, workerId, clockOut: null },
    data: { clockOut: new Date() },
  });
  // Past entries stay on the books; the FK nulls their workerId.
  await prisma.worker.delete({ where: { id: workerId } });
  return true;
}

export async function openEntry(
  restaurantId: string,
  workerId: string,
): Promise<TimeEntry | undefined> {
  const row = await prisma.timeEntry.findFirst({
    where: { restaurantId, workerId, clockOut: null },
  });
  return row ? toEntry(row) : undefined;
}

export async function clockIn(
  restaurantId: string,
  workerId: string,
): Promise<TimeEntry | { error: string }> {
  if (!(await findWorker(restaurantId, workerId)))
    return { error: "Unknown worker" };
  if (await openEntry(restaurantId, workerId))
    return { error: "Already clocked in" };
  const row = await prisma.timeEntry.create({
    data: {
      id: `te_${crypto.randomUUID().slice(0, 8)}`,
      restaurantId,
      workerId,
      clockIn: new Date(),
    },
  });
  return toEntry(row);
}

export async function clockOut(
  restaurantId: string,
  workerId: string,
): Promise<TimeEntry | { error: string }> {
  const open = await prisma.timeEntry.findFirst({
    where: { restaurantId, workerId, clockOut: null },
  });
  if (!open) return { error: "Not clocked in" };
  const row = await prisma.timeEntry.update({
    where: { id: open.id },
    data: { clockOut: new Date() },
  });
  return toEntry(row);
}

/** Resolve which worker a PIN belongs to — the kitchen check-in never sees a
 * roster, so the PIN alone identifies the worker. scrypt per worker keeps
 * brute force expensive; the clock route also rate-limits attempts. */
export async function findWorkerByPin(
  restaurantId: string,
  pin: string,
): Promise<Worker | null> {
  const rows = await prisma.worker.findMany({ where: { restaurantId } });
  for (const row of rows) {
    if (await verifyPassword(pin, row.pinHash)) return toWorker(row);
  }
  return null;
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

export async function workerPresenceList(
  restaurantId: string,
  now = new Date(),
): Promise<WorkerPresence[]> {
  const [workers, entryRows] = await Promise.all([
    listWorkers(restaurantId),
    prisma.timeEntry.findMany({
      where: { restaurantId, NOT: { workerId: null } },
    }),
  ]);
  const entries = entryRows.map(toEntry);
  return workers.map((worker) => {
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
