// In-memory store for accounts created through /signup. Separate from the
// seeded demo user in users.ts. Attached to globalThis so it survives dev
// HMR module reloads — same pattern as src/lib/orders/store.ts.

import crypto from "node:crypto";
import { createRestaurant, updateRestaurant } from "@/lib/restaurants/store";
import { hashPassword } from "./password";
import { initialsFrom } from "./initials";

export interface RestaurantProfile {
  cuisine?: string;
  tagline?: string;
  address?: string;
  phone?: string;
  tableCount?: number;
  description?: string;
}

export interface RestaurantAccount {
  id: string;
  name: string;
  initials: string;
  email: string;
  passwordHash: string;
  restaurantName: string;
  /** The restaurant this account owns (tenancy root). */
  restaurantId: string;
  role: string;
  profile: RestaurantProfile;
  onboardingComplete: boolean;
  createdAt: string;
}

export type SafeAccount = Omit<RestaurantAccount, "passwordHash">;

export function toSafeAccount(account: RestaurantAccount): SafeAccount {
  const { passwordHash: _hash, ...safe } = account;
  void _hash;
  return safe;
}

interface AccountStore {
  accounts: RestaurantAccount[];
}

const globalForAccounts = globalThis as unknown as {
  __tabloAccountStore?: AccountStore;
};

function getStore(): AccountStore {
  if (!globalForAccounts.__tabloAccountStore) {
    globalForAccounts.__tabloAccountStore = { accounts: [] };
  }
  return globalForAccounts.__tabloAccountStore;
}

export function findAccountByEmail(email: string): RestaurantAccount | undefined {
  const normalized = email.trim().toLowerCase();
  return getStore().accounts.find((a) => a.email === normalized);
}

export function findAccountById(id: string): RestaurantAccount | undefined {
  return getStore().accounts.find((a) => a.id === id);
}

export interface CreateAccountInput {
  name: string;
  email: string;
  password: string;
  restaurantName: string;
}

export async function createAccount(
  input: CreateAccountInput,
): Promise<RestaurantAccount> {
  const passwordHash = await hashPassword(input.password);
  const id = `acct_${crypto.randomUUID()}`;
  const restaurant = createRestaurant({
    name: input.restaurantName,
    ownerUserId: id,
  });
  const account: RestaurantAccount = {
    id,
    name: input.name.trim(),
    initials: initialsFrom(input.name),
    email: input.email.trim().toLowerCase(),
    passwordHash,
    restaurantName: restaurant.name,
    restaurantId: restaurant.id,
    role: "Owner",
    profile: {},
    onboardingComplete: false,
    createdAt: new Date().toISOString(),
  };
  getStore().accounts.push(account);
  return account;
}

/** Merges the given fields into the account's profile, mirrors them onto the
 * owned restaurant record, and marks onboarding done. */
export function updateAccountProfile(
  id: string,
  profile: RestaurantProfile,
): RestaurantAccount | undefined {
  const account = findAccountById(id);
  if (!account) return undefined;
  account.profile = { ...account.profile, ...profile };
  account.onboardingComplete = true;
  updateRestaurant(account.restaurantId, {
    tagline: profile.tagline,
    cuisine: profile.cuisine,
    tableCount: profile.tableCount,
    address: profile.address,
    phone: profile.phone,
    description: profile.description,
  });
  return account;
}
