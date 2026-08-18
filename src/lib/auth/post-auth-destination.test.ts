import assert from "node:assert/strict";
import test from "node:test";
import {
  resolvePostAuthDestination,
  sanitizeInternalReturnPath,
} from "./post-auth-destination";

test("rejects external and scheme-relative return paths", () => {
  assert.equal(sanitizeInternalReturnPath("https://evil.example/path"), null);
  assert.equal(sanitizeInternalReturnPath("//evil.example/path"), null);
  assert.equal(sanitizeInternalReturnPath("/\\evil.example"), null);
  assert.equal(sanitizeInternalReturnPath("/admin/orders?status=pending"), "/admin/orders?status=pending");
});

test("platform users always return to the control plane", () => {
  assert.deepEqual(
    resolvePostAuthDestination({
      identity: { platformRole: "support_agent", hasMerchantAccess: false },
      intent: "customer",
      requestedNext: "/stores/demo/checkout",
    }),
    { kind: "platform", path: "/cms-admin", reason: "platform-role" },
  );

  assert.equal(
    resolvePostAuthDestination({
      identity: { platformRole: "admin", hasMerchantAccess: true },
      requestedNext: "/cms-admin?tab=billing",
    }).path,
    "/cms-admin?tab=billing",
  );

  assert.equal(
    resolvePostAuthDestination({
      identity: { platformRole: "billing_admin", hasMerchantAccess: false },
      requestedNext: "/admin/orders",
    }).path,
    "/cms-admin",
  );
});

test("merchant users return to their store dashboard and preserve safe admin deep links", () => {
  assert.equal(
    resolvePostAuthDestination({
      identity: { platformRole: null, hasMerchantAccess: true },
      requestedNext: "/stores/another-shop/account",
    }).path,
    "/admin",
  );

  assert.equal(
    resolvePostAuthDestination({
      identity: { platformRole: null, hasMerchantAccess: true },
      requestedNext: "/admin/orders?status=pending",
    }).path,
    "/admin/orders?status=pending",
  );

  assert.equal(
    resolvePostAuthDestination({
      identity: { platformRole: "co_admin", hasMerchantAccess: false },
      requestedNext: "/cms-admin",
    }).path,
    "/admin",
  );
});

test("customer-only users return to their storefront account", () => {
  const destination = resolvePostAuthDestination({
    identity: {
      platformRole: null,
      hasMerchantAccess: false,
      customerStores: [
        { storeId: "store-a", slug: "alpha-shop", updatedAt: "2026-08-10T00:00:00Z" },
        { storeId: "store-b", slug: "beta-shop", updatedAt: "2026-08-12T00:00:00Z" },
      ],
    },
  });

  assert.equal(destination.kind, "customer");
  assert.equal(destination.path, "/stores/beta-shop/account");
});

test("customer store hint selects the matching storefront and safe purchase return", () => {
  const identity = {
    platformRole: null,
    hasMerchantAccess: false,
    customerStores: [
      { storeId: "store-a", slug: "alpha-shop", updatedAt: "2026-08-10T00:00:00Z" },
      { storeId: "store-b", slug: "beta-shop", updatedAt: "2026-08-12T00:00:00Z" },
    ],
  };

  assert.equal(
    resolvePostAuthDestination({ identity, storeSlugHint: "alpha-shop" }).path,
    "/stores/alpha-shop/account",
  );
  assert.equal(
    resolvePostAuthDestination({
      identity,
      intent: "customer",
      storeSlugHint: "alpha-shop",
      requestedNext: "/stores/alpha-shop/checkout",
    }).path,
    "/stores/alpha-shop/checkout",
  );
});

test("unassigned identities preserve the explicit onboarding intent", () => {
  const identity = { platformRole: null, hasMerchantAccess: false, customerStores: [] };

  assert.equal(
    resolvePostAuthDestination({
      identity,
      intent: "merchant-signup",
      requestedNext: "/signup?entry=dashboard&planId=basic",
    }).path,
    "/signup?entry=dashboard&planId=basic",
  );

  assert.equal(
    resolvePostAuthDestination({ identity, intent: "dashboard" }).path,
    "/admin/login?mode=invite&signedIn=1",
  );

  assert.equal(
    resolvePostAuthDestination({
      identity,
      intent: "customer",
      storeSlugHint: "demo-store",
      requestedNext: "/stores/demo-store/account",
    }).path,
    "/stores/demo-store/account",
  );
});

test("customer return paths cannot escape into privileged application surfaces", () => {
  const identity = {
    platformRole: null,
    hasMerchantAccess: false,
    customerStores: [{ storeId: "store-a", slug: "alpha-shop" }],
  };

  for (const requestedNext of [
    "/cms-admin?tab=overview",
    "/cms-admin#billing",
    "/admin/orders",
    "/admin#orders",
    "/signup?entry=dashboard",
    "/api/auth/destination",
    "/auth/redirect?intent=dashboard",
  ]) {
    assert.equal(
      resolvePostAuthDestination({ identity, intent: "customer", requestedNext }).path,
      "/stores/alpha-shop/account",
      `customer must not be redirected to ${requestedNext}`,
    );
  }
});
