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

async function requirePaymentManager(req: Request, storeId: string) {
  const user = await bkashPaymentConnectionRouteDeps.getAuthenticatedUser(req);
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const supabaseAdmin = bkashPaymentConnectionRouteDeps.getSupabaseAdminClient();
  const authorized = await bkashPaymentConnectionRouteDeps.canManageStore(
    supabaseAdmin,
    storeId,
    user.id,
    ["owner", "admin"],
  );

  if (!authorized) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { supabaseAdmin, userId: user.id };
}

function readStoreIdFromUrl(req: Request) {
  return new URL(req.url).searchParams.get("storeId")?.trim() ?? "";
}

async function readConnection(supabaseAdmin: any, storeId: string) {
  const { data, error } = await supabaseAdmin
    .from("store_payment_connections_secure")
    .select("id, store_id, provider, status, public_metadata, secret_payload, created_at, updated_at, revoked_at")
    .eq("store_id", storeId)
    .eq("provider", "bkash")
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as BkashPaymentConnectionRow | null;
}

export async function GET(req: Request) {
  try {
    const storeId = readStoreIdFromUrl(req);
    if (!storeId) {
      return NextResponse.json({ error: "Missing storeId" }, { status: 400 });
    }

    const guard = await requirePaymentManager(req, storeId);
    if ("error" in guard) return guard.error;

    const connection = await readConnection(guard.supabaseAdmin as any, storeId);
    return NextResponse.json({ connection: buildBkashConnectionResponse(connection) });
  } catch (error) {
    console.error("bKash payment connection load error:", error);
    return NextResponse.json({ error: "Failed to load bKash payment connection" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const storeId = typeof body?.storeId === "string" ? body.storeId.trim() : "";
    if (!storeId) {
      return NextResponse.json({ error: "Missing storeId" }, { status: 400 });
    }

    const guard = await requirePaymentManager(req, storeId);
    if ("error" in guard) return guard.error;

    const { publicMetadata, secretPayload } = splitBkashConnectionSettings(body?.settings);
    if (!hasCompleteBkashSecrets(secretPayload)) {
      return NextResponse.json({ error: "Add app key, app secret, username, and password before connecting bKash." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data, error } = await (guard.supabaseAdmin as any)
      .from("store_payment_connections_secure")
      .upsert(
        {
          store_id: storeId,
          provider: "bkash",
          status: "connected",
          public_metadata: publicMetadata,
          secret_payload: secretPayload,
          created_by: guard.userId,
          updated_by: guard.userId,
          revoked_by: null,
          revoked_at: null,
          updated_at: now,
        },
        { onConflict: "store_id,provider" },
      )
      .select("id, store_id, provider, status, public_metadata, secret_payload, created_at, updated_at, revoked_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, connection: buildBkashConnectionResponse(data as BkashPaymentConnectionRow) });
  } catch (error) {
    console.error("bKash payment connection save error:", error);
    return NextResponse.json({ error: "Failed to save bKash payment connection" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const storeId = typeof body?.storeId === "string" ? body.storeId.trim() : "";
    if (!storeId) {
      return NextResponse.json({ error: "Missing storeId" }, { status: 400 });
    }

    const guard = await requirePaymentManager(req, storeId);
    if ("error" in guard) return guard.error;

    const existing = await readConnection(guard.supabaseAdmin as any, storeId);
    const { publicMetadata, secretPayload } = splitBkashConnectionSettings(body?.settings);
    const mergedSecrets = { ...safeObject(existing?.secret_payload), ...secretPayload };

    if (!hasCompleteBkashSecrets(mergedSecrets)) {
      return NextResponse.json({ error: "Stored bKash credentials are incomplete." }, { status: 400 });
    }

    const { data, error } = await (guard.supabaseAdmin as any)
      .from("store_payment_connections_secure")
      .upsert(
        {
          store_id: storeId,
          provider: "bkash",
          status: "connected",
          public_metadata: { ...safeObject(existing?.public_metadata), ...publicMetadata },
          secret_payload: mergedSecrets,
          updated_by: guard.userId,
          revoked_by: null,
          revoked_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "store_id,provider" },
      )
      .select("id, store_id, provider, status, public_metadata, secret_payload, created_at, updated_at, revoked_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, connection: buildBkashConnectionResponse(data as BkashPaymentConnectionRow) });
  } catch (error) {
    console.error("bKash payment connection rotate error:", error);
    return NextResponse.json({ error: "Failed to rotate bKash payment connection" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const storeId = readStoreIdFromUrl(req);
    if (!storeId) {
      return NextResponse.json({ error: "Missing storeId" }, { status: 400 });
    }

    const guard = await requirePaymentManager(req, storeId);
    if ("error" in guard) return guard.error;

    const { data, error } = await (guard.supabaseAdmin as any)
      .from("store_payment_connections_secure")
      .update({
        status: "revoked",
        secret_payload: {},
        revoked_by: guard.userId,
        revoked_at: new Date().toISOString(),
        updated_by: guard.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("store_id", storeId)
      .eq("provider", "bkash")
      .select("id, store_id, provider, status, public_metadata, secret_payload, created_at, updated_at, revoked_at")
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ success: true, connection: buildBkashConnectionResponse(data as BkashPaymentConnectionRow | null) });
  } catch (error) {
    console.error("bKash payment connection revoke error:", error);
    return NextResponse.json({ error: "Failed to revoke bKash payment connection" }, { status: 500 });
  }
}
