import { describe, expect, it } from "@/test/test-utils";
import { defaultStore } from "@/lib/cms/default-store";
import { storePageBlockSchema } from "@/lib/cms/schema";
import { createDefaultCompositionDocument } from "@/lib/cms/storefront-platform/composition/defaults";

describe("cms schema", () => {
  it("parses the seeded default store", () => {
    expect(defaultStore.id).toBe("00000000-0000-4000-8000-000000000001");
    expect(defaultStore.slug).toBe("local-preview-store");
    expect(defaultStore.name).toBe("Local Preview Store");
    expect(defaultStore.pages[0]?.blocks.length).toBeGreaterThan(0);
  });

  it("preserves Threads carousel behavior props for category and featured blocks", () => {
    const category = storePageBlockSchema.parse({
      id: "threads-category-showcase",
      type: "category-showcase",
      sortOrder: 0,
      isVisible: true,
      props: { autoplay: false, autoplayIntervalMs: 6500, showArrows: false },
    });
    const featured = storePageBlockSchema.parse({
      id: "threads-featured-products",
      type: "featured-products",
      sortOrder: 1,
      isVisible: true,
      props: { autoplay: false, autoplayIntervalMs: 6500, showArrows: false },
    });

    if (category.type !== "category-showcase" || featured.type !== "featured-products") {
      throw new Error("Expected carousel block schemas");
    }

    expect(category.props.autoplay).toBe(false);
    expect(category.props.autoplayIntervalMs).toBe(6500);
    expect(category.props.showArrows).toBe(false);
    expect(featured.props.autoplay).toBe(false);
    expect(featured.props.autoplayIntervalMs).toBe(6500);
    expect(featured.props.showArrows).toBe(false);
  });

  it("accepts a schema-versioned universal composition block", () => {
    const parsed = storePageBlockSchema.parse({
      id: "composition-proof",
      type: "composition",
      sortOrder: 2,
      isVisible: true,
      props: createDefaultCompositionDocument(),
    });

    expect(parsed.type).toBe("composition");
  });

  it("rejects composition payloads that bypass the composition document contract", () => {
    const parsed = storePageBlockSchema.safeParse({
      id: "composition-invalid",
      type: "composition",
      sortOrder: 2,
      isVisible: true,
      props: { schemaVersion: 1, tree: { id: "root", primitive: "script", props: {} } },
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects invalid featured product limits", () => {
    const result = storePageBlockSchema.safeParse({
      id: "bad-featured",
      type: "featured-products",
      sortOrder: 0,
      isVisible: true,
      props: {
        limit: 0,
      },
    });

    expect(result.success).toBe(false);
  });
});
