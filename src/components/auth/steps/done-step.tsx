"use client";

import { Check, MapPin, Phone, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AccountFields } from "./account-step";
import type { DetailsFields } from "./details-step";
import type { PhotoItem } from "./photos-step";

export function DoneStep({
  account,
  details,
  photos,
  onGoToDashboard,
}: {
  account: AccountFields;
  details: DetailsFields;
  photos: PhotoItem[];
  onGoToDashboard: () => void;
}) {
  const uploaded = photos.filter((p) => p.status === "done");

  return (
    <div className="flex flex-col items-center text-center">
      <div className="grid size-16 place-items-center rounded-full bg-brand-soft text-brand">
        <Check className="size-8" strokeWidth={2.5} />
      </div>
      <h2 className="mt-4 text-2xl font-bold">You&apos;re all set</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {`${account.restaurantName} is ready. Here's what we saved.`}
      </p>

      <div className="mt-6 w-full rounded-2xl border border-border bg-card p-4 text-left">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-brand text-sm font-bold text-brand-foreground">
            {account.restaurantName.trim()[0]?.toUpperCase() ?? "T"}
          </span>
          <div className="min-w-0">
            <div className="truncate font-semibold">{account.restaurantName}</div>
            <div className="truncate text-[13px] text-muted-foreground">
              {details.tagline}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-1.5 text-[13px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <Utensils className="size-3.5 shrink-0" />
            {details.cuisine} · {details.tableCount} tables
          </div>
          {details.address && (
            <div className="flex items-center gap-2">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{details.address}</span>
            </div>
          )}
          {details.phone && (
            <div className="flex items-center gap-2">
              <Phone className="size-3.5 shrink-0" />
              {details.phone}
            </div>
          )}
        </div>

        {uploaded.length > 0 && (
          <div className="mt-3 grid grid-cols-6 gap-1.5">
            {uploaded.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element -- local blob preview
              <img
                key={p.localId}
                src={p.previewUrl}
                alt=""
                className="aspect-square w-full rounded-md border border-border object-cover"
              />
            ))}
          </div>
        )}
      </div>

      <Button
        onClick={onGoToDashboard}
        className="mt-6 h-12 w-full rounded-xl text-[15px] font-semibold"
      >
        Go to dashboard
      </Button>
    </div>
  );
}
