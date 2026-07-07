// Email templates for the auth flows. Plain, short, and safe to render in any
// client — the design lives in the app, not the inbox.

import type { Mail } from "./mailer";

function layout(title: string, bodyHtml: string): string {
  return `<div style="font-family:Inter,system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
  <div style="font-weight:700;font-size:18px;color:#F67522">Tablo</div>
  <h1 style="font-size:20px;margin:16px 0 8px">${title}</h1>
  ${bodyHtml}
  <p style="color:#888;font-size:12px;margin-top:24px">If you didn't request this, you can ignore this email.</p>
</div>`;
}

function button(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;background:#F67522;color:#fff;text-decoration:none;font-weight:600;padding:10px 20px;border-radius:12px;margin:12px 0">${label}</a>`;
}

export function verifyEmailMail(to: string, url: string): Mail {
  return {
    to,
    subject: "Verify your email — Tablo",
    html: layout(
      "Verify your email",
      `<p>Confirm this address to finish setting up your Tablo account.</p>${button(url, "Verify email")}<p style="font-size:12px;color:#888">Or open: ${url}</p>`,
    ),
    text: `Confirm your Tablo email address: ${url}`,
  };
}

export function resetPasswordMail(to: string, url: string): Mail {
  return {
    to,
    subject: "Reset your password — Tablo",
    html: layout(
      "Reset your password",
      `<p>Someone (hopefully you) asked to reset the password for this account. The link works once and expires in 1 hour.</p>${button(url, "Choose a new password")}<p style="font-size:12px;color:#888">Or open: ${url}</p>`,
    ),
    text: `Reset your Tablo password (valid 1 hour, single use): ${url}`,
  };
}
