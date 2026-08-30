import JSZip from "jszip";
import {
  storeBackupPackageSchema,
  type StoreBackupPackage,
  type StoreBackupMediaFile,
} from "@/lib/store-backup";

const MIB = 1024 * 1024;
export const ATOMIC_RESTORE_MAX_MEDIA_FILES = 200;
export const ATOMIC_RESTORE_MAX_MEDIA_BYTES = 250 * MIB;
export const ATOMIC_RESTORE_MAX_IMAGE_BYTES = 10 * MIB;
export const ATOMIC_RESTORE_MAX_VIDEO_BYTES = 50 * MIB;

export type AtomicRestoreMediaFile = {
  originalUrl: string;
  fileName: string;
  mimeType?: string;
  resourceType: "image" | "video";
  folder: string;
  declaredBytes: number;
  blob?: Blob;
  dataUrl?: string;
};

export type AtomicRestorePackage = Omit<StoreBackupPackage, "mediaFiles"> & {
  mediaFiles: AtomicRestoreMediaFile[];
};

export type AtomicRestoreManifest = Omit<StoreBackupPackage, "mediaFiles"> & {
  mediaFiles: Array<{
    originalUrl: string;
    fileName: string;
    mimeType?: string;
    resourceType: "image" | "video";
    folder: string;
    declaredBytes: number;
  }>;
};

function safeArchivePath(value: string) {
  const normalized = value.replaceAll("\\", "/");
  if (
    !normalized
    || normalized.startsWith("/")
    || normalized.split("/").some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error(`Unsafe restore archive path: ${value}`);
  }
  return normalized;
}

function estimateDataUrlBytes(dataUrl: string) {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) throw new Error("Invalid inline backup media.");
  const header = dataUrl.slice(0, comma);
  const payload = dataUrl.slice(comma + 1);
  if (!/;base64$/i.test(header)) {
    return new TextEncoder().encode(decodeURIComponent(payload)).byteLength;
  }
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
}

function validateMediaSize(media: Pick<AtomicRestoreMediaFile, "fileName" | "resourceType" | "declaredBytes">) {
  const max = media.resourceType === "video"
    ? ATOMIC_RESTORE_MAX_VIDEO_BYTES
    : ATOMIC_RESTORE_MAX_IMAGE_BYTES;
  if (media.declaredBytes <= 0 || media.declaredBytes > max) {
    throw new Error(
      `${media.fileName} exceeds the ${media.resourceType === "video" ? "50 MiB" : "10 MiB"} restore media limit.`,
    );
  }
}

function validateMediaCount(mediaFiles: StoreBackupMediaFile[]) {
  if (mediaFiles.length > ATOMIC_RESTORE_MAX_MEDIA_FILES) {
    throw new Error(`Backup contains more than ${ATOMIC_RESTORE_MAX_MEDIA_FILES} packaged media files.`);
  }
}

function addAggregate(current: number, next: number) {
  const total = current + next;
  if (total > ATOMIC_RESTORE_MAX_MEDIA_BYTES) {
    throw new Error("Packaged restore media exceeds the 250 MiB aggregate limit.");
  }
  return total;
}

export async function parseBackupFileForAtomicRestore(file: File): Promise<AtomicRestorePackage> {
  if (file.name.toLowerCase().endsWith(".zip")) {
    const zip = await JSZip.loadAsync(file);
    const manifestText = await zip.file("backup.json")?.async("string");
    if (!manifestText) throw new Error("ZIP backup is missing backup.json");

    const manifest = storeBackupPackageSchema.parse(JSON.parse(manifestText));
    validateMediaCount(manifest.mediaFiles);

    const mediaFiles: AtomicRestoreMediaFile[] = [];
    let aggregateBytes = 0;

    for (const media of manifest.mediaFiles) {
      if (!media.archivePath) {
        throw new Error(`ZIP media ${media.fileName} is missing its archive path.`);
      }
      const archivePath = safeArchivePath(media.archivePath);
      const archiveEntry = zip.file(archivePath);
      if (!archiveEntry || archiveEntry.dir) {
        throw new Error(`ZIP backup is missing ${archivePath}`);
      }

      const blob = await archiveEntry.async("blob");
      const normalized: AtomicRestoreMediaFile = {
        originalUrl: media.originalUrl,
        fileName: media.fileName,
        mimeType: media.mimeType || blob.type || undefined,
        resourceType: media.resourceType,
        folder: media.folder || "imports",
        declaredBytes: blob.size,
        blob,
      };
      validateMediaSize(normalized);
      aggregateBytes = addAggregate(aggregateBytes, normalized.declaredBytes);
      mediaFiles.push(normalized);
    }

    return { ...manifest, mediaFiles };
  }

  const manifest = storeBackupPackageSchema.parse(JSON.parse(await file.text()));
  validateMediaCount(manifest.mediaFiles);
  const mediaFiles: AtomicRestoreMediaFile[] = [];
  let aggregateBytes = 0;

  for (const media of manifest.mediaFiles) {
    if (!media.dataUrl) {
      throw new Error(`JSON backup media ${media.fileName} is missing inline content.`);
    }
    const declaredBytes = estimateDataUrlBytes(media.dataUrl);
    const normalized: AtomicRestoreMediaFile = {
      originalUrl: media.originalUrl,
      fileName: media.fileName,
      mimeType: media.mimeType,
      resourceType: media.resourceType,
      folder: media.folder || "imports",
      declaredBytes,
      dataUrl: media.dataUrl,
    };
    validateMediaSize(normalized);
    aggregateBytes = addAggregate(aggregateBytes, declaredBytes);
    mediaFiles.push(normalized);
  }

  return { ...manifest, mediaFiles };
}

export function buildAtomicRestoreManifest(backup: AtomicRestorePackage): AtomicRestoreManifest {
  return {
    version: backup.version,
    exportedAt: backup.exportedAt,
    source: backup.source,
    metadata: backup.metadata,
    data: backup.data,
    mediaFiles: backup.mediaFiles.map((media) => ({
      originalUrl: media.originalUrl,
      fileName: media.fileName,
      mimeType: media.mimeType,
      resourceType: media.resourceType,
      folder: media.folder,
      declaredBytes: media.declaredBytes,
    })),
  };
}

export async function atomicRestoreMediaToFile(media: AtomicRestoreMediaFile) {
  if (media.blob) {
    return new File([media.blob], media.fileName, {
      type: media.mimeType || media.blob.type || "application/octet-stream",
    });
  }
  if (!media.dataUrl) throw new Error(`${media.fileName} has no packaged media content.`);
  const response = await fetch(media.dataUrl);
  if (!response.ok) throw new Error(`Failed to decode packaged media ${media.fileName}.`);
  const blob = await response.blob();
  if (blob.size !== media.declaredBytes) {
    throw new Error(`Packaged media size changed for ${media.fileName}.`);
  }
  return new File([blob], media.fileName, {
    type: media.mimeType || blob.type || "application/octet-stream",
  });
}
