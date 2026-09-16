import test from "node:test";
import assert from "node:assert/strict";
import { canExposePublicStorefront } from "@/lib/storefront-public-access";

test("published legacy stores remain publicly accessible", () => {
  assert.equal(canExposePublicStorefront({
    isPublished: true,
    hasSubscription: false,
    planLive: false,
  }), true);
});

test("subscription eligibility never publishes a draft storefront", () => {
  assert.equal(canExposePublicStorefront({
    isPublished: false,
    hasSubscription: true,
    planLive: true,
  }), false);
});

test("published subscribed stores require a live plan", () => {
  assert.equal(canExposePublicStorefront({
    isPublished: true,
    hasSubscription: true,
    planLive: false,
  }), false);
  assert.equal(canExposePublicStorefront({
    isPublished: true,
    hasSubscription: true,
    planLive: true,
  }), true);
});
