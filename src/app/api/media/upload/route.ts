import { NextResponse } from "next/server";
import {
  canManageStore,
  getAuthenticatedUser,
  getSupabaseAdminClient,
} from "@/lib/api/supabase-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MEDIA_BUCKET = "store-media";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export const mediaUploadRouteDeps = {
  getAuthenticatedUser,
  getSupabaseAdminClient,
  canManageStore,
  randomUUID: () => crypto.randomUUID(),
};

function sanitizePathSegment(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._/-]/g, "-")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\.+/g, ".");
}

function sanitizeFileName(value: string) {
  const fallback = "upload";
  const sanitized = sanitizePathSegment(value || fallback)
    .split("/")
    .pop()
    ?.replace(/^\.+/, "") || fallback;

  return sanitized.slice(0, 120) || fallback;
}

function inferResourceType(fileType: string, requestedType: unknown): "image" | "video" {
  if (requestedType === "video") return "video";
  if (requestedType === "image") return "image";
  return fileType.startsWith("video/") ? "video" : "image";
}

async function ensureMediaBucket(supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>) {
  const { data } = await supabaseAdmin.storage.getBucket(MEDIA_BUCKET);
  if (data) return;

  const { error } = await supabaseAdmin.storage.createBucket(MEDIA_BUCKET, {
    public: true,
    fileSizeLimit: `${MAX_VIDEO_BYTES}`,
  });

  if (error && !/already exists/i.test(error.message)) {
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    const user = await mediaUploadRouteDeps.getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await req.json();
    const fileName = sanitizeFileName(String(payload.fileName || "upload"));
    const fileType = String(payload.fileType || "");
    const fileSize = Number(payload.fileSize || 0);
    const storeId = String(payload.storeId || "");
    const folder = sanitizePathSegment(String(payload.folder || "cms")) || "cms";

    if (!storeId) {
      return NextResponse.json({ error: "Missing storeId" }, { status: 400 });
    }

    const resourceType = inferResourceType(fileType, payload.resourceType);
    const maxBytes = resourceType === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return NextResponse.json({ error: "Missing media file size" }, { status: 400 });
    }

    if (fileSize > maxBytes) {
      return NextResponse.json(
        { error: `File too large. Max ${resourceType === "video" ? "50MB" : "10MB"}` },
        { status: 413 },
      );
    }

    if (resourceType === "image" && !fileType.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed here" }, { status: 400 });
    }

    if (resourceType === "video" && !fileType.startsWith("video/")) {
      return NextResponse.json({ error: "Only video files are allowed here" }, { status: 400 });
    }

    const supabaseAdmin = mediaUploadRouteDeps.getSupabaseAdminClient();
    const authorized = await mediaUploadRouteDeps.canManageStore(supabaseAdmin, storeId, user.id);
    if (!authorized) {
      return NextResponse.json({ error: "Store admin access required" }, { status: 403 });
    }

    await ensureMediaBucket(supabaseAdmin);

    const objectPath = `stores/${storeId}/${folder}/${mediaUploadRouteDeps.randomUUID()}-${fileName}`;
    const { data: signedUpload, error: signedUploadError } = await supabaseAdmin.storage
      .from(MEDIA_BUCKET)
      .createSignedUploadUrl(objectPath);

    if (signedUploadError || !signedUpload) {
      throw signedUploadError ?? new Error("Failed to create upload URL");
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(MEDIA_BUCKET)
      .getPublicUrl(objectPath);

    return NextResponse.json({
      bucket: MEDIA_BUCKET,
      path: objectPath,
      token: signedUpload.token,
      asset: {
        id: mediaUploadRouteDeps.randomUUID(),
        url: publicUrlData.publicUrl,
        resourceType,
        folder,
        bytes: fileSize,
        format: fileName.includes(".") ? fileName.split(".").pop() : undefined,
        publicId: objectPath,
        originalFilename: fileName,
        createdAt: new Date().toISOString(),
        uploadedBy: user.id,
      },
    });
  } catch (error) {
    console.error("Media upload error:", error);
    return NextResponse.json({ error: "Failed to upload media" }, { status: 500 });
  }
}
