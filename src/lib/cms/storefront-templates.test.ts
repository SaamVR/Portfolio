import { describe, expect, it } from "@/test/test-utils";
import {
  getStorefrontTemplateDefinition,
  getStorefrontTemplateSeedDefinition,
  resolveSeedBlueprintIdForTemplate,
  resolveStorefrontTemplateId,
  storefrontTemplateIds,
} from "@/lib/cms/storefront-templates";

describe("storefront template registry", () => {
  it("registers every required template id", () => {
    expect(storefrontTemplateIds).toEqual([
      "landing",
      "beauty",
      "fashion",
      "electronics",
      "food",
      "crafts",
      "subscriptions",
      "digital-downloads",
      "single-product",
      "inquiry-catalog",
      "service",
      "general-catalog",
      "booking",
      "hotel",
      "real-estate",
    ]);
  });

  it("maps legacy blueprint/template combinations onto the shared storefront ids", () => {
    expect(resolveStorefrontTemplateId(undefined, { blueprintId: "clothing" })).toBe("fashion");
    expect(resolveStorefrontTemplateId(undefined, { blueprintId: "gadgets" })).toBe("electronics");
    expect(resolveStorefrontTemplateId(undefined, { blueprintId: "general", productVisibility: "single_product" })).toBe("single-product");
    expect(resolveStorefrontTemplateId(undefined, { blueprintId: "general", productVisibility: "inquiry_only" })).toBe("inquiry-catalog");
    expect(resolveStorefrontTemplateId(undefined, { blueprintId: "general", productVisibility: "landing_only" })).toBe("landing");
    expect(resolveStorefrontTemplateId(undefined, { blueprintId: "general", productVisibility: "catalog" })).toBe("general-catalog");
  });

  it("maps storefront templates to seed blueprints for merchant-safe apply flows", () => {
    expect(resolveSeedBlueprintIdForTemplate("fashion")).toBe("fashion");
    expect(resolveSeedBlueprintIdForTemplate("beauty")).toBe("beauty");
    expect(resolveSeedBlueprintIdForTemplate("electronics")).toBe("electronics");
    expect(resolveSeedBlueprintIdForTemplate("food")).toBe("food");
    expect(resolveSeedBlueprintIdForTemplate("landing")).toBe("landing");
    expect(resolveSeedBlueprintIdForTemplate("booking")).toBe("booking");
    expect(resolveSeedBlueprintIdForTemplate("hotel")).toBe("hotel");
    expect(resolveSeedBlueprintIdForTemplate("real-estate")).toBe("real-estate");
  });

  it("exposes template presentation metadata for future renderer specialization", () => {
    const template = getStorefrontTemplateDefinition("fashion");

    expect(template.rendererKind).toBe("fashion");
    expect(template.presentation.cardStyle).toBe("fashion-editorial");
    expect(template.presentation.navigationLabels.shop).toBe("Shop");
  });

  it("keeps seed and business metadata in the template registry for blueprint compatibility", () => {
    const template = getStorefrontTemplateSeedDefinition("service");

    expect(template.businessFamily).toBe("service");
    expect(template.catalogMode).toBe("inquiry_only");
    const storefrontProfile = template.defaultSiteSettings.storefront_profile as Record<string, unknown>;
    expect(storefrontProfile.template_id).toBe("service");
    expect(storefrontProfile.blueprint_id).toBe("service");
  });

  it("keeps hotel and real-estate on the shared storefront system with their own business metadata", () => {
    const hotel = getStorefrontTemplateSeedDefinition("hotel");
    const realEstate = getStorefrontTemplateSeedDefinition("real-estate");

    expect(hotel.businessFamily).toBe("booking");
    expect(hotel.catalogMode).toBe("inquiry_only");
    expect(realEstate.businessFamily).toBe("listing");
    expect(realEstate.catalogMode).toBe("inquiry_only");
  });
});
