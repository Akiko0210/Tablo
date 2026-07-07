import { NextResponse } from "next/server";
import { verifyCredentialsAny } from "@/lib/auth/directory";
import {
  SESSION_COOKIE,
  signSession,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { clientIp, limit } from "@/lib/rate-limit";

// POST /api/auth/login — verify credentials and set the session cookie.
// Rate-limited per IP against credential stuffing.
export async function POST(request: Request) {
  const rate = await limit(`login:${clientIp(request)}`, 10, 60_000);
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

  const { email, password } = (body ?? {}) as {
    email?: unknown;
    password?: unknown;
  };
  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }

  const user = await verifyCredentialsAny(email, password);
  if (!user) {
    return NextResponse.json(
      { error: "Incorrect email or password" },
      { status: 401 },
    );
  }

  const token = await signSession({
    userId: user.id,
    name: user.name,
    email: user.email,
  });

  const res = NextResponse.json({
    user: { name: user.name, email: user.email },
  });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
