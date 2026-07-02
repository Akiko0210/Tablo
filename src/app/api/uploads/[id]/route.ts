import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/current";
import { deleteUpload, getUpload } from "@/lib/uploads/store";

// GET /api/uploads/[id] — public (so a plain <img src> works). Ids are
// unguessable UUIDs, which is an adequate bar for demo menu photos.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const upload = getUpload(id);
  if (!upload) {
    return new NextResponse("Not found", { status: 404 });
  }
  return new NextResponse(new Uint8Array(upload.data), {
    headers: {
      "Content-Type": upload.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

// DELETE /api/uploads/[id] — staff only, and only the owner of the upload.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const ok = deleteUpload(id, session.userId);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
