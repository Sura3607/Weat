/**
 * Storage abstraction: AWS S3 direct → Manus Forge fallback → Local filesystem fallback
 */
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";
import fs from "fs";
import path from "path";

// ─── S3 Direct Mode ───────────────────────────────────────────────

function getS3Client(): S3Client | null {
  if (!ENV.s3AccessKey || !ENV.s3SecretKey || !ENV.s3Bucket) return null;

  const config: ConstructorParameters<typeof S3Client>[0] = {
    region: ENV.s3Region || "ap-southeast-1",
    credentials: {
      accessKeyId: ENV.s3AccessKey,
      secretAccessKey: ENV.s3SecretKey,
    },
  };

  if (ENV.s3Endpoint) {
    config.endpoint = ENV.s3Endpoint;
    config.forcePathStyle = true;
  }

  return new S3Client(config);
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

// ─── Manus Forge Storage (fallback) ──────────────────────────────

function getForgeConfig(): { baseUrl: string; apiKey: string } | null {
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) return null;
  return { baseUrl: ENV.forgeApiUrl.replace(/\/+$/, ""), apiKey: ENV.forgeApiKey };
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

// ─── Local Filesystem Storage (development fallback) ─────────────

const LOCAL_STORAGE_DIR = path.resolve(
  import.meta.dirname || process.cwd(),
  "..",
  "..",
  "uploads"
);

function ensureLocalStorageDir(key: string): string {
  const fullPath = path.join(LOCAL_STORAGE_DIR, key);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return fullPath;
}

// ─── Public API ──────────────────────────────────────────────────

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);

  // Try S3 direct first
  const s3 = getS3Client();
  if (s3) {
    const body = typeof data === "string" ? Buffer.from(data) : data;
    await s3.send(
      new PutObjectCommand({
        Bucket: ENV.s3Bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );

    // Build public URL
    let url: string;
    if (ENV.s3PublicUrl) {
      url = `${ENV.s3PublicUrl.replace(/\/+$/, "")}/${key}`;
    } else if (ENV.s3Endpoint) {
      url = `${ENV.s3Endpoint.replace(/\/+$/, "")}/${ENV.s3Bucket}/${key}`;
    } else {
      url = `https://${ENV.s3Bucket}.s3.${ENV.s3Region}.amazonaws.com/${key}`;
    }

    return { key, url };
  }

  // Fallback to Manus Forge
  const forge = getForgeConfig();
  if (forge) {
    const uploadUrl = new URL("v1/storage/upload", ensureTrailingSlash(forge.baseUrl));
    uploadUrl.searchParams.set("path", key);

    const blob =
      typeof data === "string"
        ? new Blob([data], { type: contentType })
        : new Blob([data as any], { type: contentType });
    const form = new FormData();
    form.append("file", blob, key.split("/").pop() ?? key);

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: buildAuthHeaders(forge.apiKey),
      body: form,
    });

    if (!response.ok) {
      const message = await response.text().catch(() => response.statusText);
      throw new Error(`Storage upload failed (${response.status}): ${message}`);
    }

    const result = await response.json();
    return { key, url: result.url };
  }

  // Final fallback: Local filesystem storage (for development)
  console.log(`[Storage] Using local filesystem fallback: ${key}`);
  const fullPath = ensureLocalStorageDir(key);
  const buffer = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
  fs.writeFileSync(fullPath, buffer);

  // Return a URL that the server can serve via the /uploads static route
  const url = `/uploads/${key}`;
  return { key, url };
}

export async function storageGet(
  relKey: string,
  expiresIn = 3600
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);

  // Try S3 direct first
  const s3 = getS3Client();
  if (s3) {
    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: ENV.s3Bucket, Key: key }),
      { expiresIn }
    );
    return { key, url };
  }

  // Fallback to Manus Forge
  const forge = getForgeConfig();
  if (forge) {
    const downloadUrl = new URL("v1/storage/downloadUrl", ensureTrailingSlash(forge.baseUrl));
    downloadUrl.searchParams.set("path", key);
    const response = await fetch(downloadUrl, {
      method: "GET",
      headers: buildAuthHeaders(forge.apiKey),
    });
    const result = await response.json();
    return { key, url: result.url };
  }

  // Local filesystem fallback
  const url = `/uploads/${key}`;
  return { key, url };
}

/**
 * Get the local storage directory path (for Express static serving)
 */
export function getLocalStorageDir(): string {
  return LOCAL_STORAGE_DIR;
}
