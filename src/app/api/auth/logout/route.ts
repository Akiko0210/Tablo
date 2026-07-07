import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, revokeSession } from "@/lib/auth/session";

// POST /api/auth/logout — revoke the DB session and clear the cookie.
export async function POST() {
  const store = await cookies();
  await revokeSession(store.get(SESSION_COOKIE)?.value);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
