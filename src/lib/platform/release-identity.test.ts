import test from "node:test";
import assert from "node:assert/strict";
import { normalizeReleaseSha, resolveReleaseIdentity } from "./release-identity";

const VERCEL = "A".repeat(40);
const RENDER = "b".repeat(40);
const EXPLICIT = "c".repeat(40);

test("normalizeReleaseSha accepts only full Git SHA values", () => {
  assert.equal(normalizeReleaseSha(VERCEL), VERCEL.toLowerCase());
  assert.equal(normalizeReleaseSha(` ${RENDER} `), RENDER);
  assert.equal(normalizeReleaseSha("abc1234"), null);
  assert.equal(normalizeReleaseSha("z".repeat(40)), null);
  assert.equal(normalizeReleaseSha(null), null);
});

test("resolveReleaseIdentity uses provider precedence without leaking malformed fallback data", () => {
  assert.equal(resolveReleaseIdentity({ VERCEL_GIT_COMMIT_SHA: VERCEL, RENDER_GIT_COMMIT: RENDER }), VERCEL.toLowerCase());
  assert.equal(resolveReleaseIdentity({ RENDER_GIT_COMMIT: RENDER, EZCOMO_RELEASE_SHA: EXPLICIT }), RENDER);
  assert.equal(resolveReleaseIdentity({ EZCOMO_RELEASE_SHA: EXPLICIT }), EXPLICIT);
  assert.equal(resolveReleaseIdentity({ VERCEL_GIT_COMMIT_SHA: "not-a-sha", RENDER_GIT_COMMIT: RENDER }), null);
  assert.equal(resolveReleaseIdentity({}), null);
});
