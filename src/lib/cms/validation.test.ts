import { describe, expect, it } from "@/test/test-utils";
import { sanitizeStoreBlocks, sanitizeStorePage } from "@/lib/cms/validation";

describe("cms validation helpers", () => {
  it("drops invalid blocks and normalizes sort order", () => {
    const blocks = sanitizeStoreBlocks([
      {
        id: "hero-1",
        type: "hero",
        isVisible: true,
        sortOrder: 8,
        props: { title: "Hello" },
      },
      {
        id: "broken",
        type: "rich-text",
        isVisible: true,
        sortOrder: 3,
        props: { title: "", body: "" },
      },
      {
        id: "text-1",
        type: "rich-text",
        isVisible: true,
        sortOrder: 99,
        props: { title: "Story", body: "Body copy", align: "left" },
      },
    ]);

    expect(blocks).toHaveLength(2);
    expect(blocks[0]?.sortOrder).toBe(0);
    expect(blocks[1]?.sortOrder).toBe(1);
  });

  it("returns null for pages that end up with no valid blocks", () => {
    const page = sanitizeStorePage({
      id: "page-1",
      slug: "/about",
      title: "About",
      blocks: [
        {
          id: "broken",
          type: "rich-text",
          isVisible: true,
          sortOrder: 0,
          props: { title: "", body: "" },
        },
      ],
    });

    expect(page).toBeNull();
  });
});
