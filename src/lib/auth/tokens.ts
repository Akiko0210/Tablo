// Single-use verification tokens (email verify + password reset). The raw
// token only ever lives in the emailed link; the database stores its SHA-256
// hash. Consuming a token marks it used atomically so a link can't be
// replayed.

import "server-only";
import crypto from "node:crypto";
import type { TokenKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashToken } from "./session";

const TTL_MS: Record<TokenKind, number> = {
  email_verify: 24 * 60 * 60 * 1000, // 24h
  password_reset: 60 * 60 * 1000, // 1h
};

/** Mint a token for the account; returns the raw value for the email link.
 * Older unused tokens of the same kind are invalidated. */
export async function createVerificationToken(
  accountId: string,
  kind: TokenKind,
): Promise<string> {
  await prisma.verificationToken.updateMany({
    where: { accountId, kind, usedAt: null },
    data: { usedAt: new Date() },
  });
  const token = crypto.randomBytes(32).toString("base64url");
  await prisma.verificationToken.create({
    data: {
      tokenHash: hashToken(token),
      accountId,
      kind,
      expiresAt: new Date(Date.now() + TTL_MS[kind]),
    },
  });
  return token;
}

/** Redeem a raw token. Returns the accountId once; null when unknown,
 * expired, wrong kind, or already used. */
export async function consumeVerificationToken(
  token: string,
  kind: TokenKind,
): Promise<string | null> {
  // updateMany's usedAt guard makes redemption atomic — two concurrent
  // requests can't both succeed.
  const { count } = await prisma.verificationToken.updateMany({
    where: {
      tokenHash: hashToken(token),
      kind,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { usedAt: new Date() },
  });
  if (count === 0) return null;
  const row = await prisma.verificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { accountId: true },
  });
  return row?.accountId ?? null;
}
