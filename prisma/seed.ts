// Seeds the demo account + Bella Trattoria demo restaurant (menu, workers,
// a couple of live orders). Idempotent: re-running against a seeded database
// is a no-op. Synthetic analysis history is generated lazily by
// src/lib/analysis/ensure-history.ts on first Analysis-page visit (demo only).

import { PrismaClient } from "@prisma/client";
import { restaurant as demoMenu } from "../src/lib/menu-data";
import { hashPassword } from "../src/lib/auth/password";
import {
  DEMO_KITCHEN_CODE,
  DEMO_RESTAURANT_ID,
  DEMO_RESTAURANT_SLUG,
} from "../src/lib/restaurants/demo";

const prisma = new PrismaClient();

const DEMO_OWNER_USER_ID = "u_sofia";

async function main() {
  const existing = await prisma.account.findUnique({
    where: { id: DEMO_OWNER_USER_ID },
  });
  if (existing) {
    console.log("Demo data already seeded — nothing to do.");
    return;
  }

  await prisma.account.create({
    data: {
      id: DEMO_OWNER_USER_ID,
      name: "Sofia Duarte",
      initials: "SD",
      email: "sofia@bella.com",
      passwordHash: await hashPassword("tablo123"),
      role: "Owner",
      onboardingComplete: true,
      emailVerifiedAt: new Date(0),
      cuisine: "Italian",
    },
  });

  await prisma.restaurant.create({
    data: {
      id: DEMO_RESTAURANT_ID,
      slug: DEMO_RESTAURANT_SLUG,
      name: demoMenu.name,
      initials: demoMenu.initials,
      tagline: demoMenu.tagline,
      cuisine: "Italian",
      currency: demoMenu.currency,
      tableCount: demoMenu.tableCount,
      kitchenCode: DEMO_KITCHEN_CODE,
      ownerUserId: DEMO_OWNER_USER_ID,
      demo: true,
      orderSeq: 1002, // ord-1001/1002 below already exist
      createdAt: new Date(0),
    },
  });

  // Menu items with their modifier groups.
  for (const [index, item] of demoMenu.items.entries()) {
    await prisma.menuItem.create({
      data: {
        id: item.id,
        restaurantId: DEMO_RESTAURANT_ID,
        name: item.name,
        description: item.description,
        price: item.price,
        categoryId: item.categoryId,
        tags: item.tags,
        emoji: item.emoji ?? null,
        imageUrl: item.imageUrl ?? null,
        soldOut: item.soldOut ?? false,
        popular: item.popular ?? false,
        source: "seed",
        sortIndex: index,
        createdAt: new Date(0),
        modifierGroups: {
          create: (item.modifierGroups ?? []).map((g, gi) => ({
            id: `mg_${item.id}_${g.id}`,
            label: g.label,
            minSelect: g.min,
            maxSelect: g.max,
            required: g.required,
            sortIndex: gi,
            options: {
              create: g.options.map((o, oi) => ({
                id: `${item.id}_${o.id}`,
                label: o.label,
                priceDelta: o.priceDelta,
                note: o.note ?? null,
                sortIndex: oi,
              })),
            },
          })),
        },
      },
    });
  }

  // Workers + shifts: Marco and Elena are on shift right now; Luca worked
  // yesterday. PINs (1111/2222/3333, documented in the README) are stored as
  // scrypt hashes — unique per restaurant.
  const pinHashes = await Promise.all(
    ["1111", "2222", "3333"].map(hashPassword),
  );
  const now = Date.now();
  const ago = (ms: number) => new Date(now - ms);
  await prisma.worker.createMany({
    data: [
      { id: "w_marco", restaurantId: DEMO_RESTAURANT_ID, name: "Marco Rinaldi", role: "Head chef", phone: "(555) 010-2233", email: "marco@bella.com", pinHash: pinHashes[0], createdAt: new Date(0) },
      { id: "w_elena", restaurantId: DEMO_RESTAURANT_ID, name: "Elena Moretti", role: "Server", phone: "(555) 010-4455", email: "elena@bella.com", pinHash: pinHashes[1], createdAt: new Date(0) },
      { id: "w_luca", restaurantId: DEMO_RESTAURANT_ID, name: "Luca Bianchi", role: "Line cook", phone: "(555) 010-6677", pinHash: pinHashes[2], createdAt: new Date(0) },
    ],
  });
  await prisma.timeEntry.createMany({
    data: [
      { id: "te_1", restaurantId: DEMO_RESTAURANT_ID, workerId: "w_marco", clockIn: ago(2.2 * 60 * 60_000) },
      { id: "te_2", restaurantId: DEMO_RESTAURANT_ID, workerId: "w_elena", clockIn: ago(48 * 60_000) },
      { id: "te_3", restaurantId: DEMO_RESTAURANT_ID, workerId: "w_luca", clockIn: ago(30 * 60 * 60_000), clockOut: ago(24 * 60 * 60_000) },
    ],
  });

  // A couple of orders already "in the kitchen" so the dashboard isn't empty.
  // These write the legacy sizeLabel/addonLabels columns on purpose — they
  // keep the pre-modifier-group read path exercised in the demo.
  await prisma.order.create({
    data: {
      restaurantId: DEMO_RESTAURANT_ID,
      displayId: "ord-1001",
      table: "4",
      subtotal: 36,
      status: "preparing",
      createdAt: ago(8 * 60_000),
      lines: {
        create: [
          { name: "Margherita", quantity: 1, unitPrice: 14, sizeLabel: 'Regular · 12"', addonLabels: [], sortIndex: 0 },
          { name: "Aperol Spritz", quantity: 2, unitPrice: 11, addonLabels: [], sortIndex: 1 },
        ],
      },
    },
  });
  await prisma.order.create({
    data: {
      restaurantId: DEMO_RESTAURANT_ID,
      displayId: "ord-1002",
      table: "9",
      subtotal: 20,
      kitchenNote: "Guest has a nut allergy.",
      status: "new",
      createdAt: ago(2 * 60_000),
      lines: {
        create: [
          { name: "Tagliatelle al Ragù", quantity: 1, unitPrice: 18, addonLabels: ["Extra parmesan"], note: "No chili", sortIndex: 0 },
        ],
      },
    },
  });

  console.log("Seeded demo account, restaurant, menu, workers, and orders.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
