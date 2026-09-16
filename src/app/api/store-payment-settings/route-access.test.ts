import test, { afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { GET, storePaymentSettingsRouteDeps } from "@/app/api/store-payment-settings/route";

afterEach(() => mock.restoreAll());

const request = () => new Request(
  "https://example.com/api/store-payment-settings?storeId=10000000-0000-4000-8000-000000000001",
);

test("unpublished active stores do not expose public payment settings", async () => {
  mock.method(storePaymentSettingsRouteDeps, "getSupabaseAdminClient", () => ({} as never));
  mock.method(storePaymentSettingsRouteDeps, "loadStorePlanState", async () => ({
    data: {
      isPublished: false,
      subscription: { status: "active" },
      resolved: { live: true },
    },
    error: null,
  }) as never);

  const response = await GET(request());
  assert.equal(response.status, 404);
});

test("published subscribed stores with a non-live plan do not expose payment settings", async () => {
  mock.method(storePaymentSettingsRouteDeps, "getSupabaseAdminClient", () => ({} as never));
  mock.method(storePaymentSettingsRouteDeps, "loadStorePlanState", async () => ({
    data: {
      isPublished: true,
      subscription: { status: "past_due" },
      resolved: { live: false },
    },
    error: null,
  }) as never);

  const response = await GET(request());
  assert.equal(response.status, 404);
});
