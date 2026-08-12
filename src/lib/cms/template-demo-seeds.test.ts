import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildTemplateCatalogSeedRows } from "@/lib/cms/template-demo-seeds";

describe("template demo seed rows", () => {
  it("carries type metric schema and metric values into seeded preview products", () => {
    const seeded = buildTemplateCatalogSeedRows("preview-seed-store", "fashion");
    const productRows = seeded.productRows as Array<{
      type: string;
      metric_values?: unknown;
      type_metric_schema?: Array<{ key: string; label: string }>;
    }>;
    const typeRows = seeded.productTypeRows as Array<{
      name: string;
      metric_schema?: Array<{ key: string; label: string }>;
    }>;
    const productWithMetrics = productRows.find((row) => Array.isArray(row.type_metric_schema) && row.type_metric_schema.length > 0);

    assert.ok(productWithMetrics);
    assert.ok(productWithMetrics?.metric_values);

    const matchingType = typeRows.find((row) => row.name === productWithMetrics?.type);
    assert.ok(matchingType);
    assert.ok(Array.isArray(matchingType?.metric_schema));
    assert.ok((matchingType?.metric_schema ?? []).length > 0);
  });
});
