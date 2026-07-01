import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/current";
import { findUserById } from "@/lib/auth/users";
import {
  DashboardSidebar,
  DashboardMobileNav,
} from "@/components/dashboard/nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = findUserById(session.userId);
  const name = user?.name ?? session.name;
  const initials =
    user?.initials ??
    name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  const restaurantName = user?.restaurantName ?? "Your restaurant";

  return (
    <div className="min-h-dvh bg-background">
      <DashboardSidebar
        userName={name}
        userInitials={initials}
        restaurantName={restaurantName}
      />
      <div className="md:pl-60">
        <DashboardMobileNav />
        <main className="mx-auto max-w-6xl px-5 py-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}
