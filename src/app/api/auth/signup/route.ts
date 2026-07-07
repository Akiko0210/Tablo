import { NextResponse, after } from "next/server";
import { createAccount } from "@/lib/auth/accounts";
import { emailTakenAny } from "@/lib/auth/directory";
import { parseSignupInput } from "@/lib/auth/validate-signup";
import {
  SESSION_COOKIE,
  signSession,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { createVerificationToken } from "@/lib/auth/tokens";
import { appUrl, sendMail } from "@/lib/email/mailer";
import { verifyEmailMail } from "@/lib/email/templates";
import { clientIp, limit } from "@/lib/rate-limit";

// POST /api/auth/signup — step 1 of the wizard: create the account and start
// the session immediately, so steps 2-3 are authenticated requests.
export async function POST(request: Request) {
  const rate = await limit(`signup:${clientIp(request)}`, 5, 60_000);
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

  const parsed = parseSignupInput(body);
  if (parsed.error || !parsed.data) {
    return NextResponse.json(
      { error: parsed.error ?? "Invalid signup" },
      { status: 400 },
    );
  }
  const { restaurantName, name, email, password } = parsed.data;

  if (await emailTakenAny(email)) {
    return NextResponse.json(
      { error: "An account with that email already exists" },
      { status: 409 },
    );
  }

  const account = await createAccount({ restaurantName, name, email, password });

  // Best-effort verification email; the dashboard nudges until verified.
  after(async () => {
    const verifyToken = await createVerificationToken(account.id, "email_verify");
    await sendMail(
      verifyEmailMail(
        account.email,
        appUrl(`/api/auth/verify-email?token=${verifyToken}`),
      ),
    );
  });

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
