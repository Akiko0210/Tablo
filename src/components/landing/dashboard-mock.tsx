import {
  LayoutGrid,
  UtensilsCrossed,
  LineChart,
  Boxes,
  Wallet,
  Phone,
  Sparkles,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { icon: LayoutGrid, label: "Overview", active: true },
  { icon: UtensilsCrossed, label: "Menu" },
  { icon: LineChart, label: "Analysis" },
  { icon: Boxes, label: "Supplies" },
  { icon: Wallet, label: "Accounts" },
  { icon: Phone, label: "Voice" },
];

const STATS = [
  { label: "Revenue", value: "$2,480", delta: "↑ 12.4%" },
  { label: "Orders", value: "142", delta: "↑ 8" },
  { label: "Avg order", value: "$17.46", delta: "↑ 2.1%" },
  { label: "Profit est.", value: "$610", delta: "↑ 5.7%" },
];

const BARS = [40, 52, 46, 61, 55, 88, 96];

const ATTENTION = [
  { title: "Mozzarella running low", sub: "Out by Saturday at this pace" },
  { title: "1 missed call", sub: "Voice agent took a reservation" },
  { title: "Tiramisù selling slow", sub: "Down 40% on weekdays" },
];

export function DashboardMock() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-3.5 py-2.5">
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <div className="ml-2 flex flex-1 items-center justify-center gap-1.5 rounded-md bg-card px-3 py-1 text-[11px] text-muted-foreground">
          <Lock className="size-3" /> app.tablo.com/overview
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden w-40 shrink-0 flex-col border-r border-border p-3 sm:flex">
          <div className="mb-3 flex items-center gap-2 px-1">
            <span className="grid size-6 place-items-center rounded-md bg-brand text-xs font-extrabold text-brand-foreground">
              T
            </span>
            <span className="text-sm font-bold">Tablo</span>
          </div>
          <nav className="flex flex-col gap-0.5">
            {NAV.map((n) => (
              <div
                key={n.label}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] font-medium",
                  n.active
                    ? "bg-brand-soft text-brand-strong"
                    : "text-muted-foreground",
                )}
              >
                <n.icon className="size-3.5" /> {n.label}
              </div>
            ))}
          </nav>
          <div className="mt-auto flex items-center gap-2 rounded-lg px-1 pt-4">
            <span className="grid size-7 place-items-center rounded-full bg-foreground text-[11px] font-semibold text-background">
              SD
            </span>
            <div className="leading-tight">
              <div className="text-[12px] font-semibold">Sofia Duarte</div>
              <div className="text-[10px] text-muted-foreground">
                Bella Trattoria
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="min-w-0 flex-1 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] text-muted-foreground">
                Good morning, Sofia
              </div>
              <div className="text-sm font-bold">
                Here&apos;s how Bella Trattoria is doing today
              </div>
            </div>
            <span className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground">
              This week ▾
            </span>
          </div>

          {/* Stats */}
          <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-xl border border-border p-2.5">
                <div className="text-[11px] text-muted-foreground">{s.label}</div>
                <div className="mt-0.5 text-base font-bold tabular-nums">
                  {s.value}
                </div>
                <div className="text-[10px] font-medium text-emerald-600">
                  {s.delta}
                </div>
              </div>
            ))}
          </div>

          {/* Chart + attention */}
          <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-5">
            <div className="rounded-xl border border-border p-3 lg:col-span-3">
              <div className="text-[12px] font-semibold">Revenue this week</div>
              <div className="mt-3 flex h-20 items-end gap-1.5">
                {BARS.map((h, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex-1 rounded-t-sm",
                      i >= 5 ? "bg-brand" : "bg-brand/25",
                    )}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Sparkles className="size-3 text-brand" /> Weekend dinners drove
                most of the lift.
              </div>
            </div>

            <div className="rounded-xl border border-border p-3 lg:col-span-2">
              <div className="text-[12px] font-semibold">Needs attention</div>
              <div className="mt-2 flex flex-col gap-2">
                {ATTENTION.map((a) => (
                  <div key={a.title} className="flex gap-2">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-brand" />
                    <div className="leading-tight">
                      <div className="text-[11px] font-medium">{a.title}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {a.sub}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
