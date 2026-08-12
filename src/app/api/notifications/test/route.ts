import { NextResponse } from "next/server";
import {
  canManageStore,
  getAuthenticatedUser,
  getSupabaseAdminClient,
} from "@/lib/api/supabase-route";
import { dispatchNotificationDelivery } from "@/lib/notifications/notification-delivery-queue";

type PreviewChannel = "email" | "sms";
type NotificationTemplateName =
  | "welcome"
  | "test-customer-receipt"
  | "merchant-order-alert"
  | "order-shipped";

type StoreRow = {
  id: string;
  name: string;
  slug: string;
  owner_id?: string | null;
};

type PreviewRequestContext = {
  store: StoreRow;
  recipient: string;
  channel: PreviewChannel;
};

function normalizeTemplateName(value: unknown): NotificationTemplateName {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (
    normalized === "welcome" ||
    normalized === "test-customer-receipt" ||
    normalized === "merchant-order-alert" ||
    normalized === "order-shipped"
  ) {
    return normalized;
  }

  return "merchant-order-alert";
}

function normalizeChannel(value: unknown): PreviewChannel {
  return value === "sms" ? "sms" : "email";
}

function buildPreview(templateName: NotificationTemplateName, context: PreviewRequestContext) {
  const customerName = "Amina";
  const orderId = "TEST-1001";
  const total = "1,290";
  const merchantName = context.store.name || "your store";
  const base = {
    templateName,
    recipient: context.recipient,
    channel: context.channel,
  };

  if (context.channel === "sms") {
    const smsText =
      templateName === "test-customer-receipt"
        ? `Hi ${customerName}, your order #${orderId} with ${merchantName} is confirmed for ৳${total}.`
        : templateName === "order-shipped"
          ? `Hi ${customerName}, your order #${orderId} from ${merchantName} is now on the way.`
          : `Hi from ${merchantName}. This is a notification preview for ${context.recipient}.`;

    return {
      ...base,
      subject: null,
      html: null,
      smsText,
    };
  }

  const preview =
    templateName === "welcome"
      ? {
          subject: `Welcome to ${merchantName}`,
          html: `<p>Hi there,</p><p>${merchantName} is ready to start sending store updates.</p>`,
        }
      : templateName === "test-customer-receipt"
        ? {
            subject: `Order confirmation #${orderId}`,
            html: `<p>Hi ${customerName},</p><p>Your sample order #${orderId} with <strong>${merchantName}</strong> is confirmed for ৳${total}.</p>`,
          }
        : templateName === "order-shipped"
          ? {
              subject: `Your order #${orderId} is on the way`,
              html: `<p>Hi ${customerName},</p><p>Your sample order #${orderId} from <strong>${merchantName}</strong> is now marked as shipped.</p>`,
            }
          : {
              subject: `New order alert for ${merchantName}`,
              html: `<p>Merchant alert:</p><p>A sample order #${orderId} just came in for <strong>${merchantName}</strong>.</p>`,
            };

  return {
    ...base,
    ...preview,
    smsText: null,
  };
}

async function resolveAuthorizedStore(req: Request, storeId: string) {
  const user = await notificationTestRouteDeps.getAuthenticatedUser(req);
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const supabaseAdmin = notificationTestRouteDeps.getSupabaseAdminClient();
  const authorized = await notificationTestRouteDeps.canManageStore(
    supabaseAdmin,
    storeId,
    user.id,
    ["owner", "admin", "editor"],
  );

  if (!authorized) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const { data: store, error: storeError } = await supabaseAdmin
    .from("stores")
    .select("id, name, slug, owner_id")
    .eq("id", storeId)
    .maybeSingle();

  if (storeError) throw storeError;
  if (!store) {
    return { error: NextResponse.json({ error: "Store not found" }, { status: 404 }) };
  }

  return {
    user,
    supabaseAdmin,
    store: store as StoreRow,
  };
}

export const notificationTestRouteDeps = {
  getAuthenticatedUser,
  getSupabaseAdminClient,
  canManageStore,
  fetch: (...args: Parameters<typeof fetch>) => fetch(...args),
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    if (!storeId) {
      return NextResponse.json({ error: "Missing storeId" }, { status: 400 });
    }

    const resolved = await resolveAuthorizedStore(req, storeId);
    if ("error" in resolved) {
      return resolved.error;
    }

    const templateName = normalizeTemplateName(searchParams.get("templateName"));
    const channel = normalizeChannel(searchParams.get("channel"));
    const recipient = searchParams.get("recipient")?.trim() || resolved.user.email || "merchant@example.com";

    return NextResponse.json({
      success: true,
      preview: buildPreview(templateName, {
        store: resolved.store,
        recipient,
        channel,
      }),
      availableTemplates: [
        { value: "merchant-order-alert", label: "Merchant order alert" },
        { value: "test-customer-receipt", label: "Customer receipt" },
        { value: "order-shipped", label: "Order shipped update" },
        { value: "welcome", label: "Welcome message" },
      ],
    });
  } catch (error) {
    console.error("Notification preview error:", error);
    return NextResponse.json({ error: "Failed to load notification preview" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const storeId = typeof body?.storeId === "string" ? body.storeId : "";
    if (!storeId) {
      return NextResponse.json({ error: "Missing storeId" }, { status: 400 });
    }

    const resolved = await resolveAuthorizedStore(req, storeId);
    if ("error" in resolved) {
      return resolved.error;
    }

    const templateName = normalizeTemplateName(body?.templateName);
    const channel = normalizeChannel(body?.channel);
    const recipient =
      (typeof body?.recipient === "string" ? body.recipient.trim() : "") ||
      resolved.user.email ||
      "";

    if (!recipient) {
      return NextResponse.json({ error: "A test recipient is required" }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      to: channel === "email" ? recipient : undefined,
      customer_phone: channel === "sms" ? recipient : undefined,
      store_id: resolved.store.id,
      storeName: resolved.store.name,
      storeSlug: resolved.store.slug,
      templateName,
      customer_email: channel === "email" ? recipient : undefined,
      customer_name: "Amina",
      order_id: "TEST-1001",
      total: 1290,
      metadata: {
        source: "admin_test_send",
        initiatedByUserId: resolved.user.id,
      },
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = notificationTestRouteDeps.fetch as typeof fetch;
    try {
      const result = await dispatchNotificationDelivery(payload);

      if (result.mode === "inline") {
        const responseBody = await result.response.json().catch(() => ({}));
        if (!result.response.ok) {
          return NextResponse.json(
            { error: responseBody?.error || "Failed to send test notification" },
            { status: result.response.status || 500 },
          );
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message === "Supabase server credentials are not configured") {
        return NextResponse.json({ error: error.message }, { status: 503 });
      }
      throw error;
    } finally {
      globalThis.fetch = originalFetch;
    }

    return NextResponse.json({
      success: true,
      recipient,
      templateName,
      channel,
      message: "Test notification queued",
    });
  } catch (error) {
    console.error("Notification test send error:", error);
    return NextResponse.json({ error: "Failed to send test notification" }, { status: 500 });
  }
}
