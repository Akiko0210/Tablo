import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/current";
import { consumeVerificationToken, createVerificationToken } from "@/lib/auth/tokens";
import { appUrl, sendMail } from "@/lib/email/mailer";
import { verifyEmailMail } from "@/lib/email/templates";
import { clientIp, limit } from "@/lib/rate-limit";

// GET /api/auth/verify-email?token=… — the link from the verification email.
// Redirects into the dashboard with a status flag either way.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const accountId = token
    ? await consumeVerificationToken(token, "email_verify")
    : null;
  if (!accountId) {
    return NextResponse.redirect(appUrl("/dashboard?verified=expired"));
  }
  await prisma.account.update({
    where: { id: accountId },
    data: { emailVerifiedAt: new Date() },
  });
  return NextResponse.redirect(appUrl("/dashboard?verified=1"));
}

// POST /api/auth/verify-email — signed-in only: (re)send the verification
// email for the current account.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rate = await limit(`verify-email:${clientIp(request)}`, 3, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many attempts — wait a minute and try again." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    );
  }
  after(async () => {
    const token = await createVerificationToken(session.userId, "email_verify");
    await sendMail(
      verifyEmailMail(session.email, appUrl(`/api/auth/verify-email?token=${token}`)),
    );
  });
  return NextResponse.json({ ok: true });
}
