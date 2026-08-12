import { describe, expect, it } from "@/test/test-utils";
import {
  getMetricInputValue,
  getTemplateDefaultProductMetrics,
  mergeMetricDefinitions,
  normalizeMetricDefinitions,
  normalizeMetricValues,
  serializeMetricInput,
} from "@/lib/cms/product-metrics";

describe("product metrics helpers", () => {
  it("normalizes and deduplicates metric definitions", () => {
    const metrics = normalizeMetricDefinitions([
      { key: "Size", label: "Size" },
      { key: "color", label: "Color" },
      { key: "size", label: "Duplicate" },
    ]);

    expect(metrics).toEqual([
      { key: "size", label: "Size", kind: "multi_value_text", source: "store" },
      { key: "color", label: "Color", kind: "multi_value_text", source: "store" },
    ]);
  });

  it("merges template defaults with type metrics", () => {
    const merged = mergeMetricDefinitions(
      getTemplateDefaultProductMetrics("general-catalog"),
      normalizeMetricDefinitions([{ key: "material", label: "Material" }]),
    );

    expect(merged.map((metric) => metric.key)).toEqual(["size", "color", "material"]);
  });

  it("normalizes metric values and falls back to legacy size and color arrays", () => {
    const values = normalizeMetricValues({
      material: ["Cotton", "Linen"],
    });

    expect(getMetricInputValue("material", values)).toBe("Cotton, Linen");
    expect(getMetricInputValue("size", values, { sizes: ["S", "M"] })).toBe("S, M");
    expect(getMetricInputValue("color", values, { colors: ["Black"] })).toBe("Black");
  });

  it("serializes comma-separated metric input", () => {
    expect(serializeMetricInput(" S, M , L ")).toEqual(["S", "M", "L"]);
  });
});
