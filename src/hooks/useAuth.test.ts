import test from "node:test";
import assert from "node:assert/strict";

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= "test-publishable-key";

const { deriveAppRole, resolvePlatformRole } = await import("@/hooks/useAuth");

test("deriveAppRole grants dashboard access to merchant owners and staff", () => {
  assert.equal(deriveAppRole(null, "owner"), "admin");
  assert.equal(deriveAppRole(null, "admin"), "admin");
  assert.equal(deriveAppRole(null, "editor"), "admin");
});

test("deriveAppRole keeps merchant viewers read-only but dashboard-capable", () => {
  assert.equal(deriveAppRole(null, "viewer"), "co_admin");
});

test("deriveAppRole prioritizes platform roles when present", () => {
  assert.equal(deriveAppRole("super_admin", "viewer"), "admin");
  assert.equal(deriveAppRole("admin", "viewer"), "admin");
  assert.equal(deriveAppRole("billing_admin", "owner"), "admin");
  assert.equal(deriveAppRole("support_agent", "editor"), "admin");
  assert.equal(deriveAppRole("co_admin", "owner"), "co_admin");
});

test("deriveAppRole returns null without platform or store access", () => {
  assert.equal(deriveAppRole(null, null), null);
});

test("resolvePlatformRole picks the first platform role row when multiple roles exist", () => {
  assert.equal(resolvePlatformRole([{ role: "admin" }, { role: "billing_admin" }] as never), "admin");
  assert.equal(resolvePlatformRole([{ role: "support_agent" }] as never), "support_agent");
  assert.equal(resolvePlatformRole([],), null);
});
