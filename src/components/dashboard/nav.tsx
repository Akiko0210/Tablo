"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  ClipboardList,
  UtensilsCrossed,
  LineChart,
  QrCode,
  Users,
  Settings,
  Boxes,
  Phone,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/landing/logo";
import { LogoutButton } from "./logout-button";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  soon?: boolean;
}

export const NAV: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutGrid },
  { label: "Orders", href: "/dashboard/orders", icon: ClipboardList },
  { label: "Menu", href: "/dashboard/menu", icon: UtensilsCrossed },
  { label: "Analysis", href: "/dashboard/analysis", icon: LineChart },
  { label: "QR codes", href: "/dashboard/qr", icon: QrCode },
  { label: "Team", href: "/dashboard/team", icon: Users },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Supplies", href: "#", icon: Boxes, soon: true },
  { label: "Voice", href: "#", icon: Phone, soon: true },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

export function DashboardSidebar({
  userName,
  userInitials,
  restaurantName,
}: {
  userName: string;
  userInitials: string;
  restaurantName: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-card p-4 md:flex">
      <div className="px-1">
        <Logo />
      </div>

      <nav className="mt-6 flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const content = (
            <>
              <item.icon className="size-4" />
              <span className="flex-1">{item.label}</span>
              {item.soon && (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Soon
                </span>
              )}
            </>
          );
          const base =
            "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors";
          return item.soon ? (
            <span
              key={item.label}
              aria-disabled
              className={cn(base, "cursor-not-allowed text-muted-foreground/60")}
            >
              {content}
            </span>
          ) : (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                base,
                active
                  ? "bg-brand-soft text-brand-strong"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {content}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-border pt-3">
        <div className="flex items-center gap-2.5 px-1 pb-3">
          <span className="grid size-9 place-items-center rounded-full bg-foreground text-xs font-semibold text-background">
            {userInitials}
          </span>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[13px] font-semibold">{userName}</div>
            <div className="truncate text-[11px] text-muted-foreground">
              {restaurantName}
            </div>
          </div>
        </div>
        <LogoutButton variant="outline" className="w-full" />
      </div>
    </aside>
  );
}

export function DashboardMobileNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur-md md:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <Logo href={null} />
        <LogoutButton variant="outline" />
      </div>
      <nav className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3">
        {NAV.filter((i) => !i.soon).map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium",
                active
                  ? "bg-brand text-brand-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
