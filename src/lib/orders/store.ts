// Order store backed by Postgres via Prisma. Externally an order's `id` is its
// per-restaurant display id ("ord-1003") — same shape the in-memory store
// exposed — while the DB keeps its own primary key. All lookups here are
// restaurant-scoped, so the (restaurantId, displayId) unique pair is enough.

import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { NewOrderInput, Order, OrderStatus } from "./types";

type OrderWithLines = Prisma.OrderGetPayload<{ include: { lines: true } }>;

const orderInclude = {
  lines: { orderBy: { sortIndex: "asc" as const } },
};

function toOrder(row: OrderWithLines): Order {
  return {
    id: row.displayId,
    restaurantId: row.restaurantId,
    table: row.table,
    lines: row.lines.map((l) => ({
      name: l.name,
      quantity: l.quantity,
      unitPrice: Number(l.unitPrice),
      // New lines carry optionLabels; legacy lines fold size/add-ons in.
      optionLabels: l.optionLabels.length
        ? l.optionLabels
        : [l.sizeLabel, ...l.addonLabels].filter((x): x is string => !!x),
      note: l.note ?? undefined,
    })),
    subtotal: Number(row.subtotal),
    kitchenNote: row.kitchenNote ?? undefined,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    seeded: row.seeded || undefined,
  };
}

/** Live (non-seeded) orders for one restaurant, newest first. */
export async function listOrders(restaurantId: string): Promise<Order[]> {
  const rows = await prisma.order.findMany({
    where: { restaurantId, seeded: false },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toOrder);
}

/** One completed sale, reduced to what the analysis explorer charts need. */
export interface SaleEventRow {
  /** epoch ms */
  t: number;
  revenue: number;
  /** Units across the order's lines. */
  items: number;
}

/** All served sales (incl. synthetic history) as lightweight events — one
 * aggregated row per order instead of full orders with joined lines. The
 * demo restaurant has thousands of seeded orders; shipping them with lines
 * attached made the Analysis page take seconds. */
export async function listSalesEvents(
  restaurantId: string,
): Promise<SaleEventRow[]> {
  const rows = await prisma.$queryRaw<
    { createdAt: Date; subtotal: unknown; items: bigint | number }[]
  >`
    SELECT o."createdAt", o."subtotal", COALESCE(SUM(l."quantity"), 0) AS items
    FROM "Order" o
    LEFT JOIN "OrderLine" l ON l."orderId" = o."id"
    WHERE o."restaurantId" = ${restaurantId} AND o."status" = 'served'
    GROUP BY o."id"
  `;
  return rows.map((r) => ({
    t: r.createdAt.getTime(),
    revenue: Number(r.subtotal),
    items: Number(r.items),
  }));
}

/** Orders (with lines) created since `since` — the bounded window the
 * per-item stats and insights need, instead of the whole history. */
export async function listOrdersSince(
  restaurantId: string,
  since: Date,
): Promise<Order[]> {
  const rows = await prisma.order.findMany({
    where: { restaurantId, createdAt: { gte: since } },
    include: orderInclude,
  });
  return rows.map(toOrder);
}

export async function createOrder(
  restaurantId: string,
  input: NewOrderInput,
): Promise<Order> {
  const row = await prisma.$transaction(async (tx) => {
    const { orderSeq } = await tx.restaurant.update({
      where: { id: restaurantId },
      data: { orderSeq: { increment: 1 } },
      select: { orderSeq: true },
    });
    return tx.order.create({
      data: {
        restaurantId,
        displayId: `ord-${orderSeq}`,
        table: input.table,
        subtotal: input.subtotal,
        kitchenNote: input.kitchenNote?.trim() || null,
        lines: {
          create: input.lines.map((line, i) => ({
            name: line.name,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            optionLabels: line.optionLabels,
            note: line.note ?? null,
            sortIndex: i,
          })),
        },
      },
      include: orderInclude,
    });
  });
  return toOrder(row);
}

/** Advance an order's status. The restaurantId guard prevents one tenant from
 * touching another tenant's orders. */
export async function updateOrderStatus(
  restaurantId: string,
  id: string,
  status: OrderStatus,
): Promise<Order | undefined> {
  try {
    const row = await prisma.order.update({
      where: {
        restaurantId_displayId: { restaurantId, displayId: id },
      },
      data: { status },
      include: orderInclude,
    });
    return toOrder(row);
  } catch {
    return undefined;
  }
}

/** Bulk-insert synthetic history (used by the analysis seeder). Idempotent per
 * restaurant: the second call is a no-op. Returns whether seeding ran. */
export async function insertSeededHistory(
  restaurantId: string,
  orders: Omit<Order, "seeded">[],
): Promise<boolean> {
  // Claim the seed slot atomically; a concurrent second call matches 0 rows.
  const { count } = await prisma.restaurant.updateMany({
    where: { id: restaurantId, historySeededAt: null },
    data: { historySeededAt: new Date() },
  });
  if (count === 0) return false;

  // createMany (no nested writes) — the history is thousands of rows.
  const pkFor = new Map(orders.map((o) => [o.id, `seedord_${crypto.randomUUID()}`]));
  await prisma.order.createMany({
    data: orders.map((o) => ({
      id: pkFor.get(o.id)!,
      restaurantId,
      displayId: o.id,
      table: o.table,
      subtotal: o.subtotal,
      kitchenNote: o.kitchenNote ?? null,
      status: o.status,
      seeded: true,
      createdAt: new Date(o.createdAt),
    })),
    skipDuplicates: true,
  });
  await prisma.orderLine.createMany({
    data: orders.flatMap((o) =>
      o.lines.map((line, i) => ({
        orderId: pkFor.get(o.id)!,
        name: line.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        optionLabels: line.optionLabels,
        note: line.note ?? null,
        sortIndex: i,
      })),
    ),
  });
  return true;
}
