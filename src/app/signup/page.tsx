import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth/current";
import { Logo } from "@/components/landing/logo";
import { SignupWizard } from "@/components/auth/signup-wizard";

export const metadata: Metadata = {
  title: "Create your account — Tablo",
};

export default async function SignupPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <main className="flex min-h-dvh flex-col items-center bg-cream px-5 py-12">
      <div className="w-full max-w-lg">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to home
        </Link>
        <div className="mb-6">
          <Logo href={null} />
        </div>
      </div>

      <SignupWizard />
    </main>
  );
}
