import { describe, expect, it } from "@/test/test-utils";
import { loadStoreBlueprints } from "@/lib/cms/store-blueprints";
import { loadPageBlueprints } from "@/lib/cms/page-blueprints";
import { loadBlockRegistry } from "@/lib/cms/block-registry";

function createSelectClient(rows: unknown[]) {
  return {
    from() {
      return {
        select() {
          return {
            order() {
              return Promise.resolve({ data: rows, error: null });
            },
          };
        },
      };
    },
  } as any;
}

describe("cms library loaders", () => {
  it("keeps fallback store blueprints that are missing from database rows", async () => {
    const blueprints = await loadStoreBlueprints(createSelectClient([
      {
        id: "general-catalog",
        name: "General Catalog",
        is_active: true,
      },
    ]));

    expect(blueprints.some((entry) => entry.id === "general-catalog")).toBe(true);
    expect(blueprints.some((entry) => entry.id === "single-product")).toBe(true);
  });

  it("lets inactive store blueprint rows suppress fallback entries", async () => {
    const blueprints = await loadStoreBlueprints(createSelectClient([
      {
        id: "single-product",
        name: "Single Product Launch",
        is_active: false,
      },
    ]));

    expect(blueprints.some((entry) => entry.id === "single-product")).toBe(false);
  });

  it("keeps fallback page blueprints unless explicitly suppressed", async () => {
    const blueprints = await loadPageBlueprints(createSelectClient([
      {
        id: "landing",
        name: "Landing",
        page_payload: null,
        is_active: true,
      },
    ]));

    expect(blueprints.some((entry) => entry.id === "landing")).toBe(true);
    expect(blueprints.length).toBeGreaterThan(1);
  });

  it("keeps fallback block registry items unless explicitly suppressed", async () => {
    const registry = await loadBlockRegistry(createSelectClient([
      {
        block_type: "hero",
        label: "Hero",
        description: "Hero block",
        layer: "core",
        compatible_business_families: ["commerce", "booking", "listing", "service"],
        required_capabilities: [],
        is_active: true,
      },
      {
        block_type: "countdown",
        label: "Countdown",
        description: "Countdown block",
        layer: "commerce",
        compatible_business_families: ["commerce"],
        required_capabilities: [],
        is_active: false,
      },
    ]));

    expect(registry.some((entry) => entry.value === "hero")).toBe(true);
    expect(registry.some((entry) => entry.value === "featured-products")).toBe(true);
    expect(registry.some((entry) => entry.value === "countdown")).toBe(false);
  });
});
