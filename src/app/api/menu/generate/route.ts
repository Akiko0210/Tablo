import { NextResponse, after } from "next/server";
import { getStaffContext } from "@/lib/auth/current";
import { runMenuGeneration } from "@/lib/menu/generate";
import { getGenerationJob } from "@/lib/menu/generation-store";

// GET /api/menu/generate — staff only. Poll the AI analysis status.
export async function GET() {
  const ctx = await getStaffContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    generation: await getGenerationJob(ctx.restaurant.id),
  });
}

// POST /api/menu/generate — staff only. (Re-)run the photo analysis.
export async function POST() {
  const ctx = await getStaffContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const job = await getGenerationJob(ctx.restaurant.id);
  if (job.status === "running") {
    return NextResponse.json({ generation: job }, { status: 202 });
  }

  // after() keeps the analysis running past the response on serverless — a
  // detached promise would be frozen when the function suspends. The job
  // records its own progress for the dashboard to poll.
  after(() => runMenuGeneration(ctx.session.userId, ctx.restaurant.id));

  return NextResponse.json(
    { generation: await getGenerationJob(ctx.restaurant.id) },
    { status: 202 },
  );
}
