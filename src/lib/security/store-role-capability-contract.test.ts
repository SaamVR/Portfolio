import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (relativePath: string) => readFileSync(path.join(process.cwd(), relativePath), "utf8");

const capabilityMigration = read("supabase/migrations/20260914233000_store_role_capability_matrix_324.sql");
const viewerMigration = read("supabase/migrations/20260914233500_store_role_viewer_read_contract_324.sql");
const courierConnectionsRoute = read("src/app/api/couriers/connections/route.ts");
const previewTokenRoute = read("src/app/api/stores/preview-token/route.ts");
const notificationRetryRoute = read("src/app/api/notifications/retry/route.ts");
const notificationTestRoute = read("src/app/api/notifications/test/route.ts");
const courierBookingRoute = read("src/app/api/couriers/book/route.ts");
const orderStatusRoute = read("src/app/api/orders/status/route.ts");
const smokeRunner = read("scripts/run-rls-smoke.mjs");
const driftPolicy = read("supabase/migration-drift-policy.json");

test("merchant roles have separate administration, editing, and viewing predicates", () => {
  assert.match(capabilityMigration, /CREATE OR REPLACE FUNCTION public\.can_administer_store/i);
  assert.match(capabilityMigration, /role IN \('owner', 'admin', 'editor', 'viewer'\)/i);
  assert.match(capabilityMigration, /COMMENT ON FUNCTION public\.can_manage_store[\s\S]*Legacy content\/commerce editing capability/i);

  assert.match(viewerMigration, /SET search_path = pg_catalog, public/i);
  assert.match(viewerMigration, /Store team can view content site settings/i);
  assert.match(viewerMigration, /Store team can read storefront drafts/i);
  assert.match(viewerMigration, /Store admins can create preview tokens/i);
});

test("direct browser membership writes are removed from the role authority surface", () => {
  assert.match(capabilityMigration, /REVOKE INSERT, UPDATE, DELETE ON TABLE public\.store_memberships FROM PUBLIC, anon, authenticated/i);
  assert.match(capabilityMigration, /GRANT SELECT ON TABLE public\.store_memberships TO authenticated/i);
  assert.match(capabilityMigration, /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public\.store_memberships TO service_role/i);
});

test("service-role administration routes require owner or admin", () => {
  for (const source of [
    courierConnectionsRoute,
    previewTokenRoute,
    notificationRetryRoute,
    notificationTestRoute,
  ]) {
    assert.match(source, /\["owner", "admin"\]/);
    assert.doesNotMatch(source, /\["owner", "admin", "editor"\]/);
  }
});

test("day-to-day fulfillment routes remain editor-capable", () => {
  assert.match(courierBookingRoute, /\["owner", "admin", "editor"\]/);
  assert.match(orderStatusRoute, /\["owner", "admin", "editor"\]/);
});

test("role capability migrations have drift and real-RLS smoke coverage", () => {
  assert.match(smokeRunner, /store_role_capability_matrix_smoke\.sql/);
  assert.doesNotMatch(smokeRunner, /rls_smoke_can_manage_store\.sql/);

  const parsed = JSON.parse(driftPolicy) as { exceptions?: Array<{ name?: string; classification?: string }> };
  const pending = new Map((parsed.exceptions ?? []).map((entry) => [entry.name, entry.classification]));
  assert.equal(pending.get("store_role_capability_matrix_324"), "pending-production");
  assert.equal(pending.get("store_role_viewer_read_contract_324"), "pending-production");
});
