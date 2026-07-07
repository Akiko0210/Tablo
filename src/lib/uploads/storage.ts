// Object storage for upload bytes. Cloudflare R2 (S3-compatible) when the
// R2_* env vars are set; otherwise null and the store keeps bytes in Postgres
// so local dev needs zero config. Swapping providers only touches this file.

import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

interface R2Config {
  client: S3Client;
  bucket: string;
  /** Public base URL (custom domain or r2.dev) the bucket is served from. */
  publicUrl: string;
}

let cached: R2Config | null | undefined;

function r2(): R2Config | null {
  if (cached !== undefined) return cached;
  const {
    R2_ACCOUNT_ID: accountId,
    R2_ACCESS_KEY_ID: accessKeyId,
    R2_SECRET_ACCESS_KEY: secretAccessKey,
    R2_BUCKET: bucket,
    R2_PUBLIC_URL: publicUrl,
  } = process.env;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    cached = null;
    return null;
  }
  cached = {
    client: new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    }),
    bucket,
    publicUrl: publicUrl.replace(/\/$/, ""),
  };
  return cached;
}

export function storageConfigured(): boolean {
  return r2() !== null;
}

export async function storagePut(
  key: string,
  data: Buffer,
  mime: string,
): Promise<void> {
  const cfg = r2();
  if (!cfg) throw new Error("Object storage is not configured");
  await cfg.client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: data,
      ContentType: mime,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

export async function storageGet(key: string): Promise<Buffer> {
  const cfg = r2();
  if (!cfg) throw new Error("Object storage is not configured");
  const res = await cfg.client.send(
    new GetObjectCommand({ Bucket: cfg.bucket, Key: key }),
  );
  const bytes = await res.Body?.transformToByteArray();
  if (!bytes) throw new Error(`Empty object: ${key}`);
  return Buffer.from(bytes);
}

export async function storageDelete(key: string): Promise<void> {
  const cfg = r2();
  if (!cfg) return;
  await cfg.client.send(
    new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }),
  );
}

export function storagePublicUrl(key: string): string {
  const cfg = r2();
  if (!cfg) throw new Error("Object storage is not configured");
  return `${cfg.publicUrl}/${key}`;
}
