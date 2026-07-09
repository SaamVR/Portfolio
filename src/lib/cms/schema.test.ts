import { describe, expect, it } from "@/test/test-utils";
import { defaultStore } from "@/lib/cms/default-store";
import { storePageBlockSchema } from "@/lib/cms/schema";

describe("cms schema", () => {
  it("parses the seeded default store", () => {
    expect(defaultStore.id).toBe("00000000-0000-4000-8000-000000000001");
    expect(defaultStore.pages[0]?.blocks.length).toBeGreaterThan(0);
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
