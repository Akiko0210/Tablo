"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type {
  DayOfWeekPoint,
  HourPoint,
  WeeklyPoint,
} from "@/lib/analysis/stats";
import { formatHour } from "@/lib/analysis/insights";

const revenueConfig = {
  revenue: { label: "Revenue", color: "var(--brand)" },
} satisfies ChartConfig;

const ordersConfig = {
  orders: { label: "Orders", color: "var(--brand)" },
} satisfies ChartConfig;

export function RevenueByWeekChart({ data }: { data: WeeklyPoint[] }) {
  return (
    <ChartContainer config={revenueConfig} className="h-56 w-full">
      <BarChart data={data} margin={{ left: -14, right: 4 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={11}
          tickFormatter={(v: number) => `$${v >= 1000 ? `${Math.round(v / 100) / 10}k` : v}`}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => [
                `$${Number(value).toLocaleString()}`,
                " revenue",
              ]}
            />
          }
        />
        <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

export function DayOfWeekChart({ data }: { data: DayOfWeekPoint[] }) {
  return (
    <ChartContainer config={revenueConfig} className="h-56 w-full">
      <BarChart data={data} margin={{ left: -14, right: 4 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={11}
          tickFormatter={(v: number) => `$${v >= 1000 ? `${Math.round(v / 100) / 10}k` : v}`}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => [
                `$${Number(value).toLocaleString()}`,
                " revenue",
              ]}
            />
          }
        />
        <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

export function HourlyChart({ data }: { data: HourPoint[] }) {
  // Only the service window matters — trim empty early-morning hours.
  const trimmed = data.filter((d) => d.hour >= 10 && d.hour <= 23);
  const withLabels = trimmed.map((d) => ({ ...d, label: formatHour(d.hour) }));
  return (
    <ChartContainer config={ordersConfig} className="h-56 w-full">
      <BarChart data={withLabels} margin={{ left: -22, right: 4 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          fontSize={10}
          interval={1}
        />
        <YAxis tickLine={false} axisLine={false} fontSize={11} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="orders" fill="var(--color-orders)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
