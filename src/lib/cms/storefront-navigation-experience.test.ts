import { describe, expect, it } from "@/test/test-utils";
import { resolveStorefrontNavigationExperience } from "@/lib/cms/storefront-navigation-experience";

describe("storefront navigation experience", () => {
  it("keeps standard commerce navigation familiar", () => {
    const navigation = resolveStorefrontNavigationExperience({ template_id: "general-catalog" });

    expect(navigation.catalogLabel).toBe("Shop");
    expect(navigation.cartLabel).toBe("Cart");
    expect(navigation.showCatalog).toBe(true);
    expect(navigation.showSearchByDefault).toBe(true);
    expect(navigation.showWishlistByDefault).toBe(true);
    expect(navigation.showCartByDefault).toBe(true);
    expect(navigation.useCatalogDropdown).toBe(true);
  });

  it("uses menu and tray language for food stores", () => {
    const navigation = resolveStorefrontNavigationExperience({ template_id: "food" });

    expect(navigation.catalogLabel).toBe("Menu");
    expect(navigation.cartLabel).toBe("Tray");
    expect(navigation.primaryActionLabel).toBe("Order");
    expect(navigation.showWishlistByDefault).toBe(false);
    expect(navigation.useCatalogDropdown).toBe(false);
  });

  it.each([
    ["booking", "Services", "Booking", "Book"],
    ["hotel", "Rooms", "Stay", "Book"],
    ["service", "Services", "Request", "Get Quote"],
    ["real-estate", "Properties", "Inquiries", "Contact Agent"],
    ["inquiry-catalog", "Catalog", "Quote", "Request Quote"],
    ["subscriptions", "Plans", "Subscription", "Subscribe"],
    ["digital-downloads", "Downloads", "Cart", "Browse Downloads"],
  ] as const)("uses business-aware labels for %s", (row) => {
    const [templateId, catalogLabel, cartLabel, primaryActionLabel] = row;
    const navigation = resolveStorefrontNavigationExperience({ template_id: templateId });

    expect(navigation.catalogLabel).toBe(catalogLabel);
    expect(navigation.cartLabel).toBe(cartLabel);
    expect(navigation.primaryActionLabel).toBe(primaryActionLabel);
  });

  it("removes catalog, search, cart and wishlist defaults from landing-only storefronts", () => {
    const navigation = resolveStorefrontNavigationExperience({ template_id: "landing" });

    expect(navigation.showCatalog).toBe(false);
    expect(navigation.showSearchByDefault).toBe(false);
    expect(navigation.showWishlistByDefault).toBe(false);
    expect(navigation.showCartByDefault).toBe(false);
  });

  it("keeps single-product checkout available without adding a redundant catalog entry", () => {
    const navigation = resolveStorefrontNavigationExperience({ template_id: "single-product" });

    expect(navigation.showCatalog).toBe(false);
    expect(navigation.showSearchByDefault).toBe(false);
    expect(navigation.showWishlistByDefault).toBe(false);
    expect(navigation.showCartByDefault).toBe(true);
    expect(navigation.primaryActionLabel).toBe("Buy Now");
  });

  it("resolves legacy product visibility when a template id is unavailable", () => {
    const navigation = resolveStorefrontNavigationExperience({ product_visibility: "menu" });

    expect(navigation.templateId).toBe("food");
    expect(navigation.catalogLabel).toBe("Menu");
  });
});
