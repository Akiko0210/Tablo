import { NextResponse } from "next/server";
import { createAccount } from "@/lib/auth/accounts";
import { emailTakenAny } from "@/lib/auth/directory";
import { parseSignupInput } from "@/lib/auth/validate-signup";
import {
  SESSION_COOKIE,
  signSession,
  sessionCookieOptions,
} from "@/lib/auth/session";

// POST /api/auth/signup — step 1 of the wizard: create the account and start
// the session immediately, so steps 2-3 are authenticated requests.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = parseSignupInput(body);
  if (parsed.error || !parsed.data) {
    return NextResponse.json(
      { error: parsed.error ?? "Invalid signup" },
      { status: 400 },
    );
  }
  const { restaurantName, name, email, password } = parsed.data;

  if (emailTakenAny(email)) {
    return NextResponse.json(
      { error: "An account with that email already exists" },
      { status: 409 },
    );
  }

  const account = await createAccount({ restaurantName, name, email, password });

  const token = await signSession({
    userId: account.id,
    name: account.name,
    email: account.email,
  });

  const res = NextResponse.json(
    {
      user: {
        name: account.name,
        email: account.email,
        restaurantName: account.restaurantName,
      },
    },
    { status: 201 },
  );
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
