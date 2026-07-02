"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  // Prefilled with the demo account so the dashboard is one click away.
  const [email, setEmail] = React.useState("sofia@bella.com");
  const [password, setPassword] = React.useState("tablo123");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Please try again.");
      setPending(false);
    } catch {
      setError("Couldn't reach the server. Please try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="email" className="mb-1.5 block">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11"
          required
        />
      </div>

      <div>
        <Label htmlFor="password" className="mb-1.5 block">
          Password
        </Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-11"
          required
        />
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="h-11 rounded-xl text-[15px] font-semibold"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>

      <p className="rounded-lg bg-muted px-3 py-2 text-center text-[12px] text-muted-foreground">
        Demo account · <span className="font-medium">sofia@bella.com</span> /{" "}
        <span className="font-medium">tablo123</span>
      </p>

      <p className="text-center text-[13px] text-muted-foreground">
        New restaurant?{" "}
        <Link href="/signup" className="font-medium text-foreground underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
