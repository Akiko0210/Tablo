import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { consumeVerificationToken } from "@/lib/auth/tokens";
import { revokeAllSessions } from "@/lib/auth/session";
import { clientIp, limit } from "@/lib/rate-limit";

// POST /api/auth/reset-password — redeem a reset token and set a new
// password. Single-use, 1h expiry; every existing session is revoked so a
// stolen cookie dies with the old password.
export async function POST(request: Request) {
  const rate = await limit(`reset-password:${clientIp(request)}`, 5, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many attempts — wait a minute and try again." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { token, password } = (body ?? {}) as {
    token?: unknown;
    password?: unknown;
  };
  if (typeof token !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  const accountId = await consumeVerificationToken(token, "password_reset");
  if (!accountId) {
    return NextResponse.json(
      { error: "This link is invalid or has expired — request a new one." },
      { status: 400 },
    );
  }

  await prisma.account.update({
    where: { id: accountId },
    data: { passwordHash: await hashPassword(password) },
  });
  await revokeAllSessions(accountId);

  return NextResponse.json({ ok: true });
}
