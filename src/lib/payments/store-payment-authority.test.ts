import test from "node:test";
import assert from "node:assert/strict";
import { resolveStorePaymentAuthority } from "@/lib/payments/store-payment-authority";

function queryResult(data: unknown) {
  return {
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data, error: null }),
  };
}

function admin(settings: Record<string, unknown>, connection: Record<string, unknown> | null = null) {
  return {
    from(table: string) {
      if (table === "site_settings") return queryResult({ value: settings });
      if (table === "store_payment_connections_secure") return queryResult(connection);
      throw new Error(`Unexpected table ${table}`);
    },
  };
}

test("store payment authority fails closed for disabled offline methods", async () => {
  assert.equal((await resolveStorePaymentAuthority(admin({ cod_enabled: false }), "store", "cod")).allowed, false);
  assert.equal((await resolveStorePaymentAuthority(admin({ bkash_enabled: false, bkash_number: "017" }), "store", "bkash_manual")).allowed, false);
  assert.equal((await resolveStorePaymentAuthority(admin({ nagad_enabled: true, nagad_number: "" }), "store", "nagad")).allowed, false);
});

test("store payment authority only grants prepaid eligibility to a valid enabled method", async () => {
  const valid = await resolveStorePaymentAuthority(admin({ bkash_enabled: true, bkash_number: "01700000000" }), "store", "bkash_manual");
  assert.equal(valid.allowed, true);
  assert.equal(valid.prepaidEligible, true);

  const cod = await resolveStorePaymentAuthority(admin({ cod_enabled: true }), "store", "cod");
  assert.equal(cod.allowed, true);
  assert.equal(cod.prepaidEligible, false);
});

test("redirect provider requires a connected complete merchant connection", async () => {
  const disconnected = await resolveStorePaymentAuthority(admin({}, {
    id: "conn",
    store_id: "store",
    provider: "bkash",
    status: "draft",
    public_metadata: {},
    secret_payload: {},
    created_at: "",
    updated_at: "",
    revoked_at: null,
  }), "store", "bkash");
  assert.equal(disconnected.allowed, false);

  const connected = await resolveStorePaymentAuthority(admin({}, {
    id: "conn",
    store_id: "store",
    provider: "bkash",
    status: "connected",
    public_metadata: {},
    secret_payload: { app_key: "a", app_secret: "b", username: "c", password: "d" },
    created_at: "",
    updated_at: "",
    revoked_at: null,
  }), "store", "bkash");
  assert.equal(connected.allowed, true);
  assert.equal(connected.providerId, "bkash");
  assert.equal(connected.prepaidEligible, true);
});
