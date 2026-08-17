import { NextResponse } from "next/server";
import {
  canManageStore,
  getAuthenticatedUser,
  getSupabaseAdminClient,
} from "@/lib/api/supabase-route";
import { rateLimit } from "@/lib/rate-limit";
import { getRequestId, recordCaughtIncident } from "@/lib/platform/incident-logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MEDIA_BUCKET = "store-media";
const MAX_PROXY_BYTES = 4 * 1024 * 1024;

export const mediaProxyUploadRouteDeps = {
  getAuthenticatedUser,
  getSupabaseAdminClient,
  canManageStore,
  rateLimit,
};

export function validateProxyUploadInput(input: {
  fileSize: number;
  fileType: string;
  storeId: string;
  path: string;
}) {
  const storeId = input.storeId.trim();
  const path = input.path.trim();
  const fileType = input.fileType.trim().toLowerCase();

  if (!storeId || !path.startsWith(`stores/${storeId}/`)) {
    return { ok: false as const, status: 400, error: "Invalid upload path" };
  }

  const pathSegments = path.split("/");
  if (path.includes("\\") || pathSegments.some((segment) => segment === "." || segment === ".." || segment === "")) {
    return { ok: false as const, status: 400, error: "Invalid upload path" };
  }

  if (!Number.isFinite(input.fileSize) || input.fileSize <= 0) {
    return { ok: false as const, status: 400, error: "Missing media file size" };
  }

  if (input.fileSize > MAX_PROXY_BYTES) {
    return {
      ok: false as const,
      status: 413,
      error: "Direct storage upload failed, and this file is too large for server fallback. Try a file under 4MB or configure Cloudinary.",
    };
  }

  if (!fileType.startsWith("image/") && !fileType.startsWith("video/")) {
    return { ok: false as const, status: 415, error: "Only image or video media files are allowed" };
  }

  return { ok: true as const, contentType: fileType };
}

export async function POST(req: Request) {
  let supabaseAdmin: ReturnType<typeof getSupabaseAdminClient> | null = null;
  let requestedStoreId: string | null = null;

  try {
    const user = await mediaProxyUploadRouteDeps.getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limit = await mediaProxyUploadRouteDeps.rateLimit(`media_proxy:${user.id}`, {
      limit: 30,
      windowMs: 60_000,
    });
    if (!limit.success) {
      return NextResponse.json({ error: "Too many media upload attempts" }, { status: 429 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const storeId = String(formData.get("storeId") || "");
    const path = String(formData.get("path") || "");
    requestedStoreId = storeId || null;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing media file" }, { status: 400 });
    }

    const validation = validateProxyUploadInput({
      fileSize: file.size,
      fileType: file.type,
      storeId,
      path,
    });
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    supabaseAdmin = mediaProxyUploadRouteDeps.getSupabaseAdminClient();
    const authorized = await mediaProxyUploadRouteDeps.canManageStore(supabaseAdmin, storeId, user.id);
    if (!authorized) {
      return NextResponse.json({ error: "Store admin access required" }, { status: 403 });
    }

    const { error } = await supabaseAdmin.storage
      .from(MEDIA_BUCKET)
      .upload(path, file, {
        // Trust the uploaded File's browser/runtime MIME metadata rather than a
        // separate caller-controlled form field.
        contentType: validation.contentType,
        upsert: false,
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (supabaseAdmin) {
      await recordCaughtIncident(supabaseAdmin, {
        fingerprint: "media.proxy-upload.failure",
        severity: "warning",
        source: "media",
        title: "Media fallback upload failed",
        error,
        route: "/api/media/proxy-upload",
        storeId: requestedStoreId,
        requestId: getRequestId(req),
      });
    }
    console.error("Media proxy upload error:", error);
    return NextResponse.json({ error: "Failed to proxy media upload" }, { status: 500 });
  }
}
