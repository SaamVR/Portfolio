import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const analytics = readFileSync(new URL("../../views/admin/Analytics.tsx", import.meta.url), "utf8");
const cartRecovery = readFileSync(new URL("../../views/admin/CartRecovery.tsx", import.meta.url), "utf8");

test("merchant numeric settings keep draft strings instead of immediate default coercion", () => {
  for (const source of [analytics, cartRecovery]) {
    assert.doesNotMatch(source, /Number\(event\.target\.value\)\s*\|\|/);
    assert.match(source, /parseBoundedIntegerDraft/);
    assert.match(source, /NumericDraft/);
    assert.match(source, /aria-invalid/);
    assert.match(source, /aria-describedby/);
  }
});

test("analytics privacy controls expose bounded numeric and label associations", () => {
  assert.match(analytics, /id="analytics-retention-days"/);
  assert.match(analytics, /htmlFor="analytics-retention-days"/);
  assert.match(analytics, /type="number"/);
  assert.match(analytics, /min=\{30\}/);
  assert.match(analytics, /max=\{730\}/);
  assert.match(analytics, /id="analytics-anomaly-sensitivity"/);
  assert.match(analytics, /min=\{5\}/);
  assert.match(analytics, /max=\{50\}/);
  assert.match(analytics, /htmlFor="analytics-consent-banner-required"/);
  assert.match(analytics, /htmlFor="analytics-report-cadence"/);
  assert.match(analytics, /htmlFor="analytics-report-recipient"/);
  assert.match(analytics, /savePrivacyMutation\.mutate\(validated\)/);
});

test("cart recovery validates all bounded numeric settings before save and queue", () => {
  for (const id of [
    "cart-abandonment-window",
    "cart-cooldown-hours",
    "cart-max-touches",
    "cart-daily-queue-limit",
  ]) {
    assert.match(cartRecovery, new RegExp(`id="${id}"`));
    assert.match(cartRecovery, new RegExp(`htmlFor="${id}"`));
  }
  assert.match(cartRecovery, /min=\{15\}/);
  assert.match(cartRecovery, /max=\{1440\}/);
  assert.match(cartRecovery, /min=\{1\}/);
  assert.match(cartRecovery, /max=\{168\}/);
  assert.match(cartRecovery, /max=\{6\}/);
  assert.match(cartRecovery, /min=\{5\}/);
  assert.match(cartRecovery, /max=\{500\}/);
  assert.match(cartRecovery, /saveSettingsMutation\.mutate\(validated\)/);
  assert.match(cartRecovery, /queueRecoveryMutation\.mutate\(validated\)/);
  assert.doesNotMatch(cartRecovery, /htmlFor="cart-preferred-channel"/);
  assert.doesNotMatch(cartRecovery, /htmlFor="cart-coupon-prefix"/);
  assert.match(cartRecovery, /Automated WhatsApp recovery is unavailable/);
});
