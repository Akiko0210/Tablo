// In-memory blob store for uploaded menu photos. Same lifetime/HMR pattern as
// src/lib/orders/store.ts — persists while the server runs, not durable.
// Swapping to S3/blob storage later is isolated to this file.

import crypto from "node:crypto";

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
  data: Buffer;
  createdAt: string;
}

interface UploadStore {
  uploads: StoredUpload[];
}

const globalForUploads = globalThis as unknown as {
  __tabloUploadStore?: UploadStore;
};

function getStore(): UploadStore {
  if (!globalForUploads.__tabloUploadStore) {
    globalForUploads.__tabloUploadStore = { uploads: [] };
  }
  return globalForUploads.__tabloUploadStore;
}

export interface SaveUploadInput {
  ownerId: string;
  mime: string;
  filename: string;
  data: Buffer;
  /** Defaults to "menu-photo" so existing callers are unchanged. */
  kind?: UploadKind;
}

export function saveUpload(input: SaveUploadInput): StoredUpload {
  const upload: StoredUpload = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    kind: input.kind ?? "menu-photo",
  };
  getStore().uploads.push(upload);
  return upload;
}

export function getUpload(id: string): StoredUpload | undefined {
  return getStore().uploads.find((u) => u.id === id);
}

/** Count an owner's uploads of a given kind — defaults to the analysis photos
 * so the per-account cap and Settings ignore item images. */
export function countUploadsForOwner(
  ownerId: string,
  kind: UploadKind = "menu-photo",
): number {
  return getStore().uploads.filter(
    (u) => u.ownerId === ownerId && u.kind === kind,
  ).length;
}

export function listUploadsForOwner(
  ownerId: string,
  kind: UploadKind = "menu-photo",
): StoredUpload[] {
  return getStore().uploads.filter(
    (u) => u.ownerId === ownerId && u.kind === kind,
  );
}

/** Deletes an upload, but only if it belongs to the requesting owner. */
export function deleteUpload(id: string, ownerId: string): boolean {
  const store = getStore();
  const idx = store.uploads.findIndex((u) => u.id === id && u.ownerId === ownerId);
  if (idx === -1) return false;
  store.uploads.splice(idx, 1);
  return true;
}
