"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  GRANULARITIES,
  buildSeries,
  isCurrentPeriod,
  periodStart,
  shiftPeriod,
  type Granularity,
  type SalesEvent,
} from "@/lib/analysis/series";

type Metric = "revenue" | "orders";

const GRANULARITY_LABELS: Record<Granularity, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
  year: "Year",
};

// Bars read well for a handful of discrete buckets (hours of a day, days of a
// week); the denser month/year views are clearer as a filled trend line.
const CHART_KIND: Record<Granularity, "bar" | "area"> = {
  day: "bar",
  week: "bar",
  month: "area",
  year: "area",
};

const chartConfig = {
  revenue: { label: "Revenue", color: "var(--brand)" },
  orders: { label: "Orders", color: "var(--brand)" },
} satisfies ChartConfig;

export function RevenueExplorer({
  events,
  nowMs,
}: {
  events: SalesEvent[];
  nowMs: number;
}) {
  const [granularity, setGranularity] = React.useState<Granularity>("week");
  const [metric, setMetric] = React.useState<Metric>("revenue");
  const [anchorMs, setAnchorMs] = React.useState<number>(nowMs);

  const now = React.useMemo(() => new Date(nowMs), [nowMs]);
  const anchor = React.useMemo(() => new Date(anchorMs), [anchorMs]);

  const series = React.useMemo(
    () => buildSeries(events, anchor, granularity),
    [events, anchor, granularity],
  );

  // Compare with the immediately preceding period for the headline trend.
  const prevSeries = React.useMemo(() => {
    const prevAnchor = shiftPeriod(anchor, granularity, -1);
    return buildSeries(events, prevAnchor, granularity);
  }, [events, anchor, granularity]);

  const atCurrent = isCurrentPeriod(anchor, granularity, now);

  function changeGranularity(g: Granularity) {
    setGranularity(g);
    // Snap the anchor to the start of the equivalent current period so the
    // labels stay sensible when switching (e.g. Week → Month shows this month).
    setAnchorMs(periodStart(new Date(nowMs), g).getTime());
  }

  function navigate(dir: 1 | -1) {
    if (dir === 1 && atCurrent) return;
    setAnchorMs(shiftPeriod(anchor, granularity, dir).getTime());
  }

  const total = metric === "revenue" ? series.totalRevenue : series.totalOrders;
  const prevTotal =
    metric === "revenue" ? prevSeries.totalRevenue : prevSeries.totalOrders;
  const trendPct =
    prevTotal === 0 ? null : Math.round(((total - prevTotal) / prevTotal) * 100);

  const headlineValue =
    metric === "revenue" ? formatMoney(series.totalRevenue) : String(series.totalOrders);
  const secondary =
    metric === "revenue"
      ? `${series.totalOrders} orders · ${formatMoney(series.avgOrder)} avg`
      : `${formatMoney(series.totalRevenue)} · ${formatMoney(series.avgOrder)} avg`;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl
          options={GRANULARITIES.map((g) => ({ value: g, label: GRANULARITY_LABELS[g] }))}
          value={granularity}
          onChange={(v) => changeGranularity(v as Granularity)}
        />
        <SegmentedControl
          options={[
            { value: "revenue", label: "Revenue" },
            { value: "orders", label: "Orders" },
          ]}
          value={metric}
          onChange={(v) => setMetric(v as Metric)}
        />
      </div>

      {/* Headline + range navigator */}
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold tracking-tight tabular-nums">
              {headlineValue}
            </span>
            {trendPct !== null && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[12px] font-medium tabular-nums",
                  trendPct >= 0
                    ? "bg-green-100 text-green-700"
                    : "bg-brand-soft text-brand-strong",
                )}
              >
                {trendPct >= 0 ? (
                  <ArrowUpRight className="size-3" />
                ) : (
                  <ArrowDownRight className="size-3" />
                )}
                {Math.abs(trendPct)}%
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[13px] text-muted-foreground">{secondary}</div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => navigate(-1)}
            aria-label="Previous period"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-32 text-center text-[13px] font-medium tabular-nums">
            {series.rangeLabel}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => navigate(1)}
            disabled={atCurrent}
            aria-label="Next period"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Chart */}
      <div className="mt-4">
        <ExplorerChart
          points={series.points}
          metric={metric}
          kind={CHART_KIND[granularity]}
          granularity={granularity}
        />
      </div>

      <p className="mt-2 text-center text-[12px] text-muted-foreground">
        {atCurrent ? "Current " : ""}
        {GRANULARITY_LABELS[granularity].toLowerCase()} · {series.rangeLabel}
      </p>
    </div>
  );
}

function ExplorerChart({
  points,
  metric,
  kind,
  granularity,
}: {
  points: { label: string; revenue: number; orders: number }[];
  metric: Metric;
  kind: "bar" | "area";
  granularity: Granularity;
}) {
  // Keep month/year x-axes readable by thinning tick labels.
  const interval =
    granularity === "month" ? 2 : granularity === "day" ? 2 : 0;

  const yTickFormatter = (v: number) =>
    metric === "revenue"
      ? `$${v >= 1000 ? `${Math.round(v / 100) / 10}k` : v}`
      : String(v);

  const tooltip = (
    <ChartTooltip
      content={
        <ChartTooltipContent
          formatter={(value) =>
            metric === "revenue"
              ? `$${Number(value).toLocaleString()}`
              : `${value} order${Number(value) === 1 ? "" : "s"}`
          }
        />
      }
    />
  );

  if (kind === "area") {
    return (
      <ChartContainer config={chartConfig} className="h-64 w-full">
        <AreaChart data={points} margin={{ left: -14, right: 8, top: 4 }}>
          <defs>
            <linearGradient id="fillExplorer" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--brand)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            interval={interval}
            minTickGap={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={11}
            width={48}
            tickFormatter={yTickFormatter}
          />
          {tooltip}
          <Area
            dataKey={metric}
            type="monotone"
            stroke="var(--brand)"
            strokeWidth={2}
            fill="url(#fillExplorer)"
          />
        </AreaChart>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <BarChart data={points} margin={{ left: -14, right: 8, top: 4 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          fontSize={11}
          interval={interval}
          minTickGap={4}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={11}
          width={48}
          tickFormatter={yTickFormatter}
        />
        {tooltip}
        <Bar dataKey={metric} fill="var(--brand)" radius={[5, 5, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-md px-3 py-1 text-[13px] font-medium transition-colors",
            value === opt.value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
