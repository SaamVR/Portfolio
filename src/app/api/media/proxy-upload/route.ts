import { NextResponse } from "next/server";
import {
  canManageStore,
  getAuthenticatedUser,
  getSupabaseAdminClient,
} from "@/lib/api/supabase-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MEDIA_BUCKET = "store-media";
const MAX_PROXY_BYTES = 4 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const storeId = String(formData.get("storeId") || "");
    const path = String(formData.get("path") || "");
    const contentType = String(formData.get("contentType") || "application/octet-stream");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing media file" }, { status: 400 });
    }

    if (!storeId || !path.startsWith(`stores/${storeId}/`)) {
      return NextResponse.json({ error: "Invalid upload path" }, { status: 400 });
    }

    if (file.size > MAX_PROXY_BYTES) {
      return NextResponse.json(
        { error: "Direct storage upload failed, and this file is too large for server fallback. Try a file under 4MB or configure Cloudinary." },
        { status: 413 },
      );
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const authorized = await canManageStore(supabaseAdmin, storeId, user.id);
    if (!authorized) {
      return NextResponse.json({ error: "Store admin access required" }, { status: 403 });
    }

    const { error } = await supabaseAdmin.storage
      .from(MEDIA_BUCKET)
      .upload(path, file, {
        contentType,
        upsert: false,
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Media proxy upload error:", error);
    return NextResponse.json({ error: "Failed to proxy media upload" }, { status: 500 });
  }
}
