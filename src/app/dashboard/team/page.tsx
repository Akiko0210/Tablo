import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChefHat } from "lucide-react";
import { getStaffContext } from "@/lib/auth/current";
import { TeamManager } from "@/components/dashboard/team-manager";

export const metadata: Metadata = { title: "Team — Tablo" };

export default async function TeamPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");
  const { restaurant } = ctx;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Team</h1>
      <p className="mt-1.5 max-w-xl text-[15px] text-muted-foreground">
        Who&apos;s on shift right now, hours worked today, and each worker&apos;s
        profile.
      </p>

      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-brand/30 bg-brand-soft px-4 py-3">
        <ChefHat className="mt-0.5 size-4 shrink-0 text-brand" />
        <p className="text-[13px] text-muted-foreground">
          <span className="font-semibold text-brand-strong">
            Kitchen app:
          </span>{" "}
          staff open <code className="rounded bg-white/60 px-1">/kitchen</code>{" "}
          on any device and enter code{" "}
          <code className="rounded bg-white/60 px-1 font-semibold text-brand-strong">
            {restaurant.kitchenCode}
          </code>{" "}
          to clock in/out and work the order queue.
        </p>
      </div>

      <div className="mt-6">
        <TeamManager />
      </div>
    </div>
  );
}
