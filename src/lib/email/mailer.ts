// Outbound email. Resend when RESEND_API_KEY is set (its plain REST API, so
// no SDK dependency); otherwise messages log to the server console so every
// flow is testable in dev with zero config.

import "server-only";

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendMail(mail: Mail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(
      `[mail:console] To: ${mail.to}\nSubject: ${mail.subject}\n${mail.text}`,
    );
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Tablo <onboarding@resend.dev>",
      to: [mail.to],
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    }),
  });
  if (!res.ok) {
    // Callers treat email as best-effort; log so ops can see delivery issues.
    console.error(`Resend send failed (${res.status}): ${await res.text()}`);
  }
}

/** Absolute URL for links inside emails. */
export function appUrl(path: string): string {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}
