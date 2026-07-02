// Unified login/lookup across the two account sources:
//  - STAFF_USERS: the seeded demo account (plaintext password, mock login).
//  - accounts.ts: real accounts created through /signup (hashed password).
//
// Route handlers and the dashboard layout should use this module rather than
// users.ts or accounts.ts directly, so both kinds of account "just work".

import {
  findRestaurantByOwner,
  type RestaurantRecord,
} from "@/lib/restaurants/store";
import { STAFF_USERS, type StaffUser } from "./users";
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
}

function fromStaff(u: StaffUser): DirectoryUser {
  const { password: _pw, ...safe } = u;
  void _pw;
  return safe;
}

function fromAccount(a: RestaurantAccount): DirectoryUser {
  const { id, name, initials, email, restaurantName, role } = a;
  return { id, name, initials, email, restaurantName, role };
}

export async function verifyCredentialsAny(
  email: string,
  password: string,
): Promise<DirectoryUser | null> {
  const normalized = email.trim().toLowerCase();

  const staff = STAFF_USERS.find((u) => u.email.toLowerCase() === normalized);
  if (staff) return staff.password === password ? fromStaff(staff) : null;

  const account = findAccountByEmail(normalized);
  if (!account) return null;
  const ok = await verifyPassword(password, account.passwordHash);
  return ok ? fromAccount(account) : null;
}

export function findUserByIdAny(id: string): DirectoryUser | null {
  const staff = STAFF_USERS.find((u) => u.id === id);
  if (staff) return fromStaff(staff);
  const account = findAccountById(id);
  return account ? fromAccount(account) : null;
}

/** The restaurant owned by a session's user — works for the seeded demo user
 * (who owns the demo restaurant) and for signed-up accounts alike. */
export function restaurantForUser(userId: string): RestaurantRecord | null {
  return findRestaurantByOwner(userId) ?? null;
}

export function emailTakenAny(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (STAFF_USERS.some((u) => u.email.toLowerCase() === normalized)) return true;
  return !!findAccountByEmail(normalized);
}
