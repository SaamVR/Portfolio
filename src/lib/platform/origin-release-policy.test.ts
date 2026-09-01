import test from "node:test";
import assert from "node:assert/strict";
import { normalizeReleaseSha, selectReleaseOrigin } from "../../../cloudflare/ezcomo-origin-failover/release-policy.ts";

const EXPECTED = "a".repeat(40);
const OTHER = "b".repeat(40);
const ok = (release: string | null) => ({ ok: true, release });
const down = { ok: false, release: null };

test("release policy normalizes exact full SHAs", () => {
  assert.equal(normalizeReleaseSha(EXPECTED.toUpperCase()), EXPECTED);
  assert.equal(normalizeReleaseSha("abc1234"), null);
  assert.equal(normalizeReleaseSha("g".repeat(40)), null);
});

test("release policy preserves compatibility mode only when expected release is unset", () => {
  const result = selectReleaseOrigin({ expectedRelease: "", primary: ok(OTHER), fallback: ok(EXPECTED) });
  assert.equal(result.selection, "compatibility");
  assert.equal(result.reason, "expected_unset");

  const invalid = selectReleaseOrigin({ expectedRelease: "not-a-sha", primary: ok(EXPECTED), fallback: ok(EXPECTED) });
  assert.equal(invalid.selection, "degraded");
  assert.equal(invalid.reason, "expected_invalid");
});

test("release policy prefers matching primary and otherwise matching fallback", () => {
  const primary = selectReleaseOrigin({ expectedRelease: EXPECTED, primary: ok(EXPECTED), fallback: ok(EXPECTED) });
  assert.equal(primary.selection, "primary");
  assert.equal(primary.primaryMatches, true);
  assert.equal(primary.fallbackMatches, true);

  const fallback = selectReleaseOrigin({ expectedRelease: EXPECTED, primary: ok(OTHER), fallback: ok(EXPECTED) });
  assert.equal(fallback.selection, "fallback");
  assert.equal(fallback.primaryMatches, false);
  assert.equal(fallback.fallbackMatches, true);
});

test("release policy degrades when no healthy origin proves the expected release", () => {
  const stale = selectReleaseOrigin({ expectedRelease: EXPECTED, primary: ok(OTHER), fallback: ok(OTHER) });
  assert.equal(stale.selection, "degraded");
  assert.equal(stale.reason, "no_match");

  const unavailable = selectReleaseOrigin({ expectedRelease: EXPECTED, primary: down, fallback: down });
  assert.equal(unavailable.selection, "degraded");
});
