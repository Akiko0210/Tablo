import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChefHat, Link2 } from "lucide-react";
import { getStaffContext } from "@/lib/auth/current";
import { listUploadsForOwner } from "@/lib/uploads/store";
import { tableMenuPath } from "@/lib/menu-url";
import {
  PhotosManager,
  SettingsForm,
} from "@/components/dashboard/settings-form";

export const metadata: Metadata = { title: "Settings — Tablo" };

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");
  const { restaurant, session } = ctx;

  const uploads = (await listUploadsForOwner(session.userId)).map((u) => ({
    id: u.id,
    url: `/api/uploads/${u.id}`,
    filename: u.filename,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <p className="mt-1.5 max-w-xl text-[15px] text-muted-foreground">
        The details you set up during onboarding — edit them any time.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <SettingsForm
          initial={{
            name: restaurant.name,
            tagline: restaurant.tagline,
            cuisine: restaurant.cuisine ?? "",
            tableCount: restaurant.tableCount,
            address: restaurant.address ?? "",
            phone: restaurant.phone ?? "",
            description: restaurant.description ?? "",
          }}
        />

        <PhotosManager initial={uploads} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Link2 className="size-4 text-brand" /> Guest menu
            </h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Your menu lives at{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-[12px]">
                {tableMenuPath(restaurant.slug, "«table»")}
              </code>
              . QR codes for every table are on the QR codes page.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ChefHat className="size-4 text-brand" /> Kitchen app access
            </h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Kitchen staff open{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-[12px]">
                /kitchen
              </code>{" "}
              on any device and enter code{" "}
              <code className="rounded bg-brand-soft px-1.5 py-0.5 text-[12px] font-semibold text-brand-strong">
                {restaurant.kitchenCode}
              </code>{" "}
              to clock in and manage orders.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
