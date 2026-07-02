import { NextResponse } from "next/server";
import { getStaffContext } from "@/lib/auth/current";
import { runMenuGeneration } from "@/lib/menu/generate";
import { getGenerationJob } from "@/lib/menu/generation-store";

// GET /api/menu/generate — staff only. Poll the AI analysis status.
export async function GET() {
  const ctx = await getStaffContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ generation: getGenerationJob(ctx.restaurant.id) });
}

// POST /api/menu/generate — staff only. (Re-)run the photo analysis.
export async function POST() {
  const ctx = await getStaffContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const job = getGenerationJob(ctx.restaurant.id);
  if (job.status === "running") {
    return NextResponse.json({ generation: job }, { status: 202 });
  }

  // Fire and forget — the job records its own progress. Fine on a long-lived
  // Node server; a serverless deploy would move this to a queue.
  void runMenuGeneration(ctx.session.userId, ctx.restaurant.id);

  return NextResponse.json(
    { generation: getGenerationJob(ctx.restaurant.id) },
    { status: 202 },
  );
}
