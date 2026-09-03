import test from "node:test";
import assert from "node:assert/strict";
import { productUrl, storefrontPath } from "@/lib/slug";
import {
  getDedicatedStorefrontRedirectPath,
  toCanonicalStorefrontPath,
  toPublicStorefrontPath,
} from "@/lib/storefront-routing";

test("storefront URL builders are deterministic scoped routes", () => {
  assert.equal(storefrontPath("/", "sam"), "/stores/sam");
  assert.equal(storefrontPath("/cart", "sam"), "/stores/sam/cart");
  assert.equal(storefrontPath("/shop?category=Skin%20Care", "sam"), "/stores/sam/shop?category=Skin%20Care");
  assert.equal(storefrontPath("/admin/products", "sam"), "/admin/products");
  assert.equal(storefrontPath("https://example.com/path", "sam"), "https://example.com/path");
  assert.equal(
    productUrl("11111111-1111-1111-1111-111111111111", "Centella Cream", "sam"),
    "/stores/sam/product/centella-cream--11111111-1111-1111-1111-111111111111",
  );
});

test("dedicated storefront routing exposes one canonical internal pathname", () => {
  assert.equal(toCanonicalStorefrontPath("/", "sam"), "/stores/sam");
  assert.equal(toCanonicalStorefrontPath("/cart", "sam"), "/stores/sam/cart");
  assert.equal(toCanonicalStorefrontPath("/stores/sam/cart", "sam"), "/stores/sam/cart");
  assert.equal(toCanonicalStorefrontPath("/admin/products", "sam"), "/admin/products");
});

test("dedicated public paths strip tenant scope and normalize auth next destinations", () => {
  assert.equal(toPublicStorefrontPath("/stores/sam", "sam", "dedicated"), "/");
  assert.equal(toPublicStorefrontPath("/stores/sam/cart", "sam", "dedicated"), "/cart");
  assert.equal(
    toPublicStorefrontPath(
      "/stores/sam/auth?next=%2Fstores%2Fsam%2Faccount",
      "sam",
      "dedicated",
    ),
    "/auth?next=%2Faccount",
  );
});

test("scoped storefront mode preserves explicit tenant URLs", () => {
  assert.equal(toPublicStorefrontPath("/stores/sam/cart", "sam", "scoped"), "/stores/sam/cart");
  assert.equal(
    toPublicStorefrontPath("/stores/sam/auth?next=%2Fstores%2Fsam%2Faccount", "sam", "scoped"),
    "/stores/sam/auth?next=%2Fstores%2Fsam%2Faccount",
  );
});

test("dedicated hosts redirect directly requested scoped URLs back to the short public route", () => {
  assert.equal(getDedicatedStorefrontRedirectPath("sam", "/stores/sam"), "/");
  assert.equal(getDedicatedStorefrontRedirectPath("sam", "/stores/sam/shop"), "/shop");
  assert.equal(getDedicatedStorefrontRedirectPath("sam", "/stores/other/shop"), null);
  assert.equal(getDedicatedStorefrontRedirectPath("sam", "/shop"), null);
});
