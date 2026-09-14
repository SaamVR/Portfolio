import { after } from "next/server";
import { getAuthenticatedUser, getSupabaseAdminClient, loadStorePlanState } from "@/lib/api/supabase-route";
import { rateLimit } from "@/lib/rate-limit";
import { normalizeOrderItems } from "@/lib/cms/order-input";
import { resolveStorefrontOrderExperienceFromProfile } from "@/lib/cms/storefront-order-experience";
import { jsonNoStore } from "@/lib/http/cache-control";
import { dispatchOrderCreatedBackgroundJobs } from "@/lib/orders/order-background-queue";
import { resolveAuthoritativeCheckoutPricing } from "@/lib/orders/authoritative-checkout-pricing";
import { getPaymentProviderByPaymentMethod, isAllowedStorefrontPaymentMethod } from "@/lib/payments/provider-registry";
import { isStorefrontPaymentMethodConfigured } from "@/lib/payments/storefront-payment-availability";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getClientIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function readText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function readMoney(value: unknown) {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.round(amount));
}

function safeRecord(value: unknown) {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}

function mapOrderError(message: string) {
  if (/checkout recovery conflict/i.test(message)) {
    return { message, status: 409 };
  }

  if (/cart|client_request_id|coupon|invalid|items|product|quantity|stock|required|pricing changed|unavailable/i.test(message)) {
    return { message, status: 400 };
  }

  return { message: "Failed to create order", status: 500 };
}

type StoreOrderAccessState = {
  isPublished?: boolean | null;
  hasSubscription?: boolean;
  planLive?: boolean;
};

export function canStoreAcceptOrders(access: StoreOrderAccessState | null | undefined) {
  if (!access) return false;

  // Match storefront access semantics exactly: a live trial/active plan may make
  // the storefront public before the legacy is_published flag is flipped.
  if (!access.isPublished) {
    return access.planLive === true;
  }

  // Published legacy stores with no subscription record remain accessible.
  if (!access.hasSubscription) {
    return true;
  }

  return access.planLive === true;
}

export const orderCreateRouteDeps = {
  rateLimit,
  getAuthenticatedUser,
  getSupabaseAdminClient,
  loadStorePlanState,
  dispatchOrderCreatedBackgroundJobs,
};

export async function POST(req: Request) {
  try {
    const limit = await orderCreateRouteDeps.rateLimit(`order_create:${getClientIp(req)}`, {
      limit: 12,
      windowMs: 60_000,
    });

    if (!limit.success) {
      return jsonNoStore({ error: "Too many order attempts. Please wait a minute." }, { status: 429 });
    }

    const body = await req.json();
    const storeId = readText(body?.storeId, 80);
    const idempotencyKey = readText(body?.idempotencyKey, 120);
    const paymentMethod = readText(body?.paymentMethod, 30).toLowerCase();
    const customerName = readText(body?.customerName, 100);
    const customerPhone = readText(body?.customerPhone, 30);
    const customerEmail = readText(body?.customerEmail, 180);
    const shippingAddress = readText(body?.shippingAddress, 500);
    const shippingCity = readText(body?.shippingCity, 100);
    const requestedDeliveryLocation = readText(body?.deliveryLocation, 20).toLowerCase();
    const deliveryLocation = requestedDeliveryLocation === "" || requestedDeliveryLocation === "primary"
      ? "primary"
      : requestedDeliveryLocation === "secondary"
        ? "secondary"
        : null;

    if (!uuidPattern.test(storeId)) {
      return jsonNoStore({ error: "Invalid store" }, { status: 400 });
    }

    if (!idempotencyKey) {
      return jsonNoStore({ error: "Missing idempotency key" }, { status: 400 });
    }

    if (!customerName || !customerPhone || !shippingAddress || !shippingCity) {
      return jsonNoStore({ error: "Missing required customer or shipping fields" }, { status: 400 });
    }

    if (!deliveryLocation) {
      return jsonNoStore({ error: "Invalid delivery location" }, { status: 400 });
    }

    if (!isAllowedStorefrontPaymentMethod(paymentMethod)) {
      return jsonNoStore({ error: "Invalid payment method" }, { status: 400 });
    }

    const items = normalizeOrderItems(body?.items);
    const productIds = Array.from(new Set(items.map((item) => item.productId)));
    const user = await orderCreateRouteDeps.getAuthenticatedUser(req);
    const supabaseAdmin = orderCreateRouteDeps.getSupabaseAdminClient();
    const [
      { data: store },
      { data: storefrontSetting },
      deliverySettingResult,
      paymentSettingResult,
      productsResult,
      storePlanResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("stores")
        .select("name, is_published")
        .eq("id", storeId)
        .maybeSingle(),
      supabaseAdmin
        .from("site_settings")
        .select("value")
        .eq("store_id", storeId)
        .eq("key", "storefront_profile")
        .maybeSingle(),
      supabaseAdmin
        .from("site_settings")
        .select("value")
        .eq("store_id", storeId)
        .eq("key", "delivery_settings")
        .maybeSingle(),
      supabaseAdmin
        .from("site_settings")
        .select("value")
        .eq("store_id", storeId)
        .eq("key", "payment_settings")
        .maybeSingle(),
      supabaseAdmin
        .from("products")
        .select("id, price, type")
        .eq("store_id", storeId)
        .in("id", productIds),
      orderCreateRouteDeps.loadStorePlanState(supabaseAdmin, storeId, { includePublished: true }),
    ]);

    if (storePlanResult.error) {
      throw storePlanResult.error;
    }
    if (deliverySettingResult.error) {
      throw deliverySettingResult.error;
    }
    if (paymentSettingResult.error) {
      throw paymentSettingResult.error;
    }
    if (productsResult.error) {
      throw productsResult.error;
    }

    const storePlanState = storePlanResult.data;
    const orderAccess = {
      isPublished: store?.is_published ?? storePlanState?.isPublished ?? null,
      hasSubscription: Boolean(storePlanState?.subscription),
      planLive: storePlanState?.resolved.live ?? false,
    };

    // Private preview links may reveal a non-public draft to an authorized
    // merchant, but must never make that draft transactional. Live trial/active
    // stores remain orderable because they are already publicly accessible by
    // the canonical storefront resolver.
    if (!canStoreAcceptOrders(orderAccess)) {
      return jsonNoStore({ error: "This store is not currently accepting orders." }, { status: 403 });
    }

    const gatewayProvider = getPaymentProviderByPaymentMethod(paymentMethod);
    let gatewayConnection: unknown = null;
    if (gatewayProvider?.connectionRequired) {
      const connectionResult = await (supabaseAdmin as any)
        .from("store_payment_connections_secure")
        .select("provider, status")
        .eq("store_id", storeId)
        .eq("provider", gatewayProvider.id)
        .maybeSingle();
      if (connectionResult.error) {
        throw connectionResult.error;
      }
      gatewayConnection = connectionResult.data;
    }

    if (!isStorefrontPaymentMethodConfigured({
      paymentMethod,
      paymentSettings: paymentSettingResult.data?.value,
      gatewayConnection,
    })) {
      return jsonNoStore({ error: "Payment method is not available for this store" }, { status: 400 });
    }

    const authoritativePricing = resolveAuthoritativeCheckoutPricing({
      items,
      products: (productsResult.data ?? []).map((product) => ({
        id: product.id,
        price: Number(product.price),
        type: product.type,
      })),
      deliverySettings: deliverySettingResult.data?.value,
      paymentSettings: paymentSettingResult.data?.value,
      paymentMethod,
      location: deliveryLocation,
    });
    const requestedDeliveryFee = readMoney(body?.deliveryFee);

    if (requestedDeliveryFee !== authoritativePricing.deliveryFee) {
      return jsonNoStore(
        { error: "checkout pricing changed; refresh checkout and try again" },
        { status: 400 },
      );
    }

    const storefrontProfile = typeof storefrontSetting?.value === "object" && storefrontSetting?.value
      ? storefrontSetting.value as Record<string, unknown>
      : null;
    const orderExperience = resolveStorefrontOrderExperienceFromProfile(storefrontProfile, items);

    const { data, error } = await (supabaseAdmin as any).rpc("create_store_order_with_stock_v2", {
      _store_id: storeId,
      _client_request_id: idempotencyKey,
      _user_id: user?.id ?? null,
      _items: items,
      _delivery_fee: authoritativePricing.deliveryFee,
      _discount_amount: readMoney(body?.discountAmount),
      _customer_name: customerName,
      _customer_phone: customerPhone,
      _customer_email: customerEmail || null,
      _shipping_address: shippingAddress,
      _shipping_city: shippingCity,
      _payment_method: paymentMethod,
      _notes: readText(body?.notes, 1000) || null,
      _coupon_code: readText(body?.couponCode, 80) || null,
    });

    if (error) {
      const mapped = mapOrderError(error.message || "");
      return jsonNoStore({ error: mapped.message }, { status: mapped.status });
    }

    const rpcOrder = Array.isArray(data) ? data[0] : data;
    if (!rpcOrder?.id || !rpcOrder?.order_number) {
      return jsonNoStore({ error: "Failed to create order" }, { status: 500 });
    }

    const { data: persistedOrder, error: persistedOrderError } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, subtotal, delivery_fee, total, items, status, payment_method, client_request_id")
      .eq("id", rpcOrder.id)
      .eq("store_id", storeId)
      .maybeSingle();

    if (persistedOrderError) {
      console.error("Failed to hydrate created order details:", persistedOrderError);
    }

    const order = persistedOrder ?? rpcOrder;
    const persistedPaymentMethod = readText(order.payment_method, 30).toLowerCase() || paymentMethod;

    // Defense in depth: the v2 RPC already rejects this mismatch while holding
    // the checkout-attempt lock. Do not let a drifted database function turn a
    // changed-method retry into a false success at the HTTP boundary.
    if (persistedPaymentMethod !== paymentMethod) {
      return jsonNoStore(
        { error: "checkout recovery conflict: payment method does not match the existing order" },
        { status: 409 },
      );
    }

    const replayed = rpcOrder.replayed === true;
    if (replayed) {
      // Idempotent retries resume the already-authoritative order. Inventory was
      // reserved on the original call, and order-created notifications/analytics
      // must not be emitted a second time.
      return jsonNoStore({ order, replayed: true });
    }

    const orderItems = Array.isArray(order.items) ? order.items : items;
    const productRevenueWeight = orderItems.reduce((sum: number, item: any) => {
      const quantity = Number(item?.quantity ?? 0);
      const unitPrice = Number(item?.price ?? item?.unit_price ?? item?.sale_price ?? 0);
      if (Number.isFinite(unitPrice) && unitPrice > 0) {
        return sum + (Math.max(quantity, 0) * unitPrice);
      }
      return sum + Math.max(quantity, 0);
    }, 0);
    const purchaseEventRows = [
      {
        store_id: storeId,
        customer_id: user?.id ?? null,
        order_id: order.id,
        event_name: "purchase",
        event_category: "commerce",
        page_type: "order_success",
        order_number: order.order_number,
        quantity: orderItems.reduce((sum: number, item: any) => sum + Number(item?.quantity ?? 0), 0),
        value: Number(order.total ?? 0),
        currency_code: "BDT",
        search_query: null,
        metadata: {
          payment_method: persistedPaymentMethod,
          customer_name: customerName,
          shipping_city: shippingCity,
          items: orderItems,
        },
        user_agent: req.headers.get("user-agent"),
      },
      ...orderItems.map((item: any) => {
        const quantity = Math.max(1, Number(item?.quantity ?? 1));
        const unitPrice = Number(item?.price ?? item?.unit_price ?? item?.sale_price ?? 0);
        const metadata = safeRecord(item);
        const weightedValue = Number(order.total ?? 0) > 0
          ? (
            productRevenueWeight > 0
              ? Number(order.total ?? 0) * (
                  (Number.isFinite(unitPrice) && unitPrice > 0 ? quantity * unitPrice : quantity) / productRevenueWeight
                )
              : 0
          )
          : 0;

        return {
          store_id: storeId,
          customer_id: user?.id ?? null,
          order_id: order.id,
          product_id: readText(item?.product_id ?? item?.productId, 80),
          event_name: "purchase_item",
          event_category: "commerce",
          page_type: "order_success",
          order_number: order.order_number,
          quantity,
          value: Math.round(weightedValue),
          currency_code: "BDT",
          search_query: null,
          metadata: {
            productName: readText(item?.name ?? item?.product_name ?? item?.title, 180),
            variant: readText(item?.size ?? item?.variant ?? "", 120),
            unit_price: Number.isFinite(unitPrice) ? unitPrice : null,
            ...metadata,
          },
          user_agent: req.headers.get("user-agent"),
        };
      }).filter((row) => row.product_id),
    ];

    after(async () => {
      await orderCreateRouteDeps.dispatchOrderCreatedBackgroundJobs({
        customerEmail,
        customerPhone,
        notification: {
          store_id: storeId,
          order_id: order.id,
          order_number: order.order_number,
          store_name: typeof store?.name === "string" ? store.name : undefined,
          order_label: orderExperience.labels.trackActionLabel === "Track Order" ? "Order Number" : "Request Number",
          customer_label: orderExperience.labels.detailsTitle,
          items_label: orderExperience.labels.summaryTitle,
          total_label: orderExperience.labels.totalLabel,
          address_label: orderExperience.labels.addressSummaryLabel,
          option_label: orderExperience.labels.optionLabel,
          merchant_notification_title: orderExperience.labels.merchantNotificationTitle,
          customer_name: customerName,
          customer_phone: customerPhone,
          shipping_address: shippingAddress,
          shipping_city: shippingCity,
          total: Number(order.total ?? 0),
          items: orderItems,
        },
        purchaseEventRows,
        recoveryOrderId: order.id,
        recoveredRevenue: Number(order.total ?? 0),
        revenueEventRow: {
          store_id: storeId,
          order_id: order.id,
          customer_id: user?.id ?? null,
          event_type: "sale",
          gross_amount: Number(order.total ?? 0),
          refund_amount: 0,
          net_amount: Number(order.total ?? 0),
          currency_code: "BDT",
          payment_method: persistedPaymentMethod,
          status: typeof order.status === "string" ? order.status : "pending",
          attribution_source: readText((purchaseEventRows[0]?.metadata as Record<string, unknown> | undefined)?.source, 120) || null,
          attribution_medium: readText((purchaseEventRows[0]?.metadata as Record<string, unknown> | undefined)?.medium, 120) || null,
          attribution_campaign: readText((purchaseEventRows[0]?.metadata as Record<string, unknown> | undefined)?.campaign, 160) || null,
          metadata: {
            order_number: order.order_number,
            item_count: orderItems.reduce((sum: number, item: any) => sum + Number(item?.quantity ?? 0), 0),
          },
        },
        storeId,
        supabaseAdmin,
      });
    });

    return jsonNoStore({ order, replayed: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create order";
    const mapped = mapOrderError(message);
    console.error("Order create error:", error);
    return jsonNoStore({ error: mapped.message }, { status: mapped.status });
  }
}
