import { NextResponse } from "next/server";
import {
  canManageStore,
  getAuthenticatedUser,
  getSupabaseAdminClient,
} from "@/lib/api/supabase-route";
import {
  buildBkashConnectionResponse,
  hasCompleteBkashSecrets,
  safeObject,
  splitBkashConnectionSettings,
  type BkashPaymentConnectionRow,
} from "@/lib/payments/merchant-connections";

export const bkashPaymentConnectionRouteDeps = {
  getAuthenticatedUser,
  getSupabaseAdminClient,
  canManageStore,
};

const connectionSelect = "id, store_id, provider, status, verification_status, last_verification_at, last_verified_at, verification_error, public_metadata, secret_payload, created_at, updated_at, revoked_at";

async function requirePaymentManager(req: Request, storeId: string) {
  const user = await bkashPaymentConnectionRouteDeps.getAuthenticatedUser(req);
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const supabaseAdmin = bkashPaymentConnectionRouteDeps.getSupabaseAdminClient();
  const authorized = await bkashPaymentConnectionRouteDeps.canManageStore(
    supabaseAdmin,
    storeId,
    user.id,
    ["owner", "admin"],
  );
  if (!authorized) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };

  return { supabaseAdmin, userId: user.id };
}

function readStoreIdFromUrl(req: Request) {
  return new URL(req.url).searchParams.get("storeId")?.trim() ?? "";
}

async function readConnection(supabaseAdmin: any, storeId: string) {
  const { data, error } = await supabaseAdmin
    .from("store_payment_connections_secure")
    .select(connectionSelect)
    .eq("store_id", storeId)
    .eq("provider", "bkash")
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as BkashPaymentConnectionRow | null;
}

async function saveConnection(req: Request, rotate: boolean) {
  const body = await req.json();
  const storeId = typeof body?.storeId === "string" ? body.storeId.trim() : "";
  if (!storeId) return NextResponse.json({ error: "Missing storeId" }, { status: 400 });

  const guard = await requirePaymentManager(req, storeId);
  if ("error" in guard) return guard.error;

  const existing = rotate ? await readConnection(guard.supabaseAdmin as any, storeId) : null;
  const { publicMetadata, secretPayload } = splitBkashConnectionSettings(body?.settings);
  const mergedSecrets = rotate
    ? { ...safeObject(existing?.secret_payload), ...secretPayload }
    : secretPayload;
  if (!hasCompleteBkashSecrets(mergedSecrets)) {
    return NextResponse.json({ error: "Add app key, app secret, username, and password before configuring bKash." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data, error } = await (guard.supabaseAdmin as any)
    .from("store_payment_connections_secure")
    .upsert(
      {
        store_id: storeId,
        provider: "bkash",
        status: "configured",
        verification_status: "not_checked",
        last_verification_at: null,
        last_verified_at: null,
        verification_error: null,
        public_metadata: rotate ? { ...safeObject(existing?.public_metadata), ...publicMetadata } : publicMetadata,
        secret_payload: mergedSecrets,
        ...(rotate ? {} : { created_by: guard.userId }),
        updated_by: guard.userId,
        revoked_by: null,
        revoked_at: null,
        updated_at: now,
      },
      { onConflict: "store_id,provider" },
    )
    .select(connectionSelect)
    .single();

  if (error) throw error;
  return NextResponse.json({ success: true, connection: buildBkashConnectionResponse(data as BkashPaymentConnectionRow) });
}

export async function GET(req: Request) {
  try {
    const storeId = readStoreIdFromUrl(req);
    if (!storeId) return NextResponse.json({ error: "Missing storeId" }, { status: 400 });
    const guard = await requirePaymentManager(req, storeId);
    if ("error" in guard) return guard.error;
    return NextResponse.json({ connection: buildBkashConnectionResponse(await readConnection(guard.supabaseAdmin as any, storeId)) });
  } catch (error) {
    console.error("bKash payment connection load error:", error);
    return NextResponse.json({ error: "Failed to load bKash payment connection" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    return await saveConnection(req, false);
  } catch (error) {
    console.error("bKash payment connection save error:", error);
    return NextResponse.json({ error: "Failed to save bKash payment connection" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    return await saveConnection(req, true);
  } catch (error) {
    console.error("bKash payment connection rotate error:", error);
    return NextResponse.json({ error: "Failed to rotate bKash payment connection" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const storeId = readStoreIdFromUrl(req);
    if (!storeId) return NextResponse.json({ error: "Missing storeId" }, { status: 400 });
    const guard = await requirePaymentManager(req, storeId);
    if ("error" in guard) return guard.error;

    const now = new Date().toISOString();
    const { data, error } = await (guard.supabaseAdmin as any)
      .from("store_payment_connections_secure")
      .update({
        status: "revoked",
        verification_status: "not_checked",
        last_verification_at: null,
        last_verified_at: null,
        verification_error: null,
        secret_payload: {},
        revoked_by: guard.userId,
        revoked_at: now,
        updated_by: guard.userId,
        updated_at: now,
      })
      .eq("store_id", storeId)
      .eq("provider", "bkash")
      .select(connectionSelect)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ success: true, connection: buildBkashConnectionResponse(data as BkashPaymentConnectionRow | null) });
  } catch (error) {
    console.error("bKash payment connection revoke error:", error);
    return NextResponse.json({ error: "Failed to revoke bKash payment connection" }, { status: 500 });
  }
}
