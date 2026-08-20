import assert from "node:assert/strict";
import { describe, expect, it } from "@/test/test-utils";
import {
  buildProviderRegistry,
  normalizeProviderId,
  type ProviderManifest,
} from "@/lib/integrations/provider-contract";
import {
  getPaymentProviderManifest,
  getPaymentProviderPlugin,
  isAllowedStorefrontPaymentMethod,
  isPrepaidStorefrontPaymentMethod,
  listPaymentProviderManifests,
} from "@/lib/payments/provider-registry";
import { getPaymentProviderServerAdapter } from "@/lib/payments/provider-server";
import {
  getCourierProviderManifest,
  getCourierProviderPlugin,
  listCourierProviderManifests,
} from "@/lib/couriers/provider-registry";
import { getCourierProviderServerAdapter } from "@/lib/couriers/provider-server";

describe("provider plugin contract", () => {
  it("normalizes safe provider ids and rejects invalid ids", () => {
    expect(normalizeProviderId(" Stripe ")).toBe("stripe");
    expect(normalizeProviderId("sslcommerz_v4")).toBe("sslcommerz_v4");
    expect(normalizeProviderId("Fed Ex")).toBeNull();
    expect(normalizeProviderId("../provider")).toBeNull();
  });

  it("rejects duplicate provider registration", () => {
    const manifest: ProviderManifest = {
      id: "demo",
      category: "payment",
      label: "Demo",
      description: "test",
      runtimeStatus: "active",
      capabilities: [],
      fields: [],
    };
    assert.throws(
      () => buildProviderRegistry([manifest, { ...manifest }]),
      /Duplicate provider id/,
    );
  });
});

describe("payment provider plugins", () => {
  it("registers bKash once with manifest, secure connection behavior, and checkout runtime", () => {
    const plugin = getPaymentProviderPlugin("bkash");
    assert.ok(plugin);
    expect(plugin.manifest.runtimeStatus).toBe("active");
    expect(plugin.manifest.checkoutMode).toBe("redirect");
    expect(plugin.manifest.fields.filter((field) => field.scope === "secret").map((field) => field.key))
      .toEqual(["appKey", "appSecret", "username", "password"]);
    assert.equal(typeof plugin.connection.splitConnectionSettings, "function");
    assert.equal(typeof plugin.checkout?.initializeRedirectCheckout, "function");
    assert.equal(typeof plugin.checkout?.handleRedirectCallback, "function");
    expect(listPaymentProviderManifests().map((provider) => provider.id)).toEqual(["bkash"]);
    expect(getPaymentProviderManifest("bkash")?.id).toBe("bkash");
  });

  it("lets registered gateway methods flow through core order and prepaid pricing admission", () => {
    expect(isAllowedStorefrontPaymentMethod("bkash")).toBe(true);
    expect(isAllowedStorefrontPaymentMethod("bkash_manual")).toBe(true);
    expect(isAllowedStorefrontPaymentMethod("nagad")).toBe(true);
    expect(isAllowedStorefrontPaymentMethod("cod")).toBe(true);
    expect(isAllowedStorefrontPaymentMethod("stripe")).toBe(false);
    expect(isPrepaidStorefrontPaymentMethod("bkash")).toBe(true);
    expect(isPrepaidStorefrontPaymentMethod("bkash_manual")).toBe(true);
    expect(isPrepaidStorefrontPaymentMethod("cod")).toBe(false);
  });

  it("keeps payment secrets server-side while producing only masked metadata", () => {
    const adapter = getPaymentProviderServerAdapter("bkash");
    assert.ok(adapter);
    const split = adapter.splitConnectionSettings({
      appKey: "merchant-app-key",
      appSecret: "merchant-secret",
      username: "merchant-user",
      password: "merchant-password",
      isLive: true,
    });

    expect(adapter.hasCompleteSecrets(split.secretPayload)).toBe(true);
    expect("app_secret" in split.publicMetadata).toBe(false);
    expect("password" in split.publicMetadata).toBe(false);
    expect(split.publicMetadata.environment).toBe("live");
    expect(getPaymentProviderServerAdapter("stripe")).toBeNull();
  });
});

describe("courier provider plugins", () => {
  it("registers active Pathao/manual adapters and fail-closed setup-only adapters", () => {
    const pathao = getCourierProviderManifest("pathao");
    const steadfast = getCourierProviderManifest("steadfast");
    const manual = getCourierProviderManifest("manual");

    expect(pathao?.runtimeStatus).toBe("active");
    expect(steadfast?.runtimeStatus).toBe("setup_only");
    expect(manual?.runtimeStatus).toBe("active");
    assert.equal(typeof getCourierProviderServerAdapter("pathao")?.book, "function");
    expect(getCourierProviderServerAdapter("steadfast")?.book).toBe(undefined);
    assert.equal(typeof getCourierProviderServerAdapter("manual")?.book, "function");
    expect(getCourierProviderServerAdapter("fedex")).toBeNull();
  });

  it("registers courier behavior and manifest together as one plugin", () => {
    const pathao = getCourierProviderPlugin("pathao");
    const manual = getCourierProviderPlugin("manual");
    const steadfast = getCourierProviderPlugin("steadfast");
    assert.ok(pathao);
    assert.ok(manual);
    assert.ok(steadfast);
    expect(pathao.manifest.id).toBe("pathao");
    assert.equal(typeof pathao.adapter.book, "function");
    assert.equal(typeof manual.adapter.book, "function");
    expect(steadfast.adapter.book).toBe(undefined);
  });

  it("splits Pathao secret credentials away from public fulfillment settings", () => {
    const adapter = getCourierProviderServerAdapter("pathao");
    assert.ok(adapter);
    const split = adapter.splitSettings({
      zoneLabel: "Dhaka COD",
      serviceAreaName: "Dhaka metro",
      pickupContactName: "Ops",
      pickupContactPhone: "01700000000",
      pickupAddress: "Dhaka",
      returnContactName: "Returns",
      returnContactPhone: "01800000000",
      returnAddress: "Dhaka",
      baseUrl: "https://merchant.pathao.com/aladdin/api/v1",
      merchantStoreId: "42",
      accessToken: "provider-token",
    });

    expect(split.publicSettings.zone_label).toBe("Dhaka COD");
    expect("access_token" in split.publicSettings).toBe(false);
    expect(split.secretSettings.access_token).toBe("provider-token");
    const summary = adapter.summarizeSettings(split.publicSettings, split.secretSettings);
    expect(summary.hasAccessToken).toBe(true);
    expect(summary.zoneLabel).toBe("Dhaka COD");
  });

  it("keeps the courier catalog registry-driven", () => {
    expect(listCourierProviderManifests().map((provider) => provider.id)).toEqual([
      "pathao",
      "steadfast",
      "redx",
      "ecourier",
      "paperfly",
      "manual",
    ]);
  });
});
