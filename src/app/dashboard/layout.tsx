import { redirect } from "next/navigation";
import { getStaffContext } from "@/lib/auth/current";
import { findUserByIdAny } from "@/lib/auth/directory";
import { initialsFrom } from "@/lib/auth/initials";
import {
  DashboardSidebar,
  DashboardMobileNav,
} from "@/components/dashboard/nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Requires both a valid session and a resolvable restaurant, matching the
  // gate used by /api/orders and other staff routes — a session whose
  // restaurant is missing (e.g. in-memory store reset) must not render the
  // dashboard shell, or the client's 401 handling loops against /login.
  const context = await getStaffContext();
  if (!context) redirect("/login");
  const { session } = context;

  const user = findUserByIdAny(session.userId);
  const name = user?.name ?? session.name;
  const initials = user?.initials ?? initialsFrom(name);
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
