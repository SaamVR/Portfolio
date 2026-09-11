import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = (file: string) => readFileSync(path.join(root, file), "utf8");

test("storefront cards do not synthesize ratings, badges, MOQ, rewards, or cart options", () => {
  const generalCatalog = source("src/components/storefront/general-catalog/GeneralCatalogProductCard.tsx");
  const inquiry = source("src/components/storefront/inquiry/InquiryProductCard.tsx");
  const subscription = source("src/components/storefront/subscriptions/SubscriptionProductCard.tsx");
  const cart = source("src/components/CartDrawer.tsx");

  for (const forbidden of ["reviewStats?.average ?? 4.8", 'return "New"', 'return "Bestseller"']) {
    assert.equal(generalCatalog.includes(forbidden), false, `general catalog must not synthesize: ${forbidden}`);
  }

  for (const forbidden of ["reviewStats?.average ?? 4.8", 'return "Best Seller"', 'return "MOQ Ready"', "deriveMoq("]) {
    assert.equal(inquiry.includes(forbidden), false, `inquiry card must not synthesize: ${forbidden}`);
  }

  for (const forbidden of [
    "price_delta ?? 0",
    'variantLabel || "Subscription"',
    "selectedDuration?.price ?? product.price",
  ]) {
    assert.equal(subscription.includes(forbidden), false, `subscription card hardening must fail closed instead of synthesizing: ${forbidden}`);
  }

  for (const forbidden of ["earn_rate || 0.05", "Frequently Bought Together", "|| 'One Size'", '|| "One Size"']) {
    assert.equal(cart.includes(forbidden), false, `cart must not synthesize: ${forbidden}`);
  }

  assert.match(subscription, /Subscription pricing is not configured for this item yet\./);
  assert.match(cart, /loyaltyEarnRate !== null/);
});


test("product reviews and related products require authoritative evidence", () => {
  const reviews = source("src/components/ProductReviews.tsx");
  const related = source("src/components/RelatedProducts.tsx");

  for (const forbidden of ["generateSeededReviews", "-seeded-", "Seeded pseudo-random reviews"]) {
    assert.equal(reviews.includes(forbidden), false, `product reviews must not synthesize social proof: ${forbidden}`);
  }
  assert.match(reviews, /const allReviews = realReviews/);

  for (const forbidden of ["BUNDLE & SAVE 10%", "Frequently Bought Together"]) {
    assert.equal(related.includes(forbidden), false, `related products must not synthesize promotions: ${forbidden}`);
  }
  assert.match(related, /You may also like/);
});

test("PDP summary rating omits unsupported social proof", () => {
  const detail = source("src/components/storefront/product/ProductDetailRenderer.tsx");
  assert.equal(detail.includes("value ?? 4.8"), false);
  assert.match(detail, /if \(rating === null\) return null/);
});

test("shop rating filters and Top Rated sort require authoritative ratings", () => {
  const shop = source("src/components/storefront/shop/ContextAwareShopPage.tsx");

  assert.equal(shop.includes("?? 4.6"), false);
  assert.match(shop, /rating: number \| null/);
  assert.match(shop, /rating === null \? \[\] : \[String\(Math\.floor\(rating\)\)\]/);
  assert.match(shop, /hasAuthoritativeRatings/);
  assert.match(shop, /option !== "rating" \|\| hasAuthoritativeRatings/);
});

test("testimonials and trust blocks never manufacture social proof", () => {
  const blocks = source("src/components/storefront/StorefrontBlockRenderer.tsx");

  for (const forbidden of [
    'review.author_name || "Verified customer"',
    "Number(review.rating) || 5",
    "review.rating ?? 5",
    'label: "Flexible fulfillment"',
    'label: "Clear checkout"',
    'label: "Support terms"',
  ]) {
    assert.equal(blocks.includes(forbidden), false, `storefront blocks must not synthesize: ${forbidden}`);
  }

  assert.match(blocks, /if \(displayBadges.length === 0\) return null/);
  assert.match(blocks, /rawRating >= 1 && rawRating <= 5/);
  assert.match(blocks, /review\.name \? <p/);
});
