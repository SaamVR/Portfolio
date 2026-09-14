import assert from "node:assert/strict";
import test from "node:test";
import {
  isDatabaseUniqueViolation,
  isValidManualBkashTransactionId,
  normalizeManualBkashTransactionId,
} from "./provider-transaction-id";

test("normalizes manual bKash transaction identity", () => {
  assert.equal(normalizeManualBkashTransactionId("  trxAbc123  "), "TRXABC123");
});

test("validates bounded transaction identity without embedded whitespace", () => {
  assert.equal(isValidManualBkashTransactionId("trx123"), true);
  assert.equal(isValidManualBkashTransactionId(" trx 123 "), false);
  assert.equal(isValidManualBkashTransactionId("trx-123"), false);
  assert.equal(isValidManualBkashTransactionId("ট্রেক্স123"), false);
  assert.equal(isValidManualBkashTransactionId(""), false);
  assert.equal(isValidManualBkashTransactionId("x".repeat(129)), false);
});

test("detects postgres unique violations", () => {
  assert.equal(isDatabaseUniqueViolation({ code: "23505" }), true);
  assert.equal(isDatabaseUniqueViolation({ code: "23503" }), false);
  assert.equal(isDatabaseUniqueViolation(null), false);
});
