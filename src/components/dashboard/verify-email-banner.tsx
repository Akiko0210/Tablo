"use client";

import * as React from "react";
import { toast } from "sonner";
import { MailWarning } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Soft nudge shown until the account's email is verified — nothing is
 * hard-blocked, the owner just keeps seeing this. */
export function VerifyEmailBanner({ email }: { email: string }) {
  const [pending, setPending] = React.useState(false);

  async function resend() {
    setPending(true);
    try {
      const res = await fetch("/api/auth/verify-email", { method: "POST" });
      if (res.ok) {
        toast.success(`Verification email sent to ${email}.`);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Couldn't send the email — try again later.");
      }
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-brand/30 bg-brand-soft px-4 py-3">
      <MailWarning className="size-4 shrink-0 text-brand-strong" />
      <p className="min-w-0 flex-1 text-[13px] text-brand-strong">
        Verify your email — we sent a link to{" "}
        <span className="font-semibold">{email}</span>. Password recovery needs
        a verified address.
      </p>
      <Button
        size="sm"
        variant="outline"
        onClick={resend}
        disabled={pending}
        className="border-brand/40 bg-transparent text-brand-strong hover:bg-brand/10"
      >
        Resend
      </Button>
    </div>
  );
}
