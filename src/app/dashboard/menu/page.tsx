import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaffContext } from "@/lib/auth/current";
import { MenuManager } from "@/components/dashboard/menu-manager";

export const metadata: Metadata = { title: "Menu — Tablo" };

export default async function DashboardMenuPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Menu</h1>
      <p className="mt-1.5 max-w-xl text-[15px] text-muted-foreground">
        What guests see when they scan your QR code. Items generated from your
        photos land here for you to review and edit.
      </p>
      <div className="mt-6">
        <MenuManager />
      </div>
    </div>
  );
}
