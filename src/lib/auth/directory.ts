// Login/lookup for dashboard accounts. All accounts — including the seeded
// demo account (created by prisma/seed.ts) — live in the database with hashed
// passwords. Route handlers and the dashboard layout should use this module
// rather than accounts.ts directly.

import {
  findRestaurantByOwner,
  type RestaurantRecord,
} from "@/lib/restaurants/store";
import {
  findAccountByEmail,
  findAccountById,
  type RestaurantAccount,
} from "./accounts";
import { verifyPassword } from "./password";

export interface DirectoryUser {
  id: string;
  name: string;
  initials: string;
  email: string;
  restaurantName: string;
  role: string;
  emailVerified: boolean;
}

function fromAccount(a: RestaurantAccount): DirectoryUser {
  const { id, name, initials, email, restaurantName, role, emailVerified } = a;
  return { id, name, initials, email, restaurantName, role, emailVerified };
}

export async function verifyCredentialsAny(
  email: string,
  password: string,
): Promise<DirectoryUser | null> {
  const account = await findAccountByEmail(email);
  if (!account) return null;
  const ok = await verifyPassword(password, account.passwordHash);
  return ok ? fromAccount(account) : null;
}

export async function findUserByIdAny(id: string): Promise<DirectoryUser | null> {
  const account = await findAccountById(id);
  return account ? fromAccount(account) : null;
}

/** The restaurant owned by a session's user. */
export async function restaurantForUser(
  userId: string,
): Promise<RestaurantRecord | null> {
  return (await findRestaurantByOwner(userId)) ?? null;
}

export async function emailTakenAny(email: string): Promise<boolean> {
  return !!(await findAccountByEmail(email));
}
