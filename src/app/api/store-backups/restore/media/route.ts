import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageStore, getAuthenticatedUser, getSupabaseAdminClient } from "@/lib/api/supabase-route";
import { rateLimit } from "@/lib/rate-limit";
import { MAX_RESTORE_IMAGE_BYTES, MAX_RESTORE_VIDEO_BYTES } from "@/lib/store-backup-restore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MEDIA_BUCKET = "store-media";
const mediaRequestSchema = z.object({
  operationId: z.string().uuid(),
  originalUrl: z.string().url(),
  fileName: z.string().min(1).max(160),
  mimeType: z.string().max(160).default(""),
  resourceType: z.enum(["image", "video"]),
  declaredBytes: z.number().int().positive().max(MAX_RESTORE_VIDEO_BYTES),
});

function safeFileName(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9._-]/g, "-").replace(/^[-.]+/, "").slice(0, 120) || "restore-media";
}

async function ensureMediaBucket(admin: ReturnType<typeof getSupabaseAdminClient>) {
  const { data } = await admin.storage.getBucket(MEDIA_BUCKET);
  if (data) return;
  const { error } = await admin.storage.createBucket(MEDIA_BUCKET, {
    public: true,
    fileSizeLimit: `${MAX_RESTORE_VIDEO_BYTES}`,
  });
  if (error && !/already exists/i.test(error.message)) throw error;
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const limit = await rateLimit(`store_restore_media:${user.id}`, { limit: 240, windowMs: 60_000 });
    if (!limit.success) return NextResponse.json({ error: "Too many restore media signing attempts" }, { status: 429 });

    const input = mediaRequestSchema.parse(await req.json());
    if (input.mimeType) {
      const expectedMime = input.resourceType === "video" ? "video/" : "image/";
      if (!input.mimeType.toLowerCase().startsWith(expectedMime)) {
        return NextResponse.json({ error: `Restore ${input.resourceType} MIME type does not match its declared resource type.` }, { status: 415 });
      }
    }
    const perFileMax = input.resourceType === "video" ? MAX_RESTORE_VIDEO_BYTES : MAX_RESTORE_IMAGE_BYTES;
    if (input.declaredBytes > perFileMax) {
      return NextResponse.json({ error: "Restore media exceeds its per-file limit." }, { status: 413 });
    }

    const admin = getSupabaseAdminClient();
    const { data: operation, error: operationError } = await admin
      .from("store_backup_events")
      .select("id,target_store_id,actor_user_id,status,lifecycle_managed,metadata")
      .eq("id", input.operationId)
      .eq("lifecycle_managed", true)
      .maybeSingle();
    if (operationError) throw operationError;
    if (!operation?.target_store_id) return NextResponse.json({ error: "Restore operation not found" }, { status: 404 });
    if (operation.actor_user_id !== user.id) return NextResponse.json({ error: "Restore actor mismatch" }, { status: 403 });
    if (!["preflight", "staging"].includes(String(operation.status))) {
      return NextResponse.json({ error: "Restore operation is not accepting media" }, { status: 409 });
    }

    const allowed = await canManageStore(admin, operation.target_store_id, user.id, ["owner", "admin"]);
    if (!allowed) return NextResponse.json({ error: "Store owner or admin access required" }, { status: 403 });

    await ensureMediaBucket(admin);
    const fileName = safeFileName(input.fileName);
    const proposedPath = `stores/${operation.target_store_id}/restore/${input.operationId}/${crypto.randomUUID()}-${fileName}`;
    const { data: publicUrl } = admin.storage.from(MEDIA_BUCKET).getPublicUrl(proposedPath);
    const proposedAsset = {
      id: crypto.randomUUID(),
      url: publicUrl.publicUrl,
      resourceType: input.resourceType,
      folder: `restore/${input.operationId}`,
      bytes: input.declaredBytes,
      format: fileName.includes(".") ? fileName.split(".").pop() : undefined,
      publicId: proposedPath,
      originalFilename: fileName,
      createdAt: new Date().toISOString(),
      uploadedBy: user.id,
    };

    const allocation = await (admin as any).rpc("allocate_store_restore_media", {
      p_operation_id: input.operationId,
      p_actor_id: user.id,
      p_original_url: input.originalUrl,
      p_object_path: proposedPath,
      p_declared_bytes: input.declaredBytes,
      p_asset: proposedAsset,
    });
    if (allocation.error) throw allocation.error;
    const allocated = Array.isArray(allocation.data) ? allocation.data[0] : allocation.data;
    if (!allocated?.object_path || !allocated?.asset) throw new Error("Restore media allocation returned no object path.");

    const { data: signed, error: signedError } = await admin.storage
      .from(MEDIA_BUCKET)
      .createSignedUploadUrl(String(allocated.object_path));
    if (signedError || !signed) throw signedError ?? new Error("Failed to sign restore media upload");

    return NextResponse.json({
      bucket: MEDIA_BUCKET,
      path: allocated.object_path,
      token: signed.token,
      asset: allocated.asset,
    });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message || "Invalid restore media request"
      : error instanceof Error ? error.message.slice(0, 300) : "Restore media signing failed";
    console.error("Restore media signing failed:", message);
    return NextResponse.json({ error: message }, { status: error instanceof z.ZodError ? 400 : 500 });
  }
}
