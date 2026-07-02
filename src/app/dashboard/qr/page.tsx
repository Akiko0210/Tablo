import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { QrCode } from "lucide-react";
import { getStaffContext } from "@/lib/auth/current";
import { QrGrid } from "@/components/dashboard/qr-grid";

export const metadata: Metadata = { title: "QR codes — Tablo" };

export default async function DashboardQrPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");
  const { restaurant } = ctx;

  return (
    <div>
      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-[13px] font-medium text-brand-strong">
        <QrCode className="size-3.5" /> Table QR codes
      </div>
      <h1 className="text-2xl font-bold tracking-tight">{restaurant.name}</h1>
      <p className="mt-1.5 max-w-xl text-[15px] text-muted-foreground">
        Print one code per table. A guest scans it with their phone camera — no
        app, no login — and lands straight on that table&apos;s menu.
      </p>

      <div className="mt-6">
        <QrGrid
          slug={restaurant.slug}
          restaurantId={restaurant.id}
          tableCount={restaurant.tableCount}
        />
      </div>
    </div>
  );
}
