import { describe, expect, it } from "@/test/test-utils";
import {
  getStorefrontTemplateDefinition,
  getStorefrontTemplateSeedDefinition,
  resolveStorefrontTemplateId,
  storefrontTemplateIds,
} from "@/lib/cms/storefront-templates";

describe("storefront template registry", () => {
  it("registers every required template id", () => {
    expect(storefrontTemplateIds).toEqual([
      "blank",
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

  it("registers blank mode as a first-class shared builder preset", () => {
    const template = getStorefrontTemplateDefinition("blank");
    const seed = getStorefrontTemplateSeedDefinition("blank");

    expect(template.onboardingMode).toBe("blank");
    expect(seed.onboardingMode).toBe("blank");
    expect(template.defaultBlockSet).toEqual(["hero", "featured-products"]);
    expect(seed.compatibleBlockSet.includes("hero")).toBe(true);
    expect(seed.compatibleBlockSet.includes("category-showcase")).toBe(true);
  });

  it("maps legacy template aliases onto the shared storefront ids", () => {
    expect(resolveStorefrontTemplateId(undefined, { templateSeedId: "clothing" })).toBe("fashion");
    expect(resolveStorefrontTemplateId(undefined, { templateSeedId: "gadgets" })).toBe("electronics");
    expect(resolveStorefrontTemplateId(undefined, { templateSeedId: "general", productVisibility: "single_product" })).toBe("single-product");
    expect(resolveStorefrontTemplateId(undefined, { templateSeedId: "general", productVisibility: "inquiry_only" })).toBe("inquiry-catalog");
    expect(resolveStorefrontTemplateId(undefined, { templateSeedId: "general", productVisibility: "landing_only" })).toBe("landing");
    expect(resolveStorefrontTemplateId(undefined, { templateSeedId: "general", productVisibility: "catalog" })).toBe("general-catalog");
  });

  it("maps storefront templates to seed ids for merchant-safe apply flows", () => {
    expect(getStorefrontTemplateSeedDefinition("fashion").id).toBe("fashion");
    expect(getStorefrontTemplateSeedDefinition("beauty").id).toBe("beauty");
    expect(getStorefrontTemplateSeedDefinition("electronics").id).toBe("electronics");
    expect(getStorefrontTemplateSeedDefinition("food").id).toBe("food");
    expect(getStorefrontTemplateSeedDefinition("landing").id).toBe("landing");
    expect(getStorefrontTemplateSeedDefinition("booking").id).toBe("booking");
    expect(getStorefrontTemplateSeedDefinition("hotel").id).toBe("hotel");
    expect(getStorefrontTemplateSeedDefinition("real-estate").id).toBe("real-estate");
  });

  it("exposes template presentation metadata for future renderer specialization", () => {
    const template = getStorefrontTemplateDefinition("fashion");

    expect(template.rendererKind).toBe("fashion");
    expect(template.presentation.cardStyle).toBe("fashion-editorial");
    expect(template.presentation.navigationLabels.shop).toBe("Shop");
  });

  it("keeps seed and business metadata in the template registry for compatibility", () => {
    const template = getStorefrontTemplateSeedDefinition("service");

    expect(template.businessFamily).toBe("service");
    expect(template.catalogMode).toBe("inquiry_only");
    const storefrontProfile = template.defaultSiteSettings.storefront_profile as Record<string, unknown>;
    expect(storefrontProfile.template_id).toBe("service");
    expect(storefrontProfile.allow_guest_checkout).toBe(true);
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
