import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildTemplateCatalogSeedRows } from "@/lib/cms/template-demo-seeds";

describe("template demo seed rows", () => {
  it("keeps product metric values on products and type metric schema on product types", () => {
    const seeded = buildTemplateCatalogSeedRows("preview-seed-store", "fashion");
    const productRows = seeded.productRows as Array<{
      type: string;
      metric_values?: Record<string, unknown>;
      type_metric_schema?: unknown;
    }>;
    const typeRows = seeded.productTypeRows as Array<{
      name: string;
      metric_schema?: Array<{ key: string; label: string }>;
    }>;

    const productWithMetrics = productRows.find(
      (row) => row.metric_values && Object.keys(row.metric_values).length > 0,
    );

    assert.ok(productWithMetrics);
    assert.equal("type_metric_schema" in productWithMetrics, false);

    const matchingType = typeRows.find((row) => row.name === productWithMetrics.type);
    assert.ok(matchingType);
    assert.ok(Array.isArray(matchingType.metric_schema));
    assert.ok((matchingType.metric_schema ?? []).length > 0);
  });
});
