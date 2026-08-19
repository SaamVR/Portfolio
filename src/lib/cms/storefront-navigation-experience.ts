import {
  getStorefrontTemplateDefinition,
  resolveStorefrontTemplateProfile,
  type StoreCatalogMode,
  type StorefrontTemplateId,
} from "@/lib/cms/storefront-templates";

export type StorefrontNavigationExperience = {
  templateId: StorefrontTemplateId;
  homeLabel: string;
  catalogLabel: string;
  accountLabel: string;
  wishlistLabel: string;
  cartLabel: string;
  primaryActionLabel: string;
  showCatalog: boolean;
  showSearchByDefault: boolean;
  showWishlistByDefault: boolean;
  showCartByDefault: boolean;
  useCatalogDropdown: boolean;
};

type CompactNavigationLabels = Partial<Pick<
  StorefrontNavigationExperience,
  "catalogLabel" | "wishlistLabel" | "cartLabel" | "primaryActionLabel"
>>;

const compactNavigationLabels: Partial<Record<StorefrontTemplateId, CompactNavigationLabels>> = {
  food: {
    catalogLabel: "Menu",
    wishlistLabel: "Favorites",
    cartLabel: "Tray",
    primaryActionLabel: "Order",
  },
  subscriptions: {
    catalogLabel: "Plans",
    cartLabel: "Subscription",
    primaryActionLabel: "Subscribe",
  },
  "digital-downloads": {
    catalogLabel: "Downloads",
    primaryActionLabel: "Browse Downloads",
  },
  "single-product": {
    catalogLabel: "Product",
    primaryActionLabel: "Buy Now",
  },
  "inquiry-catalog": {
    catalogLabel: "Catalog",
    cartLabel: "Quote",
    primaryActionLabel: "Request Quote",
  },
  service: {
    catalogLabel: "Services",
    cartLabel: "Request",
    primaryActionLabel: "Get Quote",
  },
  booking: {
    catalogLabel: "Services",
    cartLabel: "Booking",
    primaryActionLabel: "Book",
  },
  hotel: {
    catalogLabel: "Rooms",
    cartLabel: "Stay",
    primaryActionLabel: "Book",
  },
  "real-estate": {
    catalogLabel: "Properties",
    wishlistLabel: "Saved",
    cartLabel: "Inquiries",
    primaryActionLabel: "Contact Agent",
  },
  landing: {
    catalogLabel: "Highlights",
    primaryActionLabel: "Contact",
  },
};

function hasBrowsableCatalog(catalogMode: StoreCatalogMode) {
  return catalogMode !== "landing_only" && catalogMode !== "single_product";
}

function defaultsToWishlist(templateId: StorefrontTemplateId, catalogMode: StoreCatalogMode) {
  if (catalogMode === "landing_only" || catalogMode === "single_product" || catalogMode === "inquiry_only" || catalogMode === "menu") {
    return false;
  }

  return templateId !== "subscriptions";
}

function defaultsToCart(catalogMode: StoreCatalogMode) {
  return catalogMode !== "landing_only";
}

function defaultsToSearch(catalogMode: StoreCatalogMode) {
  return catalogMode !== "landing_only" && catalogMode !== "single_product";
}

function defaultsToCatalogDropdown(templateId: StorefrontTemplateId, catalogMode: StoreCatalogMode) {
  if (!defaultsToSearch(catalogMode)) {
    return false;
  }

  return ![
    "food",
    "subscriptions",
    "service",
    "booking",
    "hotel",
    "real-estate",
    "inquiry-catalog",
  ].includes(templateId);
}

export function resolveStorefrontNavigationExperience(
  storefrontProfile?: Record<string, unknown> | null,
): StorefrontNavigationExperience {
  const candidate = storefrontProfile?.template_id;
  const productVisibility = typeof storefrontProfile?.product_visibility === "string"
    ? storefrontProfile.product_visibility
    : null;
  const templateSeedId = typeof storefrontProfile?.template_seed_id === "string"
    ? storefrontProfile.template_seed_id
    : typeof candidate === "string"
      ? candidate
      : null;
  const resolved = resolveStorefrontTemplateProfile(candidate, {
    templateSeedId,
    productVisibility,
  });
  const definition = getStorefrontTemplateDefinition(resolved.templateId);
  const labels = compactNavigationLabels[resolved.templateId] ?? {};
  const showCatalog = hasBrowsableCatalog(resolved.catalogMode);

  return {
    templateId: resolved.templateId,
    homeLabel: definition.presentation.navigationLabels.home,
    catalogLabel: labels.catalogLabel ?? definition.presentation.navigationLabels.shop,
    accountLabel: definition.presentation.navigationLabels.account,
    wishlistLabel: labels.wishlistLabel ?? definition.presentation.navigationLabels.wishlist,
    cartLabel: labels.cartLabel ?? definition.presentation.navigationLabels.cart,
    primaryActionLabel: labels.primaryActionLabel ?? definition.presentation.ctaLabels.primary,
    showCatalog,
    showSearchByDefault: defaultsToSearch(resolved.catalogMode),
    showWishlistByDefault: defaultsToWishlist(resolved.templateId, resolved.catalogMode),
    showCartByDefault: defaultsToCart(resolved.catalogMode),
    useCatalogDropdown: showCatalog && defaultsToCatalogDropdown(resolved.templateId, resolved.catalogMode),
  };
}
