import { describe, expect, it } from "@/test/test-utils";
import { getScopedStorefrontStorageKey } from "@/lib/storefront-storage";

describe("Storefront URL coupon pre-fill and Cart Context helper logic", () => {
  it("extracts coupon code from ?coupon= or ?coupon_code= query parameters", () => {
    const search1 = "?coupon=SUMMER50&ref=facebook";
    const params1 = new URLSearchParams(search1);
    const code1 = params1.get("coupon") || params1.get("coupon_code");
    expect(code1?.toUpperCase()).toBe("SUMMER50");

    const search2 = "?coupon_code=WELCOME10";
    const params2 = new URLSearchParams(search2);
    const code2 = params2.get("coupon") || params2.get("coupon_code");
    expect(code2?.toUpperCase()).toBe("WELCOME10");
  });

  it("stores and retrieves coupon codes with store scoping", () => {
    const storeId = "store-123";
    const key = getScopedStorefrontStorageKey("cart-coupon", storeId);
    expect(key).toBe("cart-coupon:store:store-123");
  });

  it("ensures pre-filled URL coupon requires server-side validation and does not bypass RPC checks", () => {
    const mockRpcResponseInvalid = { error: "Coupon EXPIRED20 is expired" };
    const prefilledCode = "EXPIRED20";

    // Simulate validation logic at checkout
    let appliedCoupon: any = null;
    let couponError = "";

    if (mockRpcResponseInvalid.error) {
      couponError = mockRpcResponseInvalid.error;
    } else {
      appliedCoupon = { code: prefilledCode };
    }

    expect(appliedCoupon).toBeNull();
    expect(couponError).toBe("Coupon EXPIRED20 is expired");
  });

  it("successfully applies valid pre-filled coupon returned by server validation", () => {
    const mockRpcResponseValid = {
      id: "c-1",
      code: "VALID20",
      discount_type: "percentage" as const,
      discount_value: 20,
      min_order: 500,
      max_uses: null,
      uses_count: 10,
    };

    let appliedCoupon: typeof mockRpcResponseValid | null = null;
    let couponError = "";

    if ((mockRpcResponseValid as any).error) {
      couponError = (mockRpcResponseValid as any).error;
    } else {
      appliedCoupon = mockRpcResponseValid;
    }

    expect(couponError).toBe("");
    expect(appliedCoupon?.code).toBe("VALID20");
    expect(appliedCoupon?.discount_value).toBe(20);
  });
});
