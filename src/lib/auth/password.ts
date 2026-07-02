// Password hashing for accounts created via /signup. Uses Node's built-in
// scrypt (no extra dependency) with a random salt per password, stored as
// "<saltHex>:<hashHex>". The seeded demo account in users.ts stays plaintext
// (it's a mock login, documented as such) — this is for real signups.

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  const storedBuf = Buffer.from(hashHex, "hex");
  if (storedBuf.length !== derived.length) return false;
  return timingSafeEqual(derived, storedBuf);
}
