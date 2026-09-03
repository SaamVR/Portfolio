import { describe, expect, it } from "@/test/test-utils";
import {
  buildCustomerAuthPath,
  getCurrentRelativePath,
  resolveAllowGuestCheckout,
  resolveAllowGuestCheckoutForStore,
} from "@/lib/storefront-customer-access";

describe("storefront customer access helpers", () => {
  it("defaults guest checkout to enabled when the setting is missing", () => {
    expect(resolveAllowGuestCheckout(undefined)).toBe(true);
    expect(resolveAllowGuestCheckout(null)).toBe(true);
    expect(resolveAllowGuestCheckout({})).toBe(true);
  });

  it("respects the explicit guest checkout toggle", () => {
    expect(resolveAllowGuestCheckout({ allow_guest_checkout: true })).toBe(true);
    expect(resolveAllowGuestCheckout({ allow_guest_checkout: false })).toBe(false);
  });

  it("reads the store-scoped checkout toggle from site settings", () => {
    expect(resolveAllowGuestCheckoutForStore({
      slug: "merchant-noir",
      siteSettings: {
        storefront_profile: {
          allow_guest_checkout: false,
        },
      },
    } as never)).toBe(false);
  });

  it("builds canonical customer auth paths from short return destinations", () => {
    expect(buildCustomerAuthPath("/checkout", "merchant-noir")).toBe(
      "/stores/merchant-noir/auth?next=%2Fcheckout",
    );
  });

  it("builds canonical customer auth paths that preserve scoped return destinations", () => {
    expect(buildCustomerAuthPath("/stores/merchant-noir/checkout", "merchant-noir")).toBe(
      "/stores/merchant-noir/auth?next=%2Fstores%2Fmerchant-noir%2Fcheckout",
    );
  });

  it("captures the current relative storefront path including search and hash", () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      value: {
        location: {
          pathname: "/stores/merchant-noir/product/demo-item",
          search: "?coupon=SAVE10",
          hash: "#reviews",
        },
      },
      configurable: true,
    });

    expect(getCurrentRelativePath()).toBe("/stores/merchant-noir/product/demo-item?coupon=SAVE10#reviews");

    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
    });
  });
});
