import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "@/test/test-utils";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260914203000_payment_reservation_lifecycle_317_327.sql", import.meta.url),
  "utf8",
);
const edge = readFileSync(
  new URL("../../../supabase/functions/bkash-payment/index.ts", import.meta.url),
  "utf8",
);
const smoke = readFileSync(
  new URL("../../../supabase/migrations/payment_reservation_lifecycle_smoke.sql", import.meta.url),
  "utf8",
);
const route = readFileSync(
  new URL("../../app/api/orders/create/route.ts", import.meta.url),
  "utf8",
);

function ordered(source: string, first: string, second: string) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);
  assert.notEqual(firstIndex, -1, `missing ${first}`);
  assert.notEqual(secondIndex, -1, `missing ${second}`);
  assert.ok(firstIndex < secondIndex, `${first} must occur before ${second}`);
}

describe("payment reservation lifecycle database contract", () => {
  it("gives only automated bKash redirect orders a finite reservation lease", () => {
    assert.match(migration, /_is_redirect_payment boolean := lower\(trim\(coalesce\(_payment_method, ''\)\)\) = 'bkash'/);
    assert.match(migration, /reservation_state = CASE WHEN _is_redirect_payment THEN 'reserved' ELSE 'accepted' END/);
    assert.match(migration, /now\(\) \+ interval '30 minutes'/);
    assert.match(route, /rpc\("create_store_order_with_payment_lifecycle"/);
  });

  it("releases stock and coupon capacity exactly once on cancellation", () => {
    assert.match(migration, /CREATE TRIGGER trg_order_cancellation[\s\S]*BEFORE UPDATE OF status/);
    assert.match(migration, /NEW\.status = 'cancelled' AND OLD\.status IS DISTINCT FROM 'cancelled'/);
    assert.match(migration, /SET stock = stock \+ _line\.quantity/);
    assert.match(migration, /is_available = CASE WHEN stock \+ _line\.quantity > 0 THEN true/);
    assert.match(migration, /SET uses_count = greatest\(uses_count - 1, 0\)/);
    assert.match(migration, /NEW\.reservation_state := 'released'/);
    assert.match(migration, /OLD\.reservation_state IS DISTINCT FROM 'released'[\s\S]*OLD\.reservation_released_at IS NULL/);
    assert.match(migration, /storefront_payment_attempts[\s\S]*state IN \('executing', 'reconciliation_required'\)[\s\S]*cannot cancel order while payment execution outcome is unresolved/);
  });

  it("binds one active attempt, provider payment id, and transaction id authoritatively", () => {
    assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.storefront_payment_attempts/);
    assert.match(migration, /idx_storefront_payment_attempts_one_active/);
    assert.match(migration, /idx_storefront_payment_attempts_provider_payment[\s\S]*\(provider, provider_payment_id\)/);
    assert.match(migration, /idx_storefront_payment_attempts_provider_transaction[\s\S]*\(provider, provider_transaction_id\)/);
    assert.match(migration, /duplicate_provider_payment_identity/);
    assert.match(migration, /duplicate_provider_transaction_identity/);
  });

  it("executes replay smoke for provider-global payment and transaction identities", () => {
    assert.match(smoke, /PAY-GLOBAL-DUP/);
    assert.match(smoke, /duplicate provider payment identity bound to a second obligation/);
    assert.match(smoke, /TRX-GLOBAL-DUP/);
    assert.match(smoke, /duplicate provider transaction identity was not quarantined/);
    assert.match(smoke, /_reservation <> 'reconciliation_required'/);
  });

  it("refuses to create another payment attempt after provider success", () => {
    assert.match(migration, /state = 'succeeded'[\s\S]*payment obligation already succeeded/);
  });

  it("claims execution durably before the Edge Function calls bKash execute", () => {
    assert.match(migration, /SET state = 'executing',[\s\S]*execute_claimed_at = now\(\)/);
    ordered(edge, "rpc('claim_storefront_payment_execution'", "providerRequest('/tokenized/checkout/execute'");
  });

  it("never auto-releases uncertain execution outcomes", () => {
    assert.match(migration, /state IN \('executing', 'reconciliation_required'\)/);
    assert.match(migration, /SET reservation_state = 'reconciliation_required',[\s\S]*reservation_expires_at = NULL/);
    assert.match(edge, /\/tokenized\/checkout\/payment\/status/);
    assert.match(edge, /transactionStatus === 'initiated'/);
  });

  it("runs bounded reservation expiry and keeps lifecycle RPCs server-only", () => {
    assert.match(migration, /storefront-payment-reservation-expiry/);
    assert.match(migration, /'\* \* \* \* \*'/);
    assert.match(migration, /REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated/);
    assert.match(migration, /GRANT EXECUTE ON FUNCTION %s TO service_role/);
  });
});
