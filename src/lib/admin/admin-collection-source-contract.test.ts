import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function functionSlice(
  contents: string,
  startMarker: string,
  endMarker: string,
) {
  const start = contents.indexOf(startMarker);
  const end = contents.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `Missing ${startMarker}`);
  assert.notEqual(end, -1, `Missing ${endMarker}`);
  return contents.slice(start, end);
}

test("primary admin product list is slim, paginated, and server searched", () => {
  const hook = source("../../hooks/useAdminProducts.ts");
  const pageLoader = functionSlice(
    hook,
    "export async function fetchAdminProductPage",
    "export function useAdminProductPages",
  );
  const view = source("../../views/admin/Products.tsx");

  assert.match(pageLoader, /select\(ADMIN_PRODUCT_LIST_COLUMNS\)/);
  assert.match(pageLoader, /\.range\(range\.from, range\.to\)/);
  assert.match(pageLoader, /\.ilike\("name"/);
  assert.doesNotMatch(pageLoader, /select\("\*"\)/);
  assert.doesNotMatch(
    hook.match(/ADMIN_PRODUCT_LIST_COLUMNS =[\s\S]*?as const;/)?.[0] ?? "",
    /description|images|metric_values/,
  );
  assert.match(view, /useAdminProductPages/);
  assert.match(view, /activeStoreIdRef\.current !== storeId/);
  assert.doesNotMatch(view, /const fetchProducts =/);
});

test("primary admin orders list is slim, paginated, and server filtered", () => {
  const hook = source("../../hooks/useOrders.ts");
  const pageLoader = functionSlice(
    hook,
    "export async function fetchAdminOrderPage",
    "export function useAdminOrders",
  );
  const view = source("../../views/admin/Orders.tsx");

  assert.match(pageLoader, /select\(ADMIN_ORDER_LIST_COLUMNS\)/);
  assert.match(pageLoader, /\.range\(range\.from, range\.to\)/);
  assert.match(pageLoader, /query\.eq\("status"/);
  assert.match(pageLoader, /query\.or\(/);
  assert.doesNotMatch(pageLoader, /select\("\*"\)/);
  assert.doesNotMatch(
    hook.match(/ADMIN_ORDER_LIST_COLUMNS =[\s\S]*?as const;/)?.[0] ?? "",
    /items|shipping_address|notes/,
  );
  assert.match(view, /useAdminOrders\(/);
  assert.match(view, /activeStoreIdRef\.current !== storeId/);
  assert.doesNotMatch(view, /useAllOrders\(/);
});

test("primary admin inbox list excludes message bodies and uses an authoritative unread count", () => {
  const hook = source("../../hooks/useAdminMessages.ts");
  const pageLoader = functionSlice(
    hook,
    "export async function fetchAdminMessagePage",
    "export function useAdminMessagePages",
  );
  const view = source("../../views/admin/Messages.tsx");

  assert.match(pageLoader, /select\(ADMIN_CONTACT_MESSAGE_LIST_COLUMNS\)/);
  assert.match(pageLoader, /\.range\(range\.from, range\.to\)/);
  assert.doesNotMatch(pageLoader, /select\("\*"\)/);
  assert.equal(
    hook.includes(
      'ADMIN_CONTACT_MESSAGE_LIST_COLUMNS = "id,name,email,is_read,created_at"',
    ),
    true,
  );
  assert.match(hook, /count: "exact", head: true/);
  assert.match(view, /useAdminUnreadMessagesCount/);
  assert.doesNotMatch(view, /messages\.filter\(/);
});
