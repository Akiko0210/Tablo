import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/landing/logo";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Reset password — Tablo" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
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
            Choose a new password
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            You&apos;ll be signed out everywhere once it&apos;s set.
          </p>

          <div className="mt-6">
            <ResetPasswordForm token={token ?? ""} />
          </div>
        </div>
      </div>
    </main>
  );
}
