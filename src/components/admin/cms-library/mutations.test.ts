import { describe, expect, it } from "@/test/test-utils";
import assert from "node:assert/strict";
import { buildSaveDialogRequest } from "@/components/admin/cms-library/mutations";

describe("cms library mutation builders", () => {
  it("builds a theme package save payload", () => {
    const request = buildSaveDialogRequest(
      { mode: "create", type: "theme" },
      {
        id: "custom-theme",
        slug: "custom-theme",
        name: "Custom Theme",
        description: "A shared theme package",
        source_type: "admin_shared",
        version: "2",
        compatibility_version: "1",
        preset_id: "midnight-blue",
        mode: "dark",
        preview_metadata: JSON.stringify({ bg: "#000", primary: "#fff", accent: "#0ea5e9" }),
        tokens: JSON.stringify({ light: {}, dark: {}, typography: {}, components: {} }),
        component_recipes: JSON.stringify({ button: { radius: "pill" } }),
        custom_css: ".hero { color: white; }",
        owner_store_id: "",
      },
    );

    expect(request.table).toBe("theme_packages");
    expect(request.idValue).toBe("custom-theme");
    expect(request.payload.name).toBe("Custom Theme");
    expect(request.payload.version).toBe(2);
    expect(request.payload.owner_store_id).toBeNull();
  });

  it("rejects unsafe theme package css through the manager payload builder", () => {
    assert.throws(() => buildSaveDialogRequest(
      { mode: "create", type: "theme" },
      {
        id: "unsafe-theme",
        slug: "unsafe-theme",
        name: "Unsafe Theme",
        description: "Should fail",
        source_type: "admin_shared",
        version: "1",
        compatibility_version: "1",
        preset_id: "midnight-blue",
        mode: "dark",
        preview_metadata: JSON.stringify({ bg: "#000", primary: "#fff", accent: "#0ea5e9" }),
        tokens: JSON.stringify({ light: {}, dark: {}, typography: {}, components: {} }),
        component_recipes: JSON.stringify({}),
        custom_css: "@import url('https://bad.example/theme.css');",
        owner_store_id: "",
      },
    ), /unsafe/i);
  });

  it("sanitizes page blueprint payloads before saving", () => {
    const request = buildSaveDialogRequest(
      { mode: "create", type: "page" },
      {
        id: "custom-page",
        name: "Custom Page",
        description: "A page blueprint",
        business_family: "commerce",
        catalog_modes: JSON.stringify(["multi_product"]),
        page_payload: JSON.stringify({
          slug: "/campaign",
          title: "Campaign Page",
          seoTitle: "",
          seoDescription: "",
          isHomepage: false,
          blocks: [
            {
              id: "valid-rich-text",
              type: "rich-text",
              isVisible: true,
              sortOrder: 9,
              props: {
                title: "Trusted launch copy",
                body: "Real content",
                align: "center",
              },
            },
            {
              id: "invalid-rich-text",
              type: "rich-text",
              isVisible: true,
              sortOrder: 10,
              props: {
                title: "",
                body: "",
              },
            },
          ],
        }),
        is_active: true,
      },
    );

    expect(request.table).toBe("page_blueprints");
    expect(Array.isArray((request.payload.page_payload as { blocks: unknown[] }).blocks)).toBe(true);
    expect((request.payload.page_payload as { blocks: unknown[] }).blocks).toHaveLength(1);
  });

  it("rejects reserved page blueprint slugs outside homepage", () => {
    assert.throws(() => buildSaveDialogRequest(
      { mode: "create", type: "page" },
      {
        id: "shop-page",
        name: "Shop Page",
        description: "Invalid reserved slug",
        business_family: "commerce",
        catalog_modes: JSON.stringify(["multi_product"]),
        page_payload: JSON.stringify({
          slug: "/shop",
          title: "Shop Page",
          blocks: [
            {
              id: "rich-text-1",
              type: "rich-text",
              isVisible: true,
              sortOrder: 0,
              props: {
                title: "Reserved",
                body: "Should fail",
                align: "center",
              },
            },
          ],
        }),
        is_active: true,
      },
    ), /reserved/i);
  });

  it("allows core blocks in non-commerce page blueprints", () => {
    const request = buildSaveDialogRequest(
      { mode: "create", type: "page" },
      {
        id: "service-landing",
        name: "Service Landing",
        description: "Service page",
        business_family: "service",
        catalog_modes: JSON.stringify(["inquiry_only"]),
        page_payload: JSON.stringify({
          slug: "/service",
          title: "Service",
          blocks: [
            {
              id: "rich-service",
              type: "rich-text",
              isVisible: true,
              sortOrder: 0,
              props: {
                title: "Service intro",
                body: "Explain the offer",
                align: "left",
              },
            },
          ],
        }),
        is_active: true,
      },
    );

    expect(request.table).toBe("page_blueprints");
    expect((request.payload.page_payload as { blocks: Array<{ type: string }> }).blocks[0]?.type).toBe("rich-text");
  });

  it("rejects commerce-only blocks in non-commerce page blueprints", () => {
    assert.throws(() => buildSaveDialogRequest(
      { mode: "create", type: "page" },
      {
        id: "service-products",
        name: "Service Products",
        description: "Should fail",
        business_family: "service",
        catalog_modes: JSON.stringify(["inquiry_only"]),
        page_payload: JSON.stringify({
          slug: "/service-products",
          title: "Service Products",
          blocks: [
            {
              id: "featured-service",
              type: "featured-products",
              isVisible: true,
              sortOrder: 0,
              props: {
                limit: 4,
                title: "Products",
              },
            },
          ],
        }),
        is_active: true,
      },
    ), /not compatible/i);
  });
});
