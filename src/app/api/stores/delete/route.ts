import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  canManageStore,
  getAuthenticatedUser,
  getSupabaseAdminClient,
} from "@/lib/api/supabase-route";
import { logPlatformAuditAction } from "@/lib/platform/audit-logger";

type MerchantAccountStatusRow = {
  can_create_store?: boolean | null;
};

type TransactionalDeleteResult = {
  owner_user_id?: string | null;
  deleted_all_owned_stores?: boolean | null;
  banned?: boolean | null;
  deleted_store_id?: string | null;
};

export async function runDeleteStoreTransaction(
  supabaseAdmin: SupabaseClient,
  input: {
    storeId: string;
    actorId: string;
    actorEmail?: string | null;
    actorRole: string;
    adminNote: string;
    banMerchant: boolean;
    isPlatformAdmin: boolean;
    createdAt: string;
  },
) {
  const rpc = (supabaseAdmin as SupabaseClient & { rpc?: SupabaseClient["rpc"] }).rpc;
  if (typeof rpc !== "function") {
    return null;
  }

  const { data, error } = await rpc.call(supabaseAdmin, "delete_store_transactional", {
    p_store_id: input.storeId,
    p_actor_id: input.actorId,
    p_actor_email: input.actorEmail ?? null,
    p_actor_role: input.actorRole,
    p_admin_note: input.adminNote,
    p_ban_merchant: input.banMerchant,
    p_is_platform_admin: input.isPlatformAdmin,
    p_created_at: input.createdAt,
  });

  if (error) {
    throw error;
  }

  const row = (Array.isArray(data) ? data[0] : data) as TransactionalDeleteResult | null;
  if (!row?.deleted_store_id) {
    throw new Error("Store deletion transaction returned no result");
  }

  return {
    ownerUserId: typeof row.owner_user_id === "string" ? row.owner_user_id : null,
    deletedAllOwnedStores: row.deleted_all_owned_stores === true,
    banned: row.banned === true,
    deletedStoreId: row.deleted_store_id,
  };
}

export const deleteStoreRouteDeps = {
  getAuthenticatedUser,
  getSupabaseAdminClient,
  canManageStore,
  runDeleteStoreTransaction,
  now: () => new Date(),
};

const DELETE_STORE_PLATFORM_ROLE_PRIORITY = ["admin", "super_admin", "billing_admin", "support_agent"] as const;

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

    const [{ data: platformRoleRows }, { data: store }] = await Promise.all([
      supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id),
      supabaseAdmin
        .from("stores")
        .select("id, owner_id, name, slug")
        .eq("id", normalizedStoreId)
        .maybeSingle(),
    ]);

    const platformRole = Array.isArray(platformRoleRows)
      ? (DELETE_STORE_PLATFORM_ROLE_PRIORITY.find((candidate) =>
          platformRoleRows.some((row) => typeof row?.role === "string" && row.role === candidate),
        ) ?? null)
      : (platformRoleRows && typeof (platformRoleRows as { role?: unknown }).role === "string"
          ? (platformRoleRows as { role: string }).role
          : null);

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const isPlatformAdmin = platformRole === "admin" || platformRole === "super_admin";
    if (isPlatformAdmin && !normalizedNote) {
      return NextResponse.json({ error: "Deletion note is required for platform admins" }, { status: 400 });
    }

    const now = deleteStoreRouteDeps.now().toISOString();
    const transactionResult = await deleteStoreRouteDeps.runDeleteStoreTransaction(supabaseAdmin, {
      storeId: normalizedStoreId,
      actorId: user.id,
      actorEmail: user.email,
      actorRole: platformRole || "store_owner",
      adminNote: normalizedNote,
      banMerchant: shouldBanMerchant,
      isPlatformAdmin,
      createdAt: now,
    });

    if (transactionResult) {
      return NextResponse.json({ success: true, ...transactionResult });
    }

    // Compatibility path for minimal unit-test doubles that predate Supabase's
    // rpc() surface. A real SupabaseClient always exposes rpc(), so production
    // deletion uses delete_store_transactional above.
    const ownerUserId = typeof store.owner_id === "string" ? store.owner_id : null;
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

    const { error: deletionRecordError } = await supabaseAdmin
      .from("store_deletion_records")
      .insert({
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
      });

    if (deletionRecordError) throw deletionRecordError;

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
      if (accountStatusError) throw accountStatusError;
    }

    const { error: deleteError } = await supabaseAdmin
      .from("stores")
      .delete()
      .eq("id", store.id);
    if (deleteError) throw deleteError;

    await logPlatformAuditAction(supabaseAdmin, {
      actorId: user.id,
      actorEmail: user.email,
      actorRole: platformRole || "store_owner",
      action: "delete_store",
      targetType: "store",
      targetId: store.id,
      details: {
        store_name: store.name,
        store_slug: store.slug,
        owner_id: ownerUserId,
        banned_merchant: shouldBanMerchant,
        admin_note: normalizedNote || null,
        deletion_source: isPlatformAdmin ? "platform_admin_delete" : "merchant_self_delete",
      },
    });

    const remainingOwnedStores = ownerUserId
      ? await supabaseAdmin
          .from("stores")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", ownerUserId)
      : { count: 0, error: null };
    if (remainingOwnedStores.error) throw remainingOwnedStores.error;

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
