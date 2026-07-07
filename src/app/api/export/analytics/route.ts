import { NextResponse } from "next/server";
import { getStaffContext } from "@/lib/auth/current";
import { prisma } from "@/lib/db";
import { buildCsv, type CsvValue } from "@/lib/csv";
import { parseDateParam, csvHeaders } from "../params";

// GET /api/export/analytics?report=daily|items&from&to&includeSeeded=1
// Staff only. Aggregated reports over completed (served) orders:
//   daily — one row per calendar day: orders, items, revenue, AOV, items/order
//   items — one row per menu item name: units, revenue, distinct sale days
// Aggregates stay small (one row per day / item), so unlike the raw orders
// export this builds the CSV in memory from paginated reads.

const PAGE_SIZE = 1000;

interface DailyAgg {
  orders: number;
  items: number;
  revenue: number;
}

interface ItemAgg {
  units: number;
  revenue: number;
  days: Set<string>;
}

export async function GET(request: Request) {
  const ctx = await getStaffContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const report = params.get("report") ?? "daily";
  if (report !== "daily" && report !== "items") {
    return NextResponse.json(
      { error: "Unknown report — use daily or items" },
      { status: 400 },
    );
  }
  const from = parseDateParam(params.get("from"), "start");
  const to = parseDateParam(params.get("to"), "end");
  if (from === undefined || to === undefined) {
    return NextResponse.json(
      { error: "Invalid date — use YYYY-MM-DD" },
      { status: 400 },
    );
  }
  const includeSeeded = params.get("includeSeeded") === "1";

  const daily = new Map<string, DailyAgg>();
  const items = new Map<string, ItemAgg>();

  let cursor: string | undefined;
  for (;;) {
    const orders = await prisma.order.findMany({
      where: {
        restaurantId: ctx.restaurant.id,
        status: "served",
        ...(includeSeeded ? {} : { seeded: false }),
        createdAt: {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        },
      },
      include: { lines: true },
      orderBy: { createdAt: "asc" },
      take: PAGE_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (orders.length === 0) break;

    for (const order of orders) {
      const dayKey = localDateKey(order.createdAt);
      const units = order.lines.reduce((n, l) => n + l.quantity, 0);
      const day = daily.get(dayKey) ?? { orders: 0, items: 0, revenue: 0 };
      day.orders += 1;
      day.items += units;
      day.revenue += Number(order.subtotal);
      daily.set(dayKey, day);

      for (const line of order.lines) {
        const item =
          items.get(line.name) ?? { units: 0, revenue: 0, days: new Set<string>() };
        item.units += line.quantity;
        item.revenue += line.quantity * Number(line.unitPrice);
        item.days.add(dayKey);
        items.set(line.name, item);
      }
    }

    if (orders.length < PAGE_SIZE) break;
    cursor = orders[orders.length - 1].id;
  }

  const csv =
    report === "daily"
      ? buildCsv(
          ["date", "orders", "items", "revenue", "avg_order", "items_per_order"],
          [...daily.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, d]): CsvValue[] => [
              date,
              d.orders,
              d.items,
              round2(d.revenue),
              round2(d.revenue / d.orders),
              Math.round((d.items / d.orders) * 10) / 10,
            ]),
        )
      : buildCsv(
          ["item", "units", "revenue", "distinct_sale_days"],
          [...items.entries()]
            .sort(([, a], [, b]) => b.revenue - a.revenue)
            .map(([name, i]): CsvValue[] => [
              name,
              i.units,
              round2(i.revenue),
              i.days.size,
            ]),
        );

  return new Response(csv, {
    headers: csvHeaders(`analytics-${report}-${ctx.restaurant.slug}.csv`),
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Local YYYY-MM-DD, matching how the analysis charts bucket days. */
function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
