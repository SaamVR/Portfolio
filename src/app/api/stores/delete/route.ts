import { NextResponse } from "next/server";
import {
  canManageStore,
  getAuthenticatedUser,
  getSupabaseAdminClient,
} from "@/lib/api/supabase-route";

type MerchantAccountStatusRow = {
  can_create_store?: boolean | null;
};

export const deleteStoreRouteDeps = {
  getAuthenticatedUser,
  getSupabaseAdminClient,
  canManageStore,
  now: () => new Date(),
};

export async function POST(req: Request) {
  try {
    const user = await deleteStoreRouteDeps.getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { storeId, note, banMerchant } = await req.json();
    const normalizedStoreId = typeof storeId === "string" ? storeId.trim() : "";
    const normalizedNote = typeof note === "string" ? note.trim() : "";
    const shouldBanMerchant = banMerchant === true;

    if (!normalizedStoreId) {
      return NextResponse.json({ error: "Missing storeId" }, { status: 400 });
    }

    const supabaseAdmin = deleteStoreRouteDeps.getSupabaseAdminClient();
    const authorized = await deleteStoreRouteDeps.canManageStore(
      supabaseAdmin,
      normalizedStoreId,
      user.id,
      ["owner", "admin"],
    );

    if (!authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [{ data: platformRole }, { data: store }] = await Promise.all([
      supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle(),
      supabaseAdmin
        .from("stores")
        .select("id, owner_id, name, slug")
        .eq("id", normalizedStoreId)
        .maybeSingle(),
    ]);

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const isPlatformAdmin = platformRole?.role === "admin";
    if (isPlatformAdmin && !normalizedNote) {
      return NextResponse.json({ error: "Deletion note is required for platform admins" }, { status: 400 });
    }

    const ownerUserId = typeof store.owner_id === "string" ? store.owner_id : null;
    const now = deleteStoreRouteDeps.now().toISOString();

    const ownerStatusLookup = ownerUserId
      ? await supabaseAdmin
          .from("merchant_account_statuses")
          .select("can_create_store")
          .eq("user_id", ownerUserId)
          .maybeSingle()
      : { data: null, error: null };

    const ownerStatus = (ownerStatusLookup.data as MerchantAccountStatusRow | null) ?? null;
    const ownerCanCreateStore = shouldBanMerchant ? false : ownerStatus?.can_create_store !== false;

    const merchantVisibleReason = isPlatformAdmin
      ? normalizedNote
      : normalizedNote || "This site was removed from your workspace at your request.";

    const deletionRecord = {
      deleted_store_id: store.id,
      owner_user_id: ownerUserId,
      store_name: store.name,
      store_slug: store.slug,
      deletion_source: isPlatformAdmin ? "platform_admin_delete" : "merchant_self_delete",
      merchant_visible_reason: merchantVisibleReason,
      admin_note: normalizedNote || null,
      deleted_by_user_id: user.id,
      owner_can_create_store: ownerCanCreateStore,
      created_at: now,
    };

    const { error: deletionRecordError } = await supabaseAdmin
      .from("store_deletion_records")
      .insert(deletionRecord);

    if (deletionRecordError) {
      throw deletionRecordError;
    }

    if (ownerUserId && shouldBanMerchant) {
      const { error: accountStatusError } = await supabaseAdmin
        .from("merchant_account_statuses")
        .upsert(
          {
            user_id: ownerUserId,
            can_create_store: false,
            status_note: normalizedNote || "Store access was restricted by the platform team.",
            banned_at: now,
            restored_at: null,
            updated_by: user.id,
          },
          { onConflict: "user_id" },
        );

      if (accountStatusError) {
        throw accountStatusError;
      }
    }

    const { error: deleteError } = await supabaseAdmin
      .from("stores")
      .delete()
      .eq("id", store.id);

    if (deleteError) {
      throw deleteError;
    }

    const remainingOwnedStores = ownerUserId
      ? await supabaseAdmin
          .from("stores")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", ownerUserId)
      : { count: 0, error: null };

    if (remainingOwnedStores.error) {
      throw remainingOwnedStores.error;
    }

    return NextResponse.json({
      success: true,
      deletedAllOwnedStores: Boolean(ownerUserId) && (remainingOwnedStores.count ?? 0) === 0,
      ownerUserId,
      banned: shouldBanMerchant,
      deletedStoreId: store.id,
    });
  } catch (error) {
    console.error("Store deletion error:", error);
    return NextResponse.json({ error: "Failed to delete store" }, { status: 500 });
  }
}
