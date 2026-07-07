// Uploaded menu photos. Metadata lives in Postgres; the bytes go to R2 when
// object storage is configured (production), or into the same Postgres row as
// a zero-config dev fallback.

import crypto from "node:crypto";
import type { Upload as UploadRow } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  storageConfigured,
  storageDelete,
  storageGet,
  storagePublicUrl,
  storagePut,
} from "./storage";

/**
 * "menu-photo" = the analysis photos an owner uploads (the AI reads these, they
 * count toward the per-account cap, and show in Settings). "item-image" = a
 * photo attached to a single menu item; these are kept separate so they never
 * leak into the analysis set or the cap.
 */
export type UploadKind = "menu-photo" | "item-image";

export interface StoredUpload {
  id: string;
  ownerId: string;
  kind: UploadKind;
  mime: string;
  filename: string;
  /** Set when the bytes live in object storage. */
  storageKey?: string;
  /** Set when the bytes live in the DB row (dev fallback). */
  data?: Buffer;
  createdAt: string;
}

function toUpload(row: UploadRow): StoredUpload {
  return {
    id: row.id,
    ownerId: row.ownerId,
    kind: row.kind as UploadKind,
    mime: row.mime,
    filename: row.filename,
    storageKey: row.storageKey ?? undefined,
    data: row.data ? Buffer.from(row.data) : undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export interface SaveUploadInput {
  ownerId: string;
  mime: string;
  filename: string;
  data: Buffer;
  /** Defaults to "menu-photo" so existing callers are unchanged. */
  kind?: UploadKind;
}

export async function saveUpload(input: SaveUploadInput): Promise<StoredUpload> {
  const id = crypto.randomUUID();
  const kind = input.kind ?? "menu-photo";
  let storageKey: string | null = null;
  if (storageConfigured()) {
    storageKey = `uploads/${input.ownerId}/${id}`;
    await storagePut(storageKey, input.data, input.mime);
  }
  const row = await prisma.upload.create({
    data: {
      id,
      ownerId: input.ownerId,
      kind,
      mime: input.mime,
      filename: input.filename,
      storageKey,
      data: storageKey ? null : new Uint8Array(input.data),
    },
  });
  return toUpload(row);
}

export async function getUpload(id: string): Promise<StoredUpload | undefined> {
  const row = await prisma.upload.findUnique({ where: { id } });
  return row ? toUpload(row) : undefined;
}

/** The upload's bytes, wherever they live — for the AI analysis, which sends
 * them to the vision model as base64. */
export async function getUploadData(upload: StoredUpload): Promise<Buffer> {
  if (upload.data) return upload.data;
  if (upload.storageKey) return storageGet(upload.storageKey);
  throw new Error(`Upload ${upload.id} has no bytes`);
}

/** Public URL for the bytes when they live in object storage (served by the
 * R2 CDN); undefined when the app should stream the DB bytes itself. */
export function uploadPublicUrl(upload: StoredUpload): string | undefined {
  return upload.storageKey ? storagePublicUrl(upload.storageKey) : undefined;
}

/** Count an owner's uploads of a given kind — defaults to the analysis photos
 * so the per-account cap and Settings ignore item images. */
export async function countUploadsForOwner(
  ownerId: string,
  kind: UploadKind = "menu-photo",
): Promise<number> {
  return prisma.upload.count({ where: { ownerId, kind } });
}

export async function listUploadsForOwner(
  ownerId: string,
  kind: UploadKind = "menu-photo",
): Promise<StoredUpload[]> {
  const rows = await prisma.upload.findMany({
    where: { ownerId, kind },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toUpload);
}

/** Deletes an upload, but only if it belongs to the requesting owner. */
export async function deleteUpload(
  id: string,
  ownerId: string,
): Promise<boolean> {
  const row = await prisma.upload.findFirst({ where: { id, ownerId } });
  if (!row) return false;
  if (row.storageKey) await storageDelete(row.storageKey);
  await prisma.upload.delete({ where: { id } });
  return true;
}
