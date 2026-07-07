// DB-backed sessions. A successful login mints an opaque random token stored
// in an httpOnly cookie; only its SHA-256 hash lands in the database, so a DB
// leak doesn't leak usable tokens. Sessions are revocable (password reset
// kills every device) and expiry slides on active use.

import "server-only";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE = "tablo_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
/** Extend the session when less than half its lifetime remains. */
const SLIDE_THRESHOLD_MS = (MAX_AGE_SECONDS * 1000) / 2;

// The kitchen device session still signs a JWT with AUTH_SECRET — a missing
// secret in production must fail loudly at boot, not fall back to a public
// default. (Checked here too so both auth modules enforce it.) The
// `next build` page-data pass also runs with NODE_ENV=production and is
// exempt so CI can compile without secrets; the running server still refuses
// to boot.
if (
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build" &&
  !process.env.AUTH_SECRET
) {
  throw new Error(
    "AUTH_SECRET must be set in production — refusing to start with the dev fallback secret.",
  );
}

export interface SessionPayload {
  userId: string;
  name: string;
  email: string;
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Create a session row and return the raw cookie token. */
export async function signSession(payload: SessionPayload): Promise<string> {
  const token = crypto.randomBytes(32).toString("base64url");
  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      accountId: payload.userId,
      expiresAt: new Date(Date.now() + MAX_AGE_SECONDS * 1000),
    },
  });
  return token;
}

/** Resolve a cookie token to the live account, or null when the session is
 * missing, expired, or revoked. Name/email come from the account row so they
 * are always current. */
export async function verifySession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { account: { select: { id: true, name: true, email: true } } },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date()) {
    return null;
  }
  if (session.expiresAt.getTime() - Date.now() < SLIDE_THRESHOLD_MS) {
    await prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() + MAX_AGE_SECONDS * 1000) },
    });
  }
  return {
    userId: session.account.id,
    name: session.account.name,
    email: session.account.email,
  };
}

/** Revoke one session (logout on this device). */
export async function revokeSession(token: string | undefined): Promise<void> {
  if (!token) return;
  await prisma.session.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Revoke every session for an account — password reset, "log out everywhere". */
export async function revokeAllSessions(accountId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { accountId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_SECONDS,
  secure: process.env.NODE_ENV === "production",
};
