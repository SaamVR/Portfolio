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
});
