import { describe, expect, it } from "@/test/test-utils";
import { normalizeOrderItems } from "@/lib/cms/order-input";
import assert from "node:assert/strict";

describe("order input normalization", () => {
  it("accepts plain UUID product ids", () => {
    const items = normalizeOrderItems([
      {
        productId: "123e4567-e89b-12d3-a456-426614174000",
        size: "L",
        optionIds: ["opt-size-l"],
        expectedUnitPrice: 1200,
        quantity: 2,
      },
    ]);

    expect(items).toEqual([
      {
        productId: "123e4567-e89b-12d3-a456-426614174000",
        size: "L",
        optionIds: ["opt-size-l"],
        expectedUnitPrice: 1200,
        quantity: 2,
      },
    ]);
  });

  it("extracts UUIDs from slug-style product ids before checkout validation", () => {
    const items = normalizeOrderItems([
      {
        productId: "premium-cotton-shirt--123e4567-e89b-12d3-a456-426614174000",
        size: "",
        quantity: 1,
      },
    ]);

    expect(items[0]?.productId).toBe("123e4567-e89b-12d3-a456-426614174000");
    expect(items[0]?.size).toBe("Default option");
    expect(items[0]?.optionIds).toEqual([]);
    expect(items[0]?.expectedUnitPrice).toBeNull();
  });

  it("rejects non-UUID launch-style ids that cannot be fulfilled by the commerce tables", () => {
    assert.throws(() => normalizeOrderItems([
      {
        productId: "launch-tshirt-black",
        quantity: 1,
      },
    ]), /invalid product/i);
  });

  it("rejects null and primitive cart entries as malformed input", () => {
    assert.throws(() => normalizeOrderItems([null]), /invalid items/i);
    assert.throws(() => normalizeOrderItems([undefined]), /invalid items/i);
    assert.throws(() => normalizeOrderItems(["not-an-item"]), /invalid items/i);
  });
});


it("rejects duplicate or malformed commercial option identity", () => {
  assert.throws(() => normalizeOrderItems([{
    productId: "123e4567-e89b-12d3-a456-426614174000",
    optionIds: ["same", "same"],
    quantity: 1,
  }]), /invalid option identity/i);
});
