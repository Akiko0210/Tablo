"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const CUISINES = [
  "Italian",
  "American",
  "Mexican",
  "Japanese",
  "Chinese",
  "Indian",
  "Thai",
  "Mediterranean",
  "French",
  "Cafe / Bakery",
  "Other",
];

export interface DetailsFields {
  cuisine: string;
  tagline: string;
  tableCount: string;
  address: string;
  phone: string;
  description: string;
}

export function DetailsStep({
  initial,
  onBack,
  onSubmit,
}: {
  initial: DetailsFields;
  onBack: () => void;
  onSubmit: (fields: DetailsFields) => Promise<string | null>;
}) {
  const [fields, setFields] = React.useState<DetailsFields>(initial);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const valid =
    fields.cuisine.trim().length > 0 &&
    fields.tagline.trim().length > 0 &&
    fields.tableCount.trim().length > 0;

  function set<K extends keyof DetailsFields>(key: K, value: DetailsFields[K]) {
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
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Tell us about your restaurant</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          A few details to finish setting up your dashboard.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cuisine" className="mb-1.5 block">
            Cuisine
          </Label>
          <select
            id="cuisine"
            value={fields.cuisine}
            onChange={(e) => set("cuisine", e.target.value)}
            required
            className={cn(
              "h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-[14px] outline-none transition-colors",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            )}
          >
            <option value="" disabled>
              Select…
            </option>
            {CUISINES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="tableCount" className="mb-1.5 block">
            Number of tables
          </Label>
          <Input
            id="tableCount"
            type="number"
            min={1}
            max={500}
            value={fields.tableCount}
            onChange={(e) => set("tableCount", e.target.value)}
            placeholder="12"
            className="h-11"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="tagline" className="mb-1.5 block">
          Tagline
        </Label>
        <Input
          id="tagline"
          value={fields.tagline}
          onChange={(e) => set("tagline", e.target.value)}
          placeholder="Wood-fired · Dine in"
          maxLength={140}
          className="h-11"
          required
        />
      </div>

      <div>
        <Label htmlFor="address" className="mb-1.5 block">
          Address <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="address"
          value={fields.address}
          onChange={(e) => set("address", e.target.value)}
          placeholder="123 Main St, Springfield"
          maxLength={200}
          className="h-11"
        />
      </div>

      <div>
        <Label htmlFor="phone" className="mb-1.5 block">
          Phone <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="phone"
          type="tel"
          value={fields.phone}
          onChange={(e) => set("phone", e.target.value)}
          placeholder="(555) 123-4567"
          maxLength={40}
          className="h-11"
        />
      </div>

      <div>
        <Label htmlFor="description" className="mb-1.5 block">
          Short description{" "}
          <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="description"
          value={fields.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="A cozy neighborhood spot for wood-fired pizza and pasta."
          maxLength={1000}
          className="min-h-20 resize-none"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
          {error}
        </p>
      )}

      <div className="mt-1 flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button
          type="submit"
          disabled={!valid || pending}
          className="h-11 rounded-xl px-6 text-[15px] font-semibold"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Saving…
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </div>
    </form>
  );
}
