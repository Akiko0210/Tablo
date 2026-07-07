import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/current";
import {
  countUploadsForOwner,
  listUploadsForOwner,
  saveUpload,
} from "@/lib/uploads/store";
import { MAX_PHOTOS_PER_ACCOUNT, validateUploadFile } from "@/lib/uploads/limits";
import { limit } from "@/lib/rate-limit";

// GET /api/uploads — staff only. List the signed-in owner's photos (metadata
// only, the bytes are served by /api/uploads/[id]).
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    uploads: (await listUploadsForOwner(session.userId)).map((u) => ({
      id: u.id,
      filename: u.filename,
      url: `/api/uploads/${u.id}`,
      createdAt: u.createdAt,
    })),
  });
}

interface UploadResult {
  filename: string;
  id?: string;
  url?: string;
  error?: string;
}

// POST /api/uploads — step 2 of the wizard: guests never hit this, only
// signed-in staff uploading their own menu photos. multipart/form-data with
// one or more files under the "files" field. Each file succeeds/fails
// independently so a bad file in a batch doesn't block the rest.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rate = await limit(`uploads:${session.userId}`, 30, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many uploads — wait a minute and try again." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  // "item-image" uploads are a single photo per menu item — they don't count
  // toward the analysis-photo cap. Anything else is a "menu-photo".
  const kind = form.get("kind") === "item-image" ? "item-image" : "menu-photo";

  const existing = await countUploadsForOwner(session.userId);
  const results: UploadResult[] = [];
  let accepted = 0;

  for (const file of files) {
    const check = validateUploadFile({ type: file.type, size: file.size });
    if (!check.ok) {
      results.push({ filename: file.name, error: check.error });
      continue;
    }
    if (kind === "menu-photo" && existing + accepted >= MAX_PHOTOS_PER_ACCOUNT) {
      results.push({
        filename: file.name,
        error: `Limit of ${MAX_PHOTOS_PER_ACCOUNT} photos reached`,
      });
      continue;
    }

    const data = Buffer.from(await file.arrayBuffer());
    const saved = await saveUpload({
      ownerId: session.userId,
      kind,
      mime: file.type,
      filename: file.name,
      data,
    });
    accepted += 1;
    results.push({
      filename: file.name,
      id: saved.id,
      url: `/api/uploads/${saved.id}`,
    });
  }

  return NextResponse.json({ results });
}
