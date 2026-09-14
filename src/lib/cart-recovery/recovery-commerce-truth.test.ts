import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = (file: string) => readFileSync(path.join(root, file), "utf8");

test("public recovery lead writes cannot author merchant coupon identity", () => {
  const lead = source("src/app/api/cart-recovery/lead/route.ts");
  assert.equal(lead.includes("body?.recoveryCouponCode"), false);
  assert.equal(lead.includes("recovery_coupon_code: recoveryCouponCode"), false);
});

test("recovery queue never fabricates a coupon from a prefix", () => {
  const queue = source("src/app/api/cart-recovery/queue/route.ts");
  assert.equal(queue.includes("normalized.couponPrefix"), false);
  assert.equal(queue.includes("lead.id.slice(0, 6).toUpperCase()"), false);
  assert.match(queue, /\.from\("coupon_codes"\)/);
  assert.match(queue, /isRecoveryCouponUsable\(coupon, lead\.cart_value/);
});

test("recovery settings do not advertise unsupported automatic coupon creation", () => {
  const settings = source("src/lib/admin/merchant-growth-settings.ts");
  const admin = source("src/views/admin/CartRecovery.tsx");
  assert.equal(settings.includes("couponPrefix"), false);
  assert.equal(admin.includes("cart-coupon-prefix"), false);
});

test("send-email supports cart recovery without inventing a discount", () => {
  const email = source("supabase/functions/send-email/index.ts");
  assert.match(email, /"cart-recovery": \(data\) =>/);
  assert.match(email, /const couponLine = couponCode/);
  assert.match(email, /Eligibility is rechecked when you order\./);
});


test("automated recovery queues only deliverable email outreach", () => {
  const settings = source("src/lib/admin/merchant-growth-settings.ts");
  const queue = source("src/app/api/cart-recovery/queue/route.ts");
  const admin = source("src/views/admin/CartRecovery.tsx");

  assert.match(settings, /preferredChannel: "email"/);
  assert.doesNotMatch(settings, /"smart" \| "email" \| "whatsapp"/);
  assert.match(queue, /const hasDeliverableEmail = Boolean\(lead\.contact_email\)/);
  assert.match(queue, /channel: "email"/);
  assert.doesNotMatch(queue, /lead\.contact_phone \? "whatsapp"/);
  assert.doesNotMatch(admin, /<SelectItem value="whatsapp">/);
  assert.match(admin, /Automated WhatsApp recovery is unavailable/);
});


test("cart recovery request boundaries reject malformed or oversized JSON before database work", () => {
  const lead = source("src/app/api/cart-recovery/lead/route.ts");
  const queue = source("src/app/api/cart-recovery/queue/route.ts");

  assert.match(lead, /return NextResponse\.json\(\{ error: "Invalid JSON payload" \}, \{ status: 400 \}\)/);
  assert.match(queue, /const maxQueueBodyBytes = 16_000/);
  assert.match(queue, /Buffer\.byteLength\(rawBody, "utf8"\) > maxQueueBodyBytes/);
  assert.match(queue, /return NextResponse\.json\(\{ error: "Invalid JSON payload" \}, \{ status: 400 \}\)/);
  assert.match(queue, /if \(!uuidPattern\.test\(storeId\)\)/);
});


test("cart recovery delivery rows are server-governed rather than merchant-authored", () => {
  const migration = source("supabase/migrations/20260914223000_lock_cart_recovery_message_mutations.sql");
  const smoke = source("supabase/migrations/commerce_hardening_smoke.sql");

  assert.match(migration, /REVOKE INSERT, UPDATE, DELETE[\s\S]*store_cart_recovery_messages[\s\S]*FROM anon, authenticated/i);
  assert.match(migration, /DROP POLICY IF EXISTS "Store staff can manage cart recovery messages"/);
  assert.match(migration, /cmd IN \('ALL', 'INSERT', 'UPDATE', 'DELETE'\)/);
  assert.match(smoke, /client roles still have direct cart-recovery message mutation privileges/);
});


test("scheduled recovery touches are idempotent under concurrent queue requests", () => {
  const queue = source("src/app/api/cart-recovery/queue/route.ts");
  const migration = source("supabase/migrations/20260914224000_dedupe_cart_recovery_scheduled_touches.sql");

  assert.match(queue, /scheduled_for: lead\.next_contact_at/);
  assert.match(queue, /\.upsert\(inserts, \{/);
  assert.match(queue, /onConflict: "store_id,lead_id,scheduled_for"/);
  assert.match(queue, /ignoreDuplicates: true/);
  assert.match(migration, /ALTER COLUMN scheduled_for SET NOT NULL/);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_recovery_messages_scheduled_touch_unique[\s\S]*store_id, lead_id, scheduled_for/);
});


test("recovery analytics use authoritative product truth instead of browser totals", () => {
  const lead = source("src/app/api/cart-recovery/lead/route.ts");

  assert.match(lead, /normalizeRecoveryCartInput\(body\?\.cartSnapshot\)/);
  assert.match(lead, /\.select\("id, name, price, is_available"\)[\s\S]*?\.eq\("store_id", storeId\)/);
  assert.match(lead, /buildAuthoritativeRecoveryCart\(cartInput, products\)/);
  assert.match(lead, /const subtotal = authoritativeCart\.cartValue/);
  assert.match(lead, /const itemCount = authoritativeCart\.itemCount/);
  assert.doesNotMatch(lead, /body\?\.cartValue/);
  assert.doesNotMatch(lead, /body\?\.itemCount/);
});
