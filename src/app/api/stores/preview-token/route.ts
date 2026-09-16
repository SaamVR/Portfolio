import {
  canManageStore,
  getAuthenticatedUser,
  getSupabaseAdminClient,
} from "@/lib/api/supabase-route";
import { jsonNoStore } from "@/lib/http/cache-control";
import { buildStorePreviewUrl } from "@/lib/cms/preview-token";

const PREVIEW_TTL_MS = 24 * 60 * 60 * 1000;

export const storePreviewTokenRouteDeps = {
  getAuthenticatedUser,
  getSupabaseAdminClient,
  canManageStore,
  now: () => Date.now(),
};

export async function POST(req: Request) {
  try {
    const user = await storePreviewTokenRouteDeps.getAuthenticatedUser(req);
    if (!user) {
      return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const storeId = typeof body?.storeId === "string" ? body.storeId.trim() : "";
    if (!storeId) {
      return jsonNoStore({ error: "Missing storeId" }, { status: 400 });
    }

    const supabaseAdmin = storePreviewTokenRouteDeps.getSupabaseAdminClient();
    const authorized = await storePreviewTokenRouteDeps.canManageStore(
      supabaseAdmin,
      storeId,
      user.id,
      ["owner", "admin"],
    );
    if (!authorized) {
      return jsonNoStore({ error: "Forbidden" }, { status: 403 });
    }

    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("id, slug")
      .eq("id", storeId)
      .maybeSingle();

    if (storeError) throw storeError;
    if (!store?.slug) {
      return jsonNoStore({ error: "Store not found" }, { status: 404 });
    }

    const now = new Date(storePreviewTokenRouteDeps.now());
    const expiresAt = new Date(now.getTime() + PREVIEW_TTL_MS).toISOString();

    // Opportunistic cleanup keeps the table bounded without a scheduled job.
    await supabaseAdmin
      .from("store_preview_tokens")
      .delete()
      .eq("store_id", storeId)
      .lt("expires_at", now.toISOString());

    const { data: tokenRow, error: tokenError } = await supabaseAdmin
      .from("store_preview_tokens")
      .insert({
        store_id: storeId,
        created_by: user.id,
        expires_at: expiresAt,
      })
      .select("id, expires_at")
      .single();

    if (tokenError) throw tokenError;
    if (!tokenRow?.id) {
      return jsonNoStore({ error: "Failed to create preview token" }, { status: 500 });
    }

    return jsonNoStore({
      previewUrl: buildStorePreviewUrl(String(store.slug), String(tokenRow.id)),
      expiresAt: String(tokenRow.expires_at ?? expiresAt),
    });
  } catch (error) {
    console.error("Store preview token error:", error);
    return jsonNoStore({ error: "Failed to create store preview" }, { status: 500 });
  }
}
