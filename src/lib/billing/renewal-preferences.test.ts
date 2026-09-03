import assert from "node:assert/strict";
import test from "node:test";
import { normalizeRenewalPhone, supportsRenewalPreferences } from "./renewal-preferences";

test("normalizes Bangladesh and international renewal phones", () => {
  assert.equal(normalizeRenewalPhone("01712-345678"), "+8801712345678");
  assert.equal(normalizeRenewalPhone("8801712345678"), "+8801712345678");
  assert.equal(normalizeRenewalPhone("008801712345678"), "+8801712345678");
  assert.equal(normalizeRenewalPhone("+1 (415) 555-2671"), "+14155552671");
});

test("rejects malformed renewal phones", () => {
  assert.equal(normalizeRenewalPhone(""), null);
  assert.equal(normalizeRenewalPhone("123"), null);
  assert.equal(normalizeRenewalPhone("+0123456789"), null);
  assert.equal(normalizeRenewalPhone(null), null);
});

test("renewal preferences are not offered on the free plan", () => {
  assert.equal(supportsRenewalPreferences("free"), false);
  assert.equal(supportsRenewalPreferences("basic"), true);
  assert.equal(supportsRenewalPreferences("advanced"), true);
});
