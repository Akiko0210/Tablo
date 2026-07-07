import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/landing/logo";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Forgot password — Tablo" };

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-cream px-5 py-12">
      <div className="w-full max-w-sm">
        <Link
          href="/login"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to sign in
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-md sm:p-8">
          <Logo href={null} />
          <h1 className="mt-5 text-2xl font-bold tracking-tight">
            Forgot your password?
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Enter your account email and we&apos;ll send a reset link.
          </p>

          <div className="mt-6">
            <ForgotPasswordForm />
          </div>
        </div>
      </div>
    </main>
  );
}
