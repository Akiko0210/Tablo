// Status of the photo → menu AI analysis, per restaurant. The signup wizard
// kicks the job off in the background; the dashboard Menu page polls this.
// Persisted in Postgres so the status survives serverless invocations.

import { prisma } from "@/lib/db";

export type GenerationStatus = "idle" | "running" | "done" | "failed" | "skipped";

export interface GenerationJob {
  status: GenerationStatus;
  /** Human-readable detail (error message, skip reason, or item count). */
  message?: string;
  itemCount?: number;
  updatedAt: string;
}

export async function getGenerationJob(
  restaurantId: string,
): Promise<GenerationJob> {
  const row = await prisma.generationJob.findUnique({
    where: { restaurantId },
  });
  if (!row) return { status: "idle", updatedAt: new Date(0).toISOString() };
  return {
    status: row.status,
    message: row.message ?? undefined,
    itemCount: row.itemCount ?? undefined,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function setGenerationJob(
  restaurantId: string,
  job: Omit<GenerationJob, "updatedAt">,
): Promise<GenerationJob> {
  const data = {
    status: job.status,
    message: job.message ?? null,
    itemCount: job.itemCount ?? null,
  };
  const row = await prisma.generationJob.upsert({
    where: { restaurantId },
    update: data,
    create: { restaurantId, ...data },
  });
  return {
    status: row.status,
    message: row.message ?? undefined,
    itemCount: row.itemCount ?? undefined,
    updatedAt: row.updatedAt.toISOString(),
  };
}
