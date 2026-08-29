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

const PLATFORM_PAYMENT_MANAGER_ROLE_PRIORITY = ["admin", "co_admin", "super_admin", "billing_admin"] as const;
const connectionSelect = "id, provider, status, verification_status, last_verification_at, last_verified_at, verification_error, public_metadata, secret_payload, created_at, updated_at, revoked_at";

async function requirePlatformPaymentManager(req: Request) {
  const user = await platformBkashPaymentConnectionRouteDeps.getAuthenticatedUser(req);
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const supabaseAdmin = platformBkashPaymentConnectionRouteDeps.getSupabaseAdminClient();
  const roleQuery = supabaseAdmin.from("user_roles").select("role").eq("user_id", user.id);
  const roleLookup = typeof (roleQuery as any)?.in === "function"
    ? await (roleQuery as any).in("role", ["admin", "co_admin"]).order("created_at", { ascending: true })
    : await roleQuery;
  if (roleLookup.error) throw roleLookup.error;

  const role = Array.isArray(roleLookup.data)
    ? (PLATFORM_PAYMENT_MANAGER_ROLE_PRIORITY.find((candidate) =>
        roleLookup.data.some((row) => typeof row?.role === "string" && row.role === candidate),
      ) ?? null)
    : null;
  if (!role) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };

  return { supabaseAdmin, userId: user.id, userEmail: user.email, role };
}

async function saveConnection(req: Request, rotate: boolean) {
  const body = await req.json();
  const guard = await requirePlatformPaymentManager(req);
  if ("error" in guard) return guard.error;

  const existing = rotate ? await readPlatformBkashConnection(guard.supabaseAdmin as any) : null;
  const { publicMetadata, secretPayload } = splitPlatformBkashConnectionSettings(body?.settings);
  const mergedSecrets = rotate
    ? { ...safeObject(existing?.secret_payload), ...secretPayload }
    : secretPayload;

  if (!hasCompletePlatformBkashSecrets(mergedSecrets)) {
    return NextResponse.json({ error: "Add app key, app secret, username, and password before configuring bKash." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data, error } = await (guard.supabaseAdmin as any)
    .from("platform_payment_connections_secure")
    .upsert(
      {
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
      { onConflict: "provider" },
    )
    .select(connectionSelect)
    .single();

  if (error) throw error;
  return NextResponse.json({ success: true, connection: buildPlatformBkashConnectionResponse(data as PlatformBkashConnectionRow) });
}

export async function GET(req: Request) {
  try {
    const guard = await requirePlatformPaymentManager(req);
    if ("error" in guard) return guard.error;
    return NextResponse.json({ connection: buildPlatformBkashConnectionResponse(await readPlatformBkashConnection(guard.supabaseAdmin as any)) });
  } catch (error) {
    console.error("Platform bKash connection load error:", error);
    return NextResponse.json({ error: "Failed to load platform bKash connection" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    return await saveConnection(req, false);
  } catch (error) {
    console.error("Platform bKash connection save error:", error);
    return NextResponse.json({ error: "Failed to save platform bKash connection" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    return await saveConnection(req, true);
  } catch (error) {
    console.error("Platform bKash connection rotate error:", error);
    return NextResponse.json({ error: "Failed to rotate platform bKash connection" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const guard = await requirePlatformPaymentManager(req);
    if ("error" in guard) return guard.error;

    const now = new Date().toISOString();
    const { data, error } = await (guard.supabaseAdmin as any)
      .from("platform_payment_connections_secure")
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
      .eq("provider", "bkash")
      .select(connectionSelect)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ success: true, connection: buildPlatformBkashConnectionResponse(data as PlatformBkashConnectionRow | null) });
  } catch (error) {
    console.error("Platform bKash connection revoke error:", error);
    return NextResponse.json({ error: "Failed to revoke platform bKash connection" }, { status: 500 });
  }
}
