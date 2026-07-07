import { NextResponse, after } from "next/server";
import { findAccountByEmail } from "@/lib/auth/accounts";
import { createVerificationToken } from "@/lib/auth/tokens";
import { appUrl, sendMail } from "@/lib/email/mailer";
import { resetPasswordMail } from "@/lib/email/templates";
import { clientIp, limit } from "@/lib/rate-limit";

// POST /api/auth/forgot-password — request a reset link. Always answers 200
// whether or not the email exists, so the endpoint can't be used to probe
// which addresses have accounts.
export async function POST(request: Request) {
  const rate = await limit(`forgot-password:${clientIp(request)}`, 5, 60_000);
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
  const email = (body as { email?: unknown })?.email;
  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "Enter your email" }, { status: 400 });
  }

  const account = await findAccountByEmail(email);
  if (account) {
    after(async () => {
      const token = await createVerificationToken(account.id, "password_reset");
      await sendMail(
        resetPasswordMail(
          account.email,
          appUrl(`/reset-password?token=${token}`),
        ),
      );
    });
  }

  return NextResponse.json({
    ok: true,
    message: "If that email has an account, a reset link is on its way.",
  });
}
