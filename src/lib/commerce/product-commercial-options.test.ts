import { describe, expect, it } from "@/test/test-utils";
import {
  buildCommercialSelection,
  buildCommercialSelectionWithDefaults,
  getCommercialSelectionPrice,
  normalizeCommercialOptions,
} from "@/lib/commerce/product-commercial-options";

const options = [
  { id: "opt-size-m", group_key: "size", label: "M", price_delta: 0, kind: "variant", active: true },
  { id: "opt-size-l", group_key: "size", label: "L", price_delta: 100, kind: "variant", active: true },
  { id: "opt-color-black", group_key: "color", label: "Black", price_delta: 0, kind: "variant", active: true },
];

describe("commercial option contract", () => {
  it("normalizes opaque identities and signed authoritative deltas", () => {
    expect(normalizeCommercialOptions(options)).toEqual([
      { id: "opt-size-m", groupKey: "size", label: "M", priceDelta: 0, kind: "variant", active: true },
      { id: "opt-size-l", groupKey: "size", label: "L", priceDelta: 100, kind: "variant", active: true },
      { id: "opt-color-black", groupKey: "color", label: "Black", priceDelta: 0, kind: "variant", active: true },
    ]);
  });

  it("builds selection ids from configured labels but derives money from stored options", () => {
    const selection = buildCommercialSelection(options, [
      { groupKey: "size", label: "L" },
      { groupKey: "color", label: "Black" },
    ]);
    expect(selection.optionIds).toEqual(["opt-size-l", "opt-color-black"]);
    expect(selection.priceDelta).toBe(100);
    expect(getCommercialSelectionPrice(1000, options, selection.optionIds)).toBe(1100);
  });

  it("fills omitted groups from authoritative defaults without trusting labels for money", () => {
    const selection = buildCommercialSelectionWithDefaults(options, [{ groupKey: "size", label: "L" }]);
    expect(selection.complete).toBe(true);
    expect(selection.optionIds).toEqual(["opt-size-l", "opt-color-black"]);
    expect(getCommercialSelectionPrice(1000, options, selection.optionIds)).toBe(1100);
  });

  it("fails closed on an unknown/stale option id or incomplete option group selection", () => {
    expect(getCommercialSelectionPrice(1000, options, ["unknown", "opt-color-black"])).toBeNull();
    expect(getCommercialSelectionPrice(1000, options, ["opt-size-l"])).toBeNull();
    expect(getCommercialSelectionPrice(50, [
      { id: "too-negative", group_key: "size", label: "Broken", price_delta: -100, active: true },
    ], ["too-negative"])).toBeNull();
  });
});
