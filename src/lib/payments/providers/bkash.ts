import {
  maskPaymentText,
  pickPaymentSecret,
  readPaymentText,
  safePaymentObject,
  type PaymentProviderPlugin,
} from "@/lib/payments/provider-plugin";

function readCallbackParam(params: Record<string, string | null | undefined>, key: string) {
  const value = params[key];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export const bkashPaymentPlugin: PaymentProviderPlugin = {
  manifest: {
    id: "bkash",
    category: "payment",
    label: "bKash",
    description: "bKash Tokenized Checkout payment gateway.",
    runtimeStatus: "active",
    checkoutMode: "redirect",
    paymentMethod: "bkash",
    connectionRequired: true,
    checkoutLabel: "bKash (Automated)",
    checkoutDescription: "Pay instantly via bKash Account",
    capabilities: ["redirect_checkout", "online_payment", "sandbox", "guest_checkout"],
    fields: [
      {
        key: "isLive",
        label: "Live production mode",
        kind: "boolean",
        scope: "public",
        defaultValue: false,
        helpText: "Keep disabled while testing with bKash sandbox credentials.",
      },
      {
        key: "appKey",
        label: "App Key",
        kind: "password",
        scope: "secret",
        required: true,
        placeholder: "Enter bKash App Key",
      },
      {
        key: "appSecret",
        label: "App Secret",
        kind: "password",
        scope: "secret",
        required: true,
        placeholder: "Enter bKash App Secret",
      },
      {
        key: "username",
        label: "Username",
        kind: "text",
        scope: "secret",
        required: true,
        placeholder: "Merchant bKash username",
      },
      {
        key: "password",
        label: "Password",
        kind: "password",
        scope: "secret",
        required: true,
        placeholder: "Merchant bKash password",
      },
    ],
    guide: {
      title: "bKash gateway setup",
      body: "Use the merchant Tokenized Checkout credentials issued for this store. Sandbox and live credentials must not be mixed.",
      examples: ["Start in sandbox mode", "Switch to live only after a successful provider verification"],
    },
  },
  connection: {
    incompleteConnectionMessage: "Add app key, app secret, username, and password before connecting bKash.",
    splitConnectionSettings(rawSettings) {
      const settings = safePaymentObject(rawSettings);
      const isLive = settings.isLive === true || settings.bkash_is_live === true;
      const forceTestMode = settings.forceTestMode === true || settings.testMode === true;
      const baseUrl = readPaymentText(settings.baseUrl ?? settings.bkash_base_url, 500);
      const appKey = pickPaymentSecret(settings.appKey ?? settings.bkash_app_key);
      const appSecret = pickPaymentSecret(settings.appSecret ?? settings.bkash_app_secret);
      const username = pickPaymentSecret(settings.username ?? settings.bkash_username);
      const password = pickPaymentSecret(settings.password ?? settings.bkash_password);

      return {
        publicMetadata: {
          is_live: isLive,
          environment: isLive ? "live" : "sandbox",
          force_test_mode: forceTestMode,
          base_url: baseUrl || null,
          label: readPaymentText(settings.label, 120) || "bKash PGW",
          app_key_hint: maskPaymentText(readPaymentText(settings.appKey ?? settings.bkash_app_key, 500)),
          username_hint: maskPaymentText(readPaymentText(settings.username ?? settings.bkash_username, 500)),
        },
        secretPayload: {
          ...(appKey ? { app_key: appKey } : {}),
          ...(appSecret ? { app_secret: appSecret } : {}),
          ...(username ? { username } : {}),
          ...(password ? { password } : {}),
        },
      };
    },
    hasCompleteSecrets(secretPayload) {
      const secrets = safePaymentObject(secretPayload);
      return Boolean(
        readPaymentText(secrets.app_key, 500)
        && readPaymentText(secrets.app_secret, 500)
        && readPaymentText(secrets.username, 500)
        && readPaymentText(secrets.password, 500),
      );
    },
    buildConnectionResponse(row) {
      if (!row) {
        return {
          provider: "bkash",
          configured: false,
          status: "draft",
          metadata: {
            environment: "sandbox",
            forceTestMode: false,
            baseUrl: null,
            label: "bKash PGW",
            appKeyHint: null,
            usernameHint: null,
          },
          updatedAt: null,
          revokedAt: null,
        };
      }

      const metadata = safePaymentObject(row.public_metadata);
      const complete = bkashPaymentPlugin.connection.hasCompleteSecrets(row.secret_payload);
      return {
        id: row.id,
        provider: row.provider,
        configured: row.status === "connected" && complete,
        status: row.status,
        metadata: {
          environment: metadata.environment === "live" ? "live" : "sandbox",
          forceTestMode: metadata.force_test_mode === true,
          baseUrl: typeof metadata.base_url === "string" && metadata.base_url.trim() ? metadata.base_url.trim() : null,
          label: readPaymentText(metadata.label, 120) || "bKash PGW",
          appKeyHint: typeof metadata.app_key_hint === "string" ? metadata.app_key_hint : null,
          usernameHint: typeof metadata.username_hint === "string" ? metadata.username_hint : null,
        },
        updatedAt: row.updated_at,
        revokedAt: row.revoked_at,
      };
    },
  },
  checkout: {
    async initializeRedirectCheckout(deps, request) {
      const { data, error } = await deps.invokeFunction("bkash-payment", {
        action: "create",
        order_id: request.orderNumber,
        amount: request.amount,
        store_id: request.storeId,
      });

      const success = data?.success === true;
      const redirectUrl = typeof data?.bkashURL === "string" ? data.bkashURL.trim() : "";
      if (error || !success || !redirectUrl) {
        const providerMessage = typeof data?.error === "string" ? data.error : "";
        throw new Error(providerMessage || error?.message || "Failed to initialize bKash payment.");
      }

      return { providerId: request.providerId, redirectUrl };
    },
    async handleRedirectCallback(deps, request) {
      const callbackStatus = readCallbackParam(request.params, "status").toLowerCase();
      const paymentId = readCallbackParam(request.params, "paymentID");
      const orderNumber = readCallbackParam(request.params, "order_id");
      const storeId = readCallbackParam(request.params, "store_id");

      if (callbackStatus === "cancel") {
        return {
          providerId: request.providerId,
          status: "cancelled",
          message: "Payment was cancelled.",
          storeId: storeId || undefined,
          retryable: true,
        };
      }

      if (callbackStatus === "failure" || callbackStatus === "error") {
        return {
          providerId: request.providerId,
          status: "error",
          message: "bKash reported that the payment failed.",
          storeId: storeId || undefined,
          retryable: true,
        };
      }

      if (!paymentId || !orderNumber || !storeId) {
        return {
          providerId: request.providerId,
          status: "error",
          message: "Payment verification details are incomplete. Please contact support.",
          storeId: storeId || undefined,
          retryable: false,
        };
      }

      const { data, error } = await deps.invokeFunction("bkash-payment", {
        action: "execute",
        paymentID: paymentId,
        order_id: orderNumber,
        store_id: storeId,
      });

      if (error || data?.success !== true) {
        const providerMessage = typeof data?.error === "string" ? data.error : "";
        return {
          providerId: request.providerId,
          status: "error",
          message: providerMessage || error?.message || "Failed to verify payment with bKash.",
          storeId,
          retryable: false,
        };
      }

      const confirmedOrder = typeof data.order_number === "string" && data.order_number.trim()
        ? data.order_number.trim()
        : orderNumber;

      return {
        providerId: request.providerId,
        status: "success",
        message: "Payment successful! Redirecting to confirmation page...",
        orderNumber: confirmedOrder,
        storeId,
      };
    },
  },
};