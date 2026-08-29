import { NextResponse } from "next/server";
import {
  canManageStore,
  getAuthenticatedUser,
  getSupabaseAdminClient,
} from "@/lib/api/supabase-route";
import {
  requirePaymentProviderServerAdapter,
  safePaymentObject,
  type PaymentConnectionRow,
} from "@/lib/payments/provider-server";

export const paymentConnectionRouteDeps = {
  getAuthenticatedUser,
  getSupabaseAdminClient,
  canManageStore,
};

type ProviderContext = { params: Promise<{ provider: string }> };

const connectionSelect = "id, store_id, provider, status, verification_status, last_verification_at, last_verified_at, verification_error, public_metadata, secret_payload, created_at, updated_at, revoked_at";

async function resolveAdapter(context: ProviderContext) {
  const { provider } = await context.params;
  try {
    return requirePaymentProviderServerAdapter(provider);
  } catch {
    return null;
  }
}

async function requirePaymentManager(req: Request, storeId: string) {
  const user = await paymentConnectionRouteDeps.getAuthenticatedUser(req);
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const supabaseAdmin = paymentConnectionRouteDeps.getSupabaseAdminClient();
  const authorized = await paymentConnectionRouteDeps.canManageStore(
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

async function readConnection(supabaseAdmin: any, storeId: string, provider: string) {
  const { data, error } = await supabaseAdmin
    .from("store_payment_connections_secure")
    .select(connectionSelect)
    .eq("store_id", storeId)
    .eq("provider", provider)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as PaymentConnectionRow | null;
}

function unsupportedProvider() {
  return NextResponse.json({ error: "Unsupported or inactive payment provider" }, { status: 404 });
}

async function saveConnection(input: { req: Request; context: ProviderContext; rotate: boolean }) {
  const adapter = await resolveAdapter(input.context);
  if (!adapter) return unsupportedProvider();

  const body = await input.req.json();
  const storeId = typeof body?.storeId === "string" ? body.storeId.trim() : "";
  if (!storeId) return NextResponse.json({ error: "Missing storeId" }, { status: 400 });

  const guard = await requirePaymentManager(input.req, storeId);
  if ("error" in guard) return guard.error;

  const existing = input.rotate
    ? await readConnection(guard.supabaseAdmin as any, storeId, adapter.manifest.id)
    : null;
  const { publicMetadata, secretPayload } = adapter.splitConnectionSettings(body?.settings);
  const mergedSecrets = input.rotate
    ? { ...safePaymentObject(existing?.secret_payload), ...secretPayload }
    : secretPayload;

  if (!adapter.hasCompleteSecrets(mergedSecrets)) {
    return NextResponse.json({ error: adapter.incompleteConnectionMessage }, { status: 400 });
  }

  const mergedMetadata = input.rotate
    ? { ...safePaymentObject(existing?.public_metadata), ...publicMetadata }
    : publicMetadata;
  const now = new Date().toISOString();
  const { data, error } = await (guard.supabaseAdmin as any)
    .from("store_payment_connections_secure")
    .upsert(
      {
        store_id: storeId,
        provider: adapter.manifest.id,
        status: "configured",
        verification_status: "not_checked",
        last_verification_at: null,
        last_verified_at: null,
        verification_error: null,
        public_metadata: mergedMetadata,
        secret_payload: mergedSecrets,
        ...(input.rotate ? {} : { created_by: guard.userId }),
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
  return NextResponse.json({ success: true, connection: adapter.buildConnectionResponse(data as PaymentConnectionRow) });
}

export async function GET(req: Request, context: ProviderContext) {
  try {
    const adapter = await resolveAdapter(context);
    if (!adapter) return unsupportedProvider();

    const storeId = readStoreIdFromUrl(req);
    if (!storeId) return NextResponse.json({ error: "Missing storeId" }, { status: 400 });

    const guard = await requirePaymentManager(req, storeId);
    if ("error" in guard) return guard.error;

    const connection = await readConnection(guard.supabaseAdmin as any, storeId, adapter.manifest.id);
    return NextResponse.json({ connection: adapter.buildConnectionResponse(connection) });
  } catch (error) {
    console.error("Payment provider connection load error:", error);
    return NextResponse.json({ error: "Failed to load payment provider connection" }, { status: 500 });
  }
}

export async function PUT(req: Request, context: ProviderContext) {
  try {
    return await saveConnection({ req, context, rotate: false });
  } catch (error) {
    console.error("Payment provider connection save error:", error);
    return NextResponse.json({ error: "Failed to save payment provider connection" }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: ProviderContext) {
  try {
    return await saveConnection({ req, context, rotate: true });
  } catch (error) {
    console.error("Payment provider connection rotate error:", error);
    return NextResponse.json({ error: "Failed to rotate payment provider connection" }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: ProviderContext) {
  try {
    const adapter = await resolveAdapter(context);
    if (!adapter) return unsupportedProvider();

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
      .eq("provider", adapter.manifest.id)
      .select(connectionSelect)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ success: true, connection: adapter.buildConnectionResponse(data as PaymentConnectionRow | null) });
  } catch (error) {
    console.error("Payment provider connection revoke error:", error);
    return NextResponse.json({ error: "Failed to revoke payment provider connection" }, { status: 500 });
  }
}
