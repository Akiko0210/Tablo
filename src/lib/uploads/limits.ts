// Upload constraints, enforced both client-side (nicer UX) and server-side
// (the source of truth). Pure — unit tested.

export const ALLOWED_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_PHOTOS_PER_ACCOUNT = 6;

export interface FileLike {
  type: string;
  size: number;
}

export function validateUploadFile(
  file: FileLike,
): { ok: true } | { ok: false; error: string } {
  if (!ALLOWED_IMAGE_MIME.includes(file.type)) {
    return { ok: false, error: "Unsupported file type" };
  }
  if (file.size <= 0) {
    return { ok: false, error: "File is empty" };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: "File is larger than 5MB" };
  }
  return { ok: true };
}
