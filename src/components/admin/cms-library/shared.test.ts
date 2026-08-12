import { describe, expect, it } from "@/test/test-utils";
import {
  buildKnownBlockOptions,
  buildKnownCapabilities,
  buildKnownPageTemplateIds,
  readThemeEditorPayload,
  updateThemeJsonField,
} from "@/components/admin/cms-library/shared";

describe("cms library shared helpers", () => {
  it("reads theme editor payload from preview and tokens json", () => {
    const payload = readThemeEditorPayload(
      JSON.stringify({ bg: "#111111", primary: "#22c55e", accent: "#38bdf8" }),
      JSON.stringify({
        light: { "--background": "#ffffff" },
        dark: { "--background": "#111111" },
        typography: { headingFont: "'Outfit', sans-serif", bodyFont: "'Inter', sans-serif" },
        components: { borderRadius: "1rem" },
      }),
    );

    expect(payload.preview.bg).toBe("#111111");
    expect(payload.tokens.typography.headingFont).toBe("'Outfit', sans-serif");
    expect(payload.tokens.components.borderRadius).toBe("1rem");
  });

  it("updates theme json fields without dropping existing values", () => {
    const updated = updateThemeJsonField(JSON.stringify({
      bg: "#000000",
      primary: "#ffffff",
    }), { accent: "#38bdf8" });

    const parsed = JSON.parse(updated) as { bg: string; primary: string; accent: string };

    expect(parsed.bg).toBe("#000000");
    expect(parsed.primary).toBe("#ffffff");
    expect(parsed.accent).toBe("#38bdf8");
  });

  it("builds live known library options from custom rows", () => {
    const pageIds = buildKnownPageTemplateIds([
      {
        id: "custom-gallery",
        name: "Custom Gallery",
        description: "Custom",
        business_family: "commerce",
        catalog_modes: ["multi_product"],
        page_payload: {},
        is_active: true,
      },
    ]);
    const blockOptions = buildKnownBlockOptions([
      {
        block_type: "booking-widget",
        label: "Booking Widget",
        description: "Booking block",
        layer: "extension",
        compatible_business_families: ["service"],
        required_capabilities: ["bookings"],
        is_active: true,
      },
    ]);
    const capabilities = buildKnownCapabilities({
      blocks: [{
        block_type: "booking-widget",
        label: "Booking Widget",
        description: "Booking block",
        layer: "extension",
        compatible_business_families: ["service"],
        required_capabilities: ["bookings"],
        is_active: true,
      }],
    });

    expect(pageIds.some((item) => item === "custom-gallery")).toBe(true);
    expect(blockOptions.some((item) => item.value === "booking-widget")).toBe(true);
    expect(capabilities.some((item) => item === "bookings")).toBe(true);
  });
});
