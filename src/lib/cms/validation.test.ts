import { describe, expect, it } from "@/test/test-utils";
import { sanitizeStoreBlocks, sanitizeStorePage, sanitizeStoreTheme, sanitizeStoreThemeCustomCss } from "@/lib/cms/validation";

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

  it("strips advanced block injections from merchant-safe sanitizing", () => {
    const blocks = sanitizeStoreBlocks([
      {
        id: "hero-1",
        type: "hero",
        isVisible: true,
        sortOrder: 0,
        customHtml: "<div onclick=\"evil()\">Hello</div>",
        customCss: ".hero { color: red; }",
        props: { title: "Hello" },
      },
    ]);

    expect(blocks[0]?.customHtml).toBe(undefined);
    expect(blocks[0]?.customCss).toBe(undefined);
  });

  it("keeps sanitized advanced fields when explicitly allowed", () => {
    const blocks = sanitizeStoreBlocks([
      {
        id: "hero-1",
        type: "hero",
        isVisible: true,
        sortOrder: 0,
        customHtml: "<div onclick=\"evil()\">Hello</div><script>alert(1)</script>",
        customCss: ".hero { color: red; }",
        props: { title: "Hello" },
      },
    ], { allowAdvanced: true });

    expect(blocks[0]?.customHtml).toBe("<div>Hello</div>");
    expect(blocks[0]?.customCss).toBe(".hero { color: red; }");
  });

  it("blocks unsafe theme CSS and hides advanced theme fields in merchant-safe mode", () => {
    expect(sanitizeStoreThemeCustomCss("@import url('https://bad.test/x.css');")).toBe(undefined);

    const theme = sanitizeStoreTheme({
      presetId: "default",
      mode: "light",
      customCssVars: {},
      customCss: ".storefront { color: red; }",
      globalHeadInjection: "<meta name=\"x\" content=\"1\"><script>alert(1)</script>",
      globalBodyInjection: "<div onclick=\"evil()\">Hello</div>",
    });

    expect(theme.customCss).toBe(undefined);
    expect(theme.globalHeadInjection).toBe(undefined);
    expect(theme.globalBodyInjection).toBe(undefined);
  });
});
