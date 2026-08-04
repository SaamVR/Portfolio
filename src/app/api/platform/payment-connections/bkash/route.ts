import { NextResponse } from "next/server";
import { getAuthenticatedUser, getSupabaseAdminClient } from "@/lib/api/supabase-route";
import {
  buildPlatformBkashConnectionResponse,
  hasCompletePlatformBkashSecrets,
  readPlatformBkashConnection,
  safeObject,
  splitPlatformBkashConnectionSettings,
  type PlatformBkashConnectionRow,
} from "@/lib/payments/platform-connections";

export const platformBkashPaymentConnectionRouteDeps = {
  getAuthenticatedUser,
  getSupabaseAdminClient,
};

async function requirePlatformPaymentManager(req: Request) {
  const user = await platformBkashPaymentConnectionRouteDeps.getAuthenticatedUser(req);
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const supabaseAdmin = platformBkashPaymentConnectionRouteDeps.getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", ["admin", "super_admin", "billing_admin"])
    .order("created_at", { ascending: true });

  if (error) throw error;

  const role = Array.isArray(data) && typeof data[0]?.role === "string" ? data[0].role : null;
  if (!role) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { supabaseAdmin, userId: user.id, userEmail: user.email, role };
}

export async function GET(req: Request) {
  try {
    const guard = await requirePlatformPaymentManager(req);
    if ("error" in guard) return guard.error;

    const connection = await readPlatformBkashConnection(guard.supabaseAdmin as any);
    return NextResponse.json({ connection: buildPlatformBkashConnectionResponse(connection) });
  } catch (error) {
    console.error("Platform bKash connection load error:", error);
    return NextResponse.json({ error: "Failed to load platform bKash connection" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const guard = await requirePlatformPaymentManager(req);
    if ("error" in guard) return guard.error;

    const { publicMetadata, secretPayload } = splitPlatformBkashConnectionSettings(body?.settings);
    if (!hasCompletePlatformBkashSecrets(secretPayload)) {
      return NextResponse.json({ error: "Add app key, app secret, username, and password before connecting bKash." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data, error } = await (guard.supabaseAdmin as any)
      .from("platform_payment_connections_secure")
      .upsert(
        {
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
        { onConflict: "provider" },
      )
      .select("id, provider, status, public_metadata, secret_payload, created_at, updated_at, revoked_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, connection: buildPlatformBkashConnectionResponse(data as PlatformBkashConnectionRow) });
  } catch (error) {
    console.error("Platform bKash connection save error:", error);
    return NextResponse.json({ error: "Failed to save platform bKash connection" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const guard = await requirePlatformPaymentManager(req);
    if ("error" in guard) return guard.error;

    const existing = await readPlatformBkashConnection(guard.supabaseAdmin as any);
    const { publicMetadata, secretPayload } = splitPlatformBkashConnectionSettings(body?.settings);
    const mergedSecrets = { ...safeObject(existing?.secret_payload), ...secretPayload };

    if (!hasCompletePlatformBkashSecrets(mergedSecrets)) {
      return NextResponse.json({ error: "Stored bKash credentials are incomplete." }, { status: 400 });
    }

    const { data, error } = await (guard.supabaseAdmin as any)
      .from("platform_payment_connections_secure")
      .upsert(
        {
          provider: "bkash",
          status: "connected",
          public_metadata: { ...safeObject(existing?.public_metadata), ...publicMetadata },
          secret_payload: mergedSecrets,
          updated_by: guard.userId,
          revoked_by: null,
          revoked_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "provider" },
      )
      .select("id, provider, status, public_metadata, secret_payload, created_at, updated_at, revoked_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, connection: buildPlatformBkashConnectionResponse(data as PlatformBkashConnectionRow) });
  } catch (error) {
    console.error("Platform bKash connection rotate error:", error);
    return NextResponse.json({ error: "Failed to rotate platform bKash connection" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const guard = await requirePlatformPaymentManager(req);
    if ("error" in guard) return guard.error;

    const { data, error } = await (guard.supabaseAdmin as any)
      .from("platform_payment_connections_secure")
      .update({
        status: "revoked",
        secret_payload: {},
        revoked_by: guard.userId,
        revoked_at: new Date().toISOString(),
        updated_by: guard.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("provider", "bkash")
      .select("id, provider, status, public_metadata, secret_payload, created_at, updated_at, revoked_at")
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ success: true, connection: buildPlatformBkashConnectionResponse(data as PlatformBkashConnectionRow | null) });
  } catch (error) {
    console.error("Platform bKash connection revoke error:", error);
    return NextResponse.json({ error: "Failed to revoke platform bKash connection" }, { status: 500 });
  }
}
