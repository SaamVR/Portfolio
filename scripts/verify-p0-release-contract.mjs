import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const failures = [];
const pass = [];

function requireMatch(name, file, pattern) {
  if (!exists(file)) return failures.push(`${name}: missing ${file}`);
  if (!pattern.test(read(file))) return failures.push(`${name}: contract missing in ${file}`);
  pass.push(name);
}

function requireNoMatch(name, file, pattern) {
  if (!exists(file)) return failures.push(`${name}: missing ${file}`);
  if (pattern.test(read(file))) return failures.push(`${name}: forbidden contract remains in ${file}`);
  pass.push(name);
}

function functionBlock(file, functionName) {
  if (!exists(file)) return "";
  const source = read(file);
  const marker = `CREATE OR REPLACE FUNCTION public.${functionName}`;
  const start = source.indexOf(marker);
  if (start < 0) return "";
  const next = source.indexOf("\nCREATE OR REPLACE FUNCTION public.", start + marker.length);
  return source.slice(start, next < 0 ? source.length : next);
}
const orderMigration = "supabase/migrations/20260914201500_p0_authoritative_order_boundary.sql";
const paymentMigration = "supabase/migrations/20260914203000_payment_reservation_lifecycle_317_327.sql";
const inviteMigration = "supabase/migrations/20260914200500_atomic_invite_claim_authority_323.sql";
const driftPolicy = "supabase/migration-drift-policy.json";
const orderRoute = "src/app/api/orders/create/route.ts";
const registrationWizard = "src/components/auth/MerchantRegistrationWizard.tsx";
const r4ManualReplayMigration = "supabase/migrations/20260914205500_storefront_manual_payment_replay_guard.sql";
const backupRestore = "src/lib/store-backup-restore.ts";

requireMatch("order-v3-exists", orderMigration, /create_store_order_authoritative_v3/i);
requireMatch("delivery-zone-membership", orderMigration, /primary_(?:zone_(?:cities|aliases)|city_aliases)/i);
requireMatch("manual-payment-structured", orderMigration, /manual_payment_(?:reference|provider)/i);
if (exists(orderMigration)) {
  requireMatch("manual-payment-backup-provider", backupRestore, /manual_payment_provider/i);
  requireMatch("manual-payment-backup-reference", backupRestore, /manual_payment_reference/i);
}
requireMatch("payment-wraps-v3", paymentMigration, /create_store_order_authoritative_v3/i);
requireNoMatch("payment-does-not-wrap-v2", paymentMigration, /create_store_order_with_stock_v2/i);
requireMatch("route-uses-lifecycle", orderRoute, /create_store_order_with_payment_lifecycle/i);
requireNoMatch("route-no-v2", orderRoute, /create_store_order_with_stock_v2/i);

requireMatch("new-store-delivery-nonauthoritative", registrationWizard, /deliveryEnabled:\s*false/i);

if (exists(r4ManualReplayMigration)) {
  const manualClaimBody = functionBlock(r4ManualReplayMigration, "claim_storefront_manual_payment_reference");
  if (/NEW\.manual_payment_reference/i.test(manualClaimBody)) pass.push("r4-manual-claim-uses-structured-reference");
  else failures.push("r4-manual-claim-uses-structured-reference: new-order replay guard does not consume NEW.manual_payment_reference");
  if (/NEW\.notes/i.test(manualClaimBody)) failures.push("r4-manual-claim-no-live-notes-parsing: live trigger still parses NEW.notes");
  else pass.push("r4-manual-claim-no-live-notes-parsing");
  const orderSource = exists(orderMigration) ? read(orderMigration) : "";
  const r4Source = read(r4ManualReplayMigration);
  const canonicalTokenGrammar = /\^\[A-Z0-9_\-\]\{4,50\}\$/;
  if (canonicalTokenGrammar.test(orderSource) && canonicalTokenGrammar.test(r4Source)) pass.push("manual-payment-grammar-aligned");
  else failures.push("manual-payment-grammar-aligned: both authoritative order and replay ledger must use canonical ^[A-Z0-9_-]{4,50}$ token grammar");
}

const cancelBody = functionBlock(paymentMigration, "handle_order_cancellation");
const prepareBody = functionBlock(paymentMigration, "prepare_storefront_payment_attempt");
if (/(?:OLD\.reservation_state\s+IS\s+DISTINCT\s+FROM\s+'released'|OLD\.reservation_released_at\s+IS\s+NULL|NEW\.reservation_state\s*(?:<>|IS\s+DISTINCT\s+FROM)\s*'released')/i.test(cancelBody)) pass.push("release-at-most-once");
else failures.push("release-at-most-once: cancellation lacks a durable already-released guard");

if (/storefront_payment_attempts/i.test(cancelBody) && /executing/i.test(cancelBody) && /reconciliation_required/i.test(cancelBody)) pass.push("uncertain-cancel-block");
else failures.push("uncertain-cancel-block: cancellation does not guard unresolved payment attempts");

if (/(?:state\s*=\s*'succeeded'|state\s+IN\s*\([^)]*'succeeded')/i.test(prepareBody)) pass.push("terminal-success-guard");
else failures.push("terminal-success-guard: prepare attempt does not bar an already-succeeded obligation");
requireMatch("invite-atomic-rpc", inviteMigration, /claim_invite_code_atomic/i);
requireMatch(
  "invite-owner-rejected",
  inviteMigration,
  /(?:CHECK\s*\([\s\S]{0,220}role[\s\S]{0,220}(?:admin|editor|viewer)|v_store_invite\.role\s*(?:=\s*'owner'|NOT\s+IN))/i,
);
requireMatch("invite-service-only", inviteMigration, /REVOKE ALL ON FUNCTION public\.claim_invite_code_atomic[\s\S]*authenticated[\s\S]*GRANT EXECUTE[\s\S]*service_role/i);

for (const migrationName of [
  "lock_store_invoice_client_authority_308",
  "manual_bkash_transaction_replay_guard_314",
  "atomic_invite_claim_authority_323",
  "p0_authoritative_order_boundary",
  "payment_reservation_lifecycle_317_327",
]) {
  requireMatch(`drift:${migrationName}`, driftPolicy, new RegExp(migrationName));
}

const scanRoots = ["src", "supabase/functions"];
const legacyRuntimeRefs = [];
function walk(dir) {
  if (!exists(dir)) return;
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(rel);
    else if (/\.(?:ts|tsx|js|mjs)$/.test(entry.name) && !/\.(?:test|spec)\.[^.]+$/.test(entry.name)) {
      if (/create_store_order_with_stock_v2/.test(read(rel))) legacyRuntimeRefs.push(rel);
    }
  }
}
scanRoots.forEach(walk);
if (legacyRuntimeRefs.length) failures.push(`legacy-v2-runtime-references: ${legacyRuntimeRefs.join(", ")}`);
else pass.push("legacy-v2-runtime-references");

console.log(`P0 release contract checks passed: ${pass.length}`);
for (const item of pass) console.log(`  PASS ${item}`);

if (failures.length) {
  console.error(`P0 release contract checks failed: ${failures.length}`);
  for (const item of failures) console.error(`  FAIL ${item}`);
  process.exitCode = 1;
} else {
  console.log("P0 RELEASE CONTRACT: PASS");
}
