// Defensive parsing of untrusted worker payloads. Pure — unit tested.

import type { WorkerInput } from "./store";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PIN_RE = /^\d{4}$/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

interface ParseResult<T> {
  data?: T;
  error?: string;
}

export function parseWorkerInput(body: unknown): ParseResult<WorkerInput> {
  if (!isRecord(body)) return { error: "Invalid request" };
  const { name, role, phone, email, pin } = body;

  if (typeof name !== "string" || !name.trim())
    return { error: "Name is required" };
  if (name.trim().length > 80) return { error: "Name is too long" };

  if (typeof role !== "string" || !role.trim())
    return { error: "Role is required" };
  if (role.trim().length > 60) return { error: "Role is too long" };

  if (phone !== undefined && phone !== "" && phone !== null) {
    if (typeof phone !== "string" || phone.trim().length > 40)
      return { error: "Invalid phone" };
  }
  if (email !== undefined && email !== "" && email !== null) {
    if (typeof email !== "string" || !EMAIL_RE.test(email.trim()))
      return { error: "Invalid email" };
  }

  if (typeof pin !== "string" || !PIN_RE.test(pin))
    return { error: "PIN must be exactly 4 digits" };

  return {
    data: {
      name: name.trim(),
      role: role.trim(),
      phone: typeof phone === "string" && phone.trim() ? phone.trim() : undefined,
      email: typeof email === "string" && email.trim() ? email.trim() : undefined,
      pin,
    },
  };
}

/** PATCH variant — all fields optional, same rules. */
export function parseWorkerPatch(
  body: unknown,
): ParseResult<Partial<WorkerInput>> {
  if (!isRecord(body)) return { error: "Invalid request" };
  const patch: Partial<WorkerInput> = {};

  if (body.name !== undefined) {
    if (
      typeof body.name !== "string" ||
      !body.name.trim() ||
      body.name.length > 80
    )
      return { error: "Invalid name" };
    patch.name = body.name.trim();
  }
  if (body.role !== undefined) {
    if (
      typeof body.role !== "string" ||
      !body.role.trim() ||
      body.role.length > 60
    )
      return { error: "Invalid role" };
    patch.role = body.role.trim();
  }
  if (body.phone !== undefined) {
    if (typeof body.phone !== "string" || body.phone.length > 40)
      return { error: "Invalid phone" };
    patch.phone = body.phone;
  }
  if (body.email !== undefined) {
    if (typeof body.email !== "string") return { error: "Invalid email" };
    if (body.email.trim() && !EMAIL_RE.test(body.email.trim()))
      return { error: "Invalid email" };
    patch.email = body.email;
  }
  if (body.pin !== undefined) {
    if (typeof body.pin !== "string" || !PIN_RE.test(body.pin))
      return { error: "PIN must be exactly 4 digits" };
    patch.pin = body.pin;
  }

  if (Object.keys(patch).length === 0) return { error: "Nothing to update" };
  return { data: patch };
}
