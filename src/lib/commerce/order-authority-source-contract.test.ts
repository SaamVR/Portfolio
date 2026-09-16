import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260914201500_p0_authoritative_order_boundary.sql", import.meta.url),
  "utf8",
);
const checkout = readFileSync(new URL("../../views/Checkout.tsx", import.meta.url), "utf8");
const signup = readFileSync(new URL("../../views/MerchantSignupV3.tsx", import.meta.url), "utf8");
const onboarding = readFileSync(new URL("../../components/admin/OnboardingWizard.tsx", import.meta.url), "utf8");
const registrationWizard = readFileSync(new URL("../../components/auth/MerchantRegistrationWizard.tsx", import.meta.url), "utf8");
const backupRestore = readFileSync(new URL("../store-backup-restore.ts", import.meta.url), "utf8");

test("delivery authority derives zone from explicit merchant city membership", () => {
  assert.match(migration, /primary_zone_aliases/);
  assert.match(migration, /_normalized_shipping_city/);
  assert.match(migration, /THEN 'primary'[\s\S]{0,120}ELSE 'secondary'/);
  assert.match(migration, /_requested_delivery_zone[\s\S]{0,160}checkout delivery zone changed/);
  assert.match(checkout, /resolveStorefrontDeliveryLocation\(deliverySettings, form\.city\)/);
  assert.doesNotMatch(checkout, /name="delivery-zone"|setDeliveryZone/);
});

test("new merchant delivery configuration has no guessed primary city authority", () => {
  assert.match(signup, /primary_zone_aliases:\s*\[\]/);
  assert.doesNotMatch(signup, /Inside Dhaka|Outside Dhaka/);
  assert.match(onboarding, /primaryZoneAliases/);
  assert.match(onboarding, /primary_zone_aliases:\s*draft\.delivery\.primaryZoneAliases/);
  assert.match(registrationWizard, /deliveryEnabled:\s*false/);
  assert.doesNotMatch(registrationWizard, /Inside Dhaka|Outside Dhaka/);
});

test("manual payment evidence is structured and required before prepaid authority", () => {
  assert.match(migration, /manual_payment_provider/);
  assert.match(migration, /manual_payment_reference/);
  assert.match(migration, /manual payment reference is required and invalid/);
  assert.match(migration, /_effective_prepaid := coalesce\(_payment_method_prepaid, false\)/);
  assert.match(checkout, /manual_payment_reference:\s*isManualMobilePayment/);
  assert.doesNotMatch(checkout, /TrxID:\s*\$\{form\.trxId/);
  assert.match(backupRestore, /manual_payment_provider/);
  assert.match(backupRestore, /manual_payment_reference/);
  assert.match(migration, /\^\[A-Z0-9_-\]\{4,50\}\$/);
});
