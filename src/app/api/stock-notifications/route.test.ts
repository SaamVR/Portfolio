import { readFileSync } from "node:fs";
import { describe, expect, it } from "@/test/test-utils";
import {
  buildStockNotificationRateLimitKeys,
  buildStockNotificationRateLimitResponse,
  getStockNotificationRequestIp,
  isStockNotificationEligible,
  parseStockNotificationInput,
} from "./route";

const migrationSource = readFileSync(
  new URL("../../../../supabase/migrations/20260830015000_stock_notification_server_boundary_178.sql", import.meta.url),
  "utf8",
);

const productPageSource = readFileSync(
  new URL("../../../views/ProductDetail.tsx", import.meta.url),
  "utf8",
);

const routeSource = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

describe("stock notification server boundary", () => {
  it("normalizes email and rejects malformed input", () => {
    const parsed = parseStockNotificationInput({
      storeId: "11111111-1111-4111-8111-111111111111",
      productId: "22222222-2222-4222-8222-222222222222",
      email: " USER@Example.com ",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.email).toBe("user@example.com");
    expect(parseStockNotificationInput({ storeId: "bad", productId: "bad", email: "nope" }).success).toBe(false);
  });

  it("accepts authoritative store-owned unavailable state from either stock signal", () => {
    const storeId = "11111111-1111-4111-8111-111111111111";
    expect(isStockNotificationEligible({ store_id: storeId, stock: 0, is_available: true }, storeId)).toBe(true);
    expect(isStockNotificationEligible({ store_id: storeId, stock: 2, is_available: false }, storeId)).toBe(true);
    expect(isStockNotificationEligible({ store_id: storeId, stock: 2, is_available: true }, storeId)).toBe(false);
    expect(isStockNotificationEligible({ store_id: "33333333-3333-4333-8333-333333333333", stock: 0, is_available: false }, storeId)).toBe(false);
  });

  it("trusts only Vercel-managed forwarding metadata", () => {
    expect(getStockNotificationRequestIp(new Request("https://example.test", {
      headers: {
        "x-vercel-forwarded-for": "203.0.113.10, 10.0.0.1",
        "x-forwarded-for": "198.51.100.20",
      },
    }))).toBe("203.0.113.10");
    expect(getStockNotificationRequestIp(new Request("https://example.test", {
      headers: { "x-forwarded-for": "198.51.100.20" },
    }))).toBeNull();
  });

  it("uses privacy-conscious requester/store/product/email limiter keys", () => {
    const keys = buildStockNotificationRateLimitKeys(
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
      "USER@Example.com",
      "203.0.113.10",
    );
    expect(keys.email).not.toContain("user@example.com");
    expect(keys.requester).not.toContain("203.0.113.10");
    expect(keys.store).toContain("stock:store:");
    expect(keys.product).toContain("22222222-2222-4222-8222-222222222222");
  });

  it("returns deterministic retry metadata", () => {
    const now = Date.now();
    const response = buildStockNotificationRateLimitResponse([
      { success: false, reset: now + 30_000 },
      { success: false, reset: now + 60_000 },
    ]);
    expect(response?.resetAt).toBe(now + 60_000);
    expect(response?.retryAfter).toBeGreaterThanOrEqual(59);
  });

  it("removes anonymous direct insert and allows only one active normalized signup", () => {
    expect(migrationSource).toContain('drop policy if exists "Anyone can insert store stock notifications"');
    expect(migrationSource).toContain("revoke insert on table public.stock_notifications from anon");
    expect(migrationSource).toContain("stock_notifications_active_product_email_key");
    expect(migrationSource).toContain("where notified = false");
    expect(migrationSource).toContain("Store staff can manage stock notifications");
  });

  it("keeps delivery truth false during signup", () => {
    expect(routeSource).toContain("notified: false");
    expect(routeSource).not.toContain("notified: true");
    expect(migrationSource).toContain("must only be set after successful durable email delivery");
  });

  it("wires the sold-out storefront through the server route rather than direct Supabase writes", () => {
    expect(productPageSource).toContain("StockNotificationSignup");
    expect(productPageSource).not.toContain('.from("stock_notifications")');
  });

  it("maps malformed and oversized JSON at the request boundary", () => {
    expect(routeSource).toContain("const MAX_BODY_BYTES = 4000");
    expect(routeSource).toContain('error: "Invalid JSON payload"');
    expect(routeSource).toContain('error: "Stock notification request is too large"');
    expect(routeSource).toContain('Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES');
  });

});
