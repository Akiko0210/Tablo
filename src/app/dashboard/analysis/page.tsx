import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  Lightbulb,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { getStaffContext } from "@/lib/auth/current";
import { listAllOrdersForAnalysis } from "@/lib/orders/store";
import { listMenuItems } from "@/lib/menu/store";
import { ensureAnalysisHistory } from "@/lib/analysis/ensure-history";
import {
  itemPerformance,
  ordersByHour,
  periodSummary,
  revenueByDayOfWeek,
  revenueByWeek,
} from "@/lib/analysis/stats";
import { buildInsights, type Insight } from "@/lib/analysis/insights";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  DayOfWeekChart,
  HourlyChart,
  RevenueByWeekChart,
} from "@/components/dashboard/analysis-charts";

export const metadata: Metadata = { title: "Analysis — Tablo" };

// The numbers change with every order, so never cache this page.
export const dynamic = "force-dynamic";

const WINDOW_DAYS = 28;

export default async function AnalysisPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");
  const { restaurant } = ctx;

  // First visit after the menu exists: backfill sample history so the charts
  // aren't empty. No-op afterwards.
  ensureAnalysisHistory(restaurant.id);

  const orders = listAllOrdersForAnalysis(restaurant.id);
  const menuItems = listMenuItems(restaurant.id);

  const summary = periodSummary(orders, 7);
  const weekly = revenueByWeek(orders, 8);
  const byDay = revenueByDayOfWeek(orders, WINDOW_DAYS);
  const byHour = ordersByHour(orders, WINDOW_DAYS);
  const items = itemPerformance(orders, WINDOW_DAYS);
  const insights = buildInsights({
    items,
    days: byDay,
    hours: byHour,
    menuItemNames: menuItems.map((i) => i.name),
    windowDays: WINDOW_DAYS,
  });

  const hasData = orders.length > 0;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Analysis</h1>
      <p className="mt-1.5 max-w-xl text-[15px] text-muted-foreground">
        How {restaurant.name} is really doing — revenue trends, what sells, and
        what to do about it.
      </p>

      {!hasData ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
          <p className="text-sm font-medium">No sales data yet</p>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted-foreground">
            Once your menu has items and orders start coming in, revenue charts
            and per-dish insights appear here automatically.
          </p>
        </div>
      ) : (
        <>
          {/* Headline numbers: last 7 days vs the 7 before */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Revenue · 7 days"
              value={formatMoney(summary.revenue)}
              trendPct={summary.revenueTrendPct}
            />
            <StatCard
              label="Orders · 7 days"
              value={String(summary.orders)}
              trendPct={summary.ordersTrendPct}
            />
            <StatCard
              label="Avg order"
              value={formatMoney(summary.avgOrder)}
              trendPct={null}
            />
          </div>

          {/* AI suggestions */}
          {insights.length > 0 && (
            <section className="mt-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="size-4 text-brand" /> Suggestions
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {insights.map((insight) => (
                  <InsightCard key={insight.title} insight={insight} />
                ))}
              </div>
            </section>
          )}

          {/* Charts */}
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard
              title="Revenue by week"
              subtitle="Last 8 weeks (current week in progress)"
            >
              <RevenueByWeekChart data={weekly} />
            </ChartCard>
            <ChartCard
              title="Revenue by day of week"
              subtitle={`Totals over the last ${WINDOW_DAYS} days`}
            >
              <DayOfWeekChart data={byDay} />
            </ChartCard>
          </div>

          <div className="mt-4">
            <ChartCard
              title="Orders by hour"
              subtitle={`When guests order · last ${WINDOW_DAYS} days`}
            >
              <HourlyChart data={byHour} />
            </ChartCard>
          </div>

          {/* Per-item performance */}
          <section className="mt-6">
            <h2 className="text-sm font-semibold">Menu item performance</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Last {WINDOW_DAYS} days vs the {WINDOW_DAYS} before. Best sellers
              first.
            </p>
            <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2.5 font-semibold">Item</th>
                    <th className="px-4 py-2.5 text-right font-semibold">
                      Orders
                    </th>
                    <th className="px-4 py-2.5 text-right font-semibold">
                      Revenue
                    </th>
                    <th className="px-4 py-2.5 text-right font-semibold">
                      Trend
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.slice(0, 12).map((item) => (
                    <tr
                      key={item.name}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-4 py-2.5 font-medium">{item.name}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {item.units}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {formatMoney(item.revenue)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <TrendBadge pct={item.trendPct} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="mt-4 text-[12px] text-muted-foreground">
            Includes sample history generated for demonstration — live orders
            fold into these numbers as they&apos;re served.
          </p>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  trendPct,
}: {
  label: string;
  value: string;
  trendPct: number | null;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-[13px] font-medium text-muted-foreground">{label}</div>
      <div className="mt-1.5 text-2xl font-bold tracking-tight">{value}</div>
      {trendPct !== null && (
        <div
          className={cn(
            "mt-1 inline-flex items-center gap-1 text-[12px] font-medium",
            trendPct >= 0 ? "text-green-700" : "text-destructive",
          )}
        >
          {trendPct >= 0 ? (
            <ArrowUpRight className="size-3.5" />
          ) : (
            <ArrowDownRight className="size-3.5" />
          )}
          {Math.abs(trendPct)}% vs previous 7 days
        </div>
      )}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mb-3 mt-0.5 text-[12px] text-muted-foreground">{subtitle}</p>
      {children}
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const icon =
    insight.tone === "positive" ? (
      <TrendingUp className="size-4" />
    ) : insight.tone === "warning" ? (
      <TrendingDown className="size-4" />
    ) : (
      <Lightbulb className="size-4" />
    );
  return (
    <div className="flex gap-3 rounded-2xl border border-border bg-card p-4">
      <span
        className={cn(
          "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg",
          insight.tone === "positive" && "bg-green-100 text-green-700",
          insight.tone === "warning" && "bg-brand-soft text-brand-strong",
          insight.tone === "info" && "bg-muted text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <div>
        <div className="text-sm font-semibold">{insight.title}</div>
        <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
          {insight.detail}
        </p>
      </div>
    </div>
  );
}

function TrendBadge({ pct }: { pct: number | null }) {
  if (pct === null) {
    return <span className="text-[12px] text-muted-foreground">new</span>;
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[12px] font-medium tabular-nums",
        pct >= 0 ? "bg-green-100 text-green-700" : "bg-brand-soft text-brand-strong",
      )}
    >
      {pct >= 0 ? (
        <ArrowUpRight className="size-3" />
      ) : (
        <ArrowDownRight className="size-3" />
      )}
      {Math.abs(pct)}%
    </span>
  );
}
