import assert from "node:assert/strict";
import test from "node:test";
import { resolveStorefrontMobilePrimaryAction } from "@/lib/storefront-platform/mobile/mobile-action";
import { MOBILE_STOREFRONT_VIEWPORTS, getStorefrontViewportTier, isPrimaryTouchTargetCompliant } from "@/lib/storefront-platform/mobile/mobile-viewport";

test("360, 390, and 430 are explicit compact-mobile baselines", () => {
  assert.deepEqual(MOBILE_STOREFRONT_VIEWPORTS, [360, 390, 430]);
  for (const width of MOBILE_STOREFRONT_VIEWPORTS) assert.equal(getStorefrontViewportTier(width), "compact-mobile");
});

test("mobile primary actions keep a 48px target", () => {
  const action = resolveStorefrontMobilePrimaryAction({ storefrontProfile: { template_id: "general-catalog" } });
  assert.equal(action.touchTargetPx, 48);
  assert.equal(isPrimaryTouchTargetCompliant(action.touchTargetPx), true);
});

test("commerce, booking, service, property, and digital storefronts resolve contextual actions", () => {
  assert.equal(resolveStorefrontMobilePrimaryAction({ storefrontProfile: { template_id: "general-catalog" } }).kind, "cart");
  assert.equal(resolveStorefrontMobilePrimaryAction({ storefrontProfile: { template_id: "single-product" } }).kind, "buy");
  assert.equal(resolveStorefrontMobilePrimaryAction({ storefrontProfile: { template_id: "booking" } }).kind, "book");
  assert.equal(resolveStorefrontMobilePrimaryAction({ storefrontProfile: { template_id: "service" } }).kind, "contact");
  assert.equal(resolveStorefrontMobilePrimaryAction({ storefrontProfile: { template_id: "real-estate" } }).kind, "contact");
  assert.equal(resolveStorefrontMobilePrimaryAction({ storefrontProfile: { template_id: "digital-downloads" } }).kind, "digital");
});

test("WhatsApp-assisted contact actions use the configured direct channel", () => {
  const action = resolveStorefrontMobilePrimaryAction({
    storefrontProfile: { template_id: "service", checkout_mode: "whatsapp" },
    whatsappSupport: { enabled: true, number: "+880 1700 000000", message: "Hello" },
  });
  assert.equal(action.channel, "whatsapp");
  assert.match(action.href, /^https:\/\/wa\.me\/8801700000000\?text=Hello$/);
});
