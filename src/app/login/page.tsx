import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth/current";
import { Logo } from "@/components/landing/logo";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in — Tablo",
};

export default async function LoginPage() {
  // Already signed in? Skip straight to the dashboard.
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-cream px-5 py-12">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to home
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-md sm:p-8">
          <Logo href={null} />
          <h1 className="mt-5 text-2xl font-bold tracking-tight">
            Sign in to your dashboard
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Manage your menu and see orders as they come in.
          </p>

          <div className="mt-6">
            <LoginForm />
          </div>
        </div>
      </div>
    </main>
  );
}
