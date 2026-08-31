import assert from "node:assert/strict";
import test from "node:test";
import {
  merchantNumericSettingBounds,
  parseBoundedIntegerDraft,
} from "./numeric-setting-draft";

const cases = [
  ["analyticsRetentionDays", 30, 730],
  ["analyticsAnomalySensitivity", 5, 50],
  ["cartAbandonmentWindowMinutes", 15, 1440],
  ["cartCooldownHours", 1, 168],
  ["cartMaxTouchesPerLead", 1, 6],
  ["cartDailyQueueLimit", 5, 500],
] as const;

test("merchant numeric bounds accept each policy minimum and maximum", () => {
  for (const [key, min, max] of cases) {
    const bounds = merchantNumericSettingBounds[key];
    assert.deepEqual(parseBoundedIntegerDraft(String(min), bounds), { ok: true, value: min });
    assert.deepEqual(parseBoundedIntegerDraft(String(max), bounds), { ok: true, value: max });
  }
});

test("merchant numeric bounds reject values outside each policy range", () => {
  for (const [key, min, max] of cases) {
    const bounds = merchantNumericSettingBounds[key];
    assert.equal(parseBoundedIntegerDraft(String(min - 1), bounds).ok, false, key);
    assert.equal(parseBoundedIntegerDraft(String(max + 1), bounds).ok, false, key);
  }
});

test("blank, non-numeric, non-finite and fractional drafts stay invalid", () => {
  const bounds = merchantNumericSettingBounds.analyticsRetentionDays;
  for (const raw of ["", "   ", "not-a-number", "Infinity", "30.5"]) {
    assert.equal(parseBoundedIntegerDraft(raw, bounds).ok, false, raw);
  }
});

test("valid drafts are not silently clamped or defaulted", () => {
  const bounds = merchantNumericSettingBounds.cartDailyQueueLimit;
  assert.deepEqual(parseBoundedIntegerDraft("25", bounds), { ok: true, value: 25 });
  const blank = parseBoundedIntegerDraft("", bounds);
  assert.equal(blank.ok, false);
  if (!blank.ok) assert.match(blank.error, /required/i);
});
