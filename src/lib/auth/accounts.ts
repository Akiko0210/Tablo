// Restaurant owner accounts, backed by Postgres via Prisma. The onboarding
// profile lives as flattened columns on Account and is mirrored onto the owned
// restaurant record when saved.

import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
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
  emailVerified: boolean;
  createdAt: string;
}

export type SafeAccount = Omit<RestaurantAccount, "passwordHash">;

export function toSafeAccount(account: RestaurantAccount): SafeAccount {
  const { passwordHash: _hash, ...safe } = account;
  void _hash;
  return safe;
}

type AccountWithRestaurant = Prisma.AccountGetPayload<{
  include: { restaurant: { select: { id: true; name: true } } };
}>;

const accountInclude = {
  restaurant: { select: { id: true as const, name: true as const } },
};

function toAccount(row: AccountWithRestaurant): RestaurantAccount {
  return {
    id: row.id,
    name: row.name,
    initials: row.initials,
    email: row.email,
    passwordHash: row.passwordHash,
    restaurantName: row.restaurant?.name ?? "",
    restaurantId: row.restaurant?.id ?? "",
    role: row.role,
    profile: {
      cuisine: row.cuisine ?? undefined,
      tagline: row.tagline ?? undefined,
      address: row.address ?? undefined,
      phone: row.phone ?? undefined,
      tableCount: row.tableCount ?? undefined,
      description: row.description ?? undefined,
    },
    onboardingComplete: row.onboardingComplete,
    emailVerified: row.emailVerifiedAt !== null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function findAccountByEmail(
  email: string,
): Promise<RestaurantAccount | undefined> {
  const normalized = email.trim().toLowerCase();
  const row = await prisma.account.findUnique({
    where: { email: normalized },
    include: accountInclude,
  });
  return row ? toAccount(row) : undefined;
}

export async function findAccountById(
  id: string,
): Promise<RestaurantAccount | undefined> {
  const row = await prisma.account.findUnique({
    where: { id },
    include: accountInclude,
  });
  return row ? toAccount(row) : undefined;
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
  await prisma.account.create({
    data: {
      id,
      name: input.name.trim(),
      initials: initialsFrom(input.name),
      email: input.email.trim().toLowerCase(),
      passwordHash,
      role: "Owner",
    },
  });
  await createRestaurant({ name: input.restaurantName, ownerUserId: id });
  const account = await findAccountById(id);
  if (!account) throw new Error("Account creation failed");
  return account;
}

/** Merges the given fields into the account's profile, mirrors them onto the
 * owned restaurant record, and marks onboarding done. */
export async function updateAccountProfile(
  id: string,
  profile: RestaurantProfile,
): Promise<RestaurantAccount | undefined> {
  const account = await findAccountById(id);
  if (!account) return undefined;
  const data: Record<string, unknown> = { onboardingComplete: true };
  if (profile.cuisine !== undefined) data.cuisine = profile.cuisine || null;
  if (profile.tagline !== undefined) data.tagline = profile.tagline || null;
  if (profile.address !== undefined) data.address = profile.address || null;
  if (profile.phone !== undefined) data.phone = profile.phone || null;
  if (profile.tableCount !== undefined) data.tableCount = profile.tableCount;
  if (profile.description !== undefined)
    data.description = profile.description || null;
  await prisma.account.update({ where: { id }, data });
  await updateRestaurant(account.restaurantId, {
    tagline: profile.tagline,
    cuisine: profile.cuisine,
    tableCount: profile.tableCount,
    address: profile.address,
    phone: profile.phone,
    description: profile.description,
  });
  return findAccountById(id);
}
