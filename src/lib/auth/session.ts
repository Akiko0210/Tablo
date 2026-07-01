// Signed-session helpers. A successful login mints a short JWT stored in an
// httpOnly cookie; server components and route handlers verify it.
//
// jose works in both the Node and Edge runtimes, so this file is safe to use
// from server components, route handlers, and (if added later) middleware.

import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "tablo_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  userId: string;
  name: string;
  email: string;
}

function secretKey(): Uint8Array {
  // A real deployment sets AUTH_SECRET; the fallback keeps local dev zero-setup.
  const secret =
    process.env.AUTH_SECRET ?? "tablo-dev-secret-change-me-in-production";
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (
      typeof payload.userId === "string" &&
      typeof payload.name === "string" &&
      typeof payload.email === "string"
    ) {
      return {
        userId: payload.userId,
        name: payload.name,
        email: payload.email,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_SECONDS,
  secure: process.env.NODE_ENV === "production",
};
