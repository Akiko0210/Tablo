// PrismaClient singleton. Attached to globalThis so dev HMR module reloads
// reuse one connection pool — same pattern the in-memory stores used.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  __tabloPrisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.__tabloPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__tabloPrisma = prisma;
}
