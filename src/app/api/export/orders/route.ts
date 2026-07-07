import { NextResponse } from "next/server";
import { getStaffContext } from "@/lib/auth/current";
import { prisma } from "@/lib/db";
import { csvRow } from "@/lib/csv";
import { parseDateParam, csvHeaders } from "../params";

// GET /api/export/orders?from=YYYY-MM-DD&to=YYYY-MM-DD&includeSeeded=1
// Staff only. Streams one CSV row per order line so a year of history never
// has to fit in memory. Seeded demo history is excluded unless requested.

const HEADER = [
  "order_id",
  "created_at",
  "table",
  "status",
  "item",
  "quantity",
  "unit_price",
  "options",
  "line_note",
  "line_total",
  "order_subtotal",
  "seeded",
];

const PAGE_SIZE = 500;

export async function GET(request: Request) {
  const ctx = await getStaffContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const restaurantId = ctx.restaurant.id;

  const params = new URL(request.url).searchParams;
  const from = parseDateParam(params.get("from"), "start");
  const to = parseDateParam(params.get("to"), "end");
  if (from === undefined || to === undefined) {
    return NextResponse.json(
      { error: "Invalid date — use YYYY-MM-DD" },
      { status: 400 },
    );
  }
  const includeSeeded = params.get("includeSeeded") === "1";

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(csvRow(HEADER)));

        let cursor: string | undefined;
        for (;;) {
          const orders = await prisma.order.findMany({
            where: {
              restaurantId,
              ...(includeSeeded ? {} : { seeded: false }),
              createdAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            },
            include: { lines: { orderBy: { sortIndex: "asc" } } },
            orderBy: { createdAt: "asc" },
            take: PAGE_SIZE,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          });
          if (orders.length === 0) break;

          let chunk = "";
          for (const order of orders) {
            for (const line of order.lines) {
              const unitPrice = Number(line.unitPrice);
              const optionLabels = line.optionLabels.length
                ? line.optionLabels
                : [line.sizeLabel, ...line.addonLabels].filter(Boolean);
              chunk += csvRow([
                order.displayId,
                order.createdAt.toISOString(),
                order.table,
                order.status,
                line.name,
                line.quantity,
                unitPrice,
                optionLabels.join("; "),
                line.note,
                Math.round(unitPrice * line.quantity * 100) / 100,
                Number(order.subtotal),
                order.seeded,
              ]);
            }
          }
          controller.enqueue(encoder.encode(chunk));

          if (orders.length < PAGE_SIZE) break;
          cursor = orders[orders.length - 1].id;
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: csvHeaders(`orders-${ctx.restaurant.slug}.csv`),
  });
}
