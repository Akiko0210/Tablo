// In-memory blob store for uploaded menu photos. Same lifetime/HMR pattern as
// src/lib/orders/store.ts — persists while the server runs, not durable.
// Swapping to S3/blob storage later is isolated to this file.

import crypto from "node:crypto";

export interface StoredUpload {
  id: string;
  ownerId: string;
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
}

export function saveUpload(input: SaveUploadInput): StoredUpload {
  const upload: StoredUpload = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };
  getStore().uploads.push(upload);
  return upload;
}

export function getUpload(id: string): StoredUpload | undefined {
  return getStore().uploads.find((u) => u.id === id);
}

export function countUploadsForOwner(ownerId: string): number {
  return getStore().uploads.filter((u) => u.ownerId === ownerId).length;
}

export function listUploadsForOwner(ownerId: string): StoredUpload[] {
  return getStore().uploads.filter((u) => u.ownerId === ownerId);
}

/** Deletes an upload, but only if it belongs to the requesting owner. */
export function deleteUpload(id: string, ownerId: string): boolean {
  const store = getStore();
  const idx = store.uploads.findIndex((u) => u.id === id && u.ownerId === ownerId);
  if (idx === -1) return false;
  store.uploads.splice(idx, 1);
  return true;
}
