import JSZip from "jszip";
import { z } from "zod";

export const storeBackupMediaFileSchema = z.object({
  originalUrl: z.string().url(),
  fileName: z.string().min(1),
  mimeType: z.string().optional(),
  resourceType: z.enum(["image", "video"]).default("image"),
  folder: z.string().default("imports"),
  dataUrl: z.string().min(1).optional(),
  archivePath: z.string().min(1).optional(),
}).refine((value) => Boolean(value.dataUrl || value.archivePath), {
  message: "A backup media file needs either dataUrl or archivePath.",
});

export const storeBackupPackageSchema = z.object({
  version: z.enum(["2026-07-02", "2026-07-26"]),
  exportedAt: z.string(),
  source: z.object({
    storeId: z.string(),
    storeSlug: z.string(),
    storeName: z.string(),
  }),
  metadata: z.object({
    includedOperationalData: z.boolean().optional(),
    includedAccessData: z.boolean().optional(),
    includedMediaFiles: z.boolean().optional(),
    tableKeys: z.array(z.string()).optional(),
  }).optional(),
  data: z.record(z.string(), z.unknown()),
  mediaFiles: z.array(storeBackupMediaFileSchema).default([]),
});

export type StoreBackupPackage = z.infer<typeof storeBackupPackageSchema>;
export type StoreBackupMediaFile = z.infer<typeof storeBackupMediaFileSchema>;

function backupRows(data: Record<string, unknown>, key: string) {
  const value = data[key];
  return Array.isArray(value) ? value : [];
}

function backupRowId(row: unknown) {
  if (!row || typeof row !== "object") return null;
  const id = (row as Record<string, unknown>).id;
  return typeof id === "string" && id.trim() ? id : null;
}

export function assertBackupReviewReferences(data: Record<string, unknown>) {
  const productIds = new Set(backupRows(data, "products").map(backupRowId).filter((id): id is string => Boolean(id)));
  const orderIds = new Set(backupRows(data, "orders").map(backupRowId).filter((id): id is string => Boolean(id)));

  for (const [index, rawReview] of backupRows(data, "product_reviews").entries()) {
    if (!rawReview || typeof rawReview !== "object") {
      throw new Error(`Backup review ${index + 1} is malformed.`);
    }

    const review = rawReview as Record<string, unknown>;
    const productId = typeof review.product_id === "string" ? review.product_id : null;
    if (!productId || !productIds.has(productId)) {
      throw new Error(`Backup review ${index + 1} references a product that is not included in the backup.`);
    }

    if (review.order_id !== null && review.order_id !== undefined) {
      const orderId = typeof review.order_id === "string" ? review.order_id : null;
      if (!orderId || !orderIds.has(orderId)) {
        throw new Error(`Backup review ${index + 1} references an order that is not included in the backup.`);
      }
    }
  }
}

export function collectMediaUrlsFromValue(value: unknown, urls = new Set<string>()) {
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value) || value.startsWith("data:")) {
      urls.add(value);
    }
    return urls;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectMediaUrlsFromValue(item, urls));
    return urls;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectMediaUrlsFromValue(item, urls));
  }

  return urls;
}

export function replaceUrlsInValue<T>(value: T, urlMap: Map<string, string>): T {
  if (typeof value === "string") {
    return (urlMap.get(value) ?? value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => replaceUrlsInValue(item, urlMap)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, replaceUrlsInValue(item, urlMap)]),
    ) as T;
  }

  return value;
}

export function inferBackupMediaFileName(url: string) {
  try {
    const pathname = new URL(url).pathname;
    const lastSegment = pathname.split("/").filter(Boolean).pop();
    return lastSegment || `asset-${crypto.randomUUID()}`;
  } catch {
    return `asset-${crypto.randomUUID()}`;
  }
}

export function inferBackupMediaFolder(url: string) {
  const uploadMarker = "/upload/";
  const markerIndex = url.indexOf(uploadMarker);
  if (markerIndex === -1) {
    return "imports";
  }

  const remainder = url.slice(markerIndex + uploadMarker.length);
  const segments = remainder.split("/").filter(Boolean);
  const versionIndex = segments.findIndex((segment) => /^v\d+$/.test(segment));
  if (versionIndex <= 0) {
    return "imports";
  }

  const folderSegments = segments.slice(0, versionIndex);
  return folderSegments.length > 0 ? folderSegments.join("/") : "imports";
}

function dataUrlToUint8Array(dataUrl: string) {
  const [prefix, base64] = dataUrl.split(",", 2);
  if (!prefix || !base64) {
    throw new Error("Invalid data URL");
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export async function createBackupZipBlob(backupPackage: StoreBackupPackage) {
  const zip = new JSZip();
  const manifest: StoreBackupPackage = {
    ...backupPackage,
    mediaFiles: backupPackage.mediaFiles.map((mediaFile, index) => {
      const archivePath = mediaFile.archivePath || `media/${String(index + 1).padStart(3, "0")}-${mediaFile.fileName}`;
      if (mediaFile.dataUrl) {
        zip.file(archivePath, dataUrlToUint8Array(mediaFile.dataUrl), {
          binary: true,
        });
      }

      return {
        ...mediaFile,
        archivePath,
        dataUrl: undefined,
      };
    }),
  };

  zip.file("backup.json", JSON.stringify(manifest, null, 2));
  return await zip.generateAsync({ type: "blob" });
}

export async function parseBackupFile(file: File) {
  if (file.name.toLowerCase().endsWith(".zip")) {
    const zip = await JSZip.loadAsync(file);
    const manifestText = await zip.file("backup.json")?.async("string");
    if (!manifestText) {
      throw new Error("ZIP backup is missing backup.json");
    }

    const manifest = storeBackupPackageSchema.parse(JSON.parse(manifestText));
    const mediaFiles = await Promise.all(
      manifest.mediaFiles.map(async (mediaFile) => {
        if (!mediaFile.archivePath) {
          return mediaFile;
        }

        const archiveEntry = zip.file(mediaFile.archivePath);
        if (!archiveEntry) {
          throw new Error(`ZIP backup is missing ${mediaFile.archivePath}`);
        }

        const blob = await archiveEntry.async("blob");
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === "string") {
              resolve(reader.result);
            } else {
              reject(new Error(`Failed to decode ${mediaFile.archivePath}`));
            }
          };
          reader.onerror = () => reject(reader.error ?? new Error(`Failed to decode ${mediaFile.archivePath}`));
          reader.readAsDataURL(blob);
        });

        return {
          ...mediaFile,
          dataUrl,
        };
      }),
    );

    return {
      ...manifest,
      mediaFiles,
    };
  }

  return storeBackupPackageSchema.parse(JSON.parse(await file.text()));
}
