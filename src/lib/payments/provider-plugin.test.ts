import assert from "node:assert/strict";
import { describe, it } from "@/test/test-utils";
import {
  isPaymentOperationallyConfigured,
  normalizePaymentConnectionStatus,
} from "@/lib/payments/provider-plugin";
import { bkashPaymentPlugin } from "@/lib/payments/providers/bkash";

describe("payment connection truth", () => {
  it("normalizes the legacy connected state to configured during rollout", () => {
    assert.equal(normalizePaymentConnectionStatus("connected"), "configured");
    assert.equal(normalizePaymentConnectionStatus("configured"), "configured");
    assert.equal(isPaymentOperationallyConfigured("connected"), true);
    assert.equal(isPaymentOperationallyConfigured("configured"), true);
    assert.equal(isPaymentOperationallyConfigured("draft"), false);
    assert.equal(isPaymentOperationallyConfigured("revoked"), false);
  });

  it("does not turn complete bKash credentials into provider verification", () => {
    const response = bkashPaymentPlugin.connection.buildConnectionResponse({
      id: "connection-1",
      store_id: "store-1",
      provider: "bkash",
      status: "configured",
      verification_status: "not_checked",
      last_verification_at: null,
      last_verified_at: null,
      verification_error: null,
      public_metadata: { environment: "sandbox" },
      secret_payload: {
        app_key: "app-key",
        app_secret: "app-secret",
        username: "merchant",
        password: "secret",
      },
      created_at: "2026-08-29T00:00:00.000Z",
      updated_at: "2026-08-29T00:00:00.000Z",
      revoked_at: null,
    });

    assert.equal(response.configured, true);
    assert.equal(response.status, "configured");
    assert.equal(response.verificationStatus, "not_checked");
    assert.equal(response.verificationAvailable, false);
  });
});
