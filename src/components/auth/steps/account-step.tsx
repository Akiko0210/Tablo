"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface AccountFields {
  restaurantName: string;
  name: string;
  email: string;
  password: string;
}

export function AccountStep({
  onSubmit,
}: {
  onSubmit: (fields: AccountFields) => Promise<string | null>;
}) {
  const [fields, setFields] = React.useState<AccountFields>({
    restaurantName: "",
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const valid =
    fields.restaurantName.trim().length > 0 &&
    fields.name.trim().length > 0 &&
    fields.email.trim().length > 0 &&
    fields.password.length >= 8;

  function set<K extends keyof AccountFields>(key: K, value: AccountFields[K]) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || pending) return;
    setPending(true);
    setError(null);
    const err = await onSubmit(fields);
    if (err) {
      setError(err);
      setPending(false);
    }
    // On success the wizard advances and this component unmounts.
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="restaurantName" className="mb-1.5 block">
          Restaurant name
        </Label>
        <Input
          id="restaurantName"
          value={fields.restaurantName}
          onChange={(e) => set("restaurantName", e.target.value)}
          placeholder="Bella Trattoria"
          className="h-11"
          required
        />
      </div>

      <div>
        <Label htmlFor="ownerName" className="mb-1.5 block">
          Your name
        </Label>
        <Input
          id="ownerName"
          value={fields.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Sofia Duarte"
          className="h-11"
          required
        />
      </div>

      <div>
        <Label htmlFor="signupEmail" className="mb-1.5 block">
          Email
        </Label>
        <Input
          id="signupEmail"
          type="email"
          autoComplete="email"
          value={fields.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="you@restaurant.com"
          className="h-11"
          required
        />
      </div>

      <div>
        <Label htmlFor="signupPassword" className="mb-1.5 block">
          Password
        </Label>
        <Input
          id="signupPassword"
          type="password"
          autoComplete="new-password"
          value={fields.password}
          onChange={(e) => set("password", e.target.value)}
          placeholder="At least 8 characters"
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
        disabled={!valid || pending}
        className="h-11 rounded-xl text-[15px] font-semibold"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Creating account…
          </>
        ) : (
          "Continue"
        )}
      </Button>

      <p className="text-center text-[13px] text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
