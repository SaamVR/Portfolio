export type StorefrontThemeCustomization = {
  sidebar_position?: "left" | "right";
  container_width?: "narrow" | "standard" | "wide" | "full";
  product_grid?: "3" | "4" | "5";
  nav_style?: "sticky" | "static" | "hidden";
  text_size?: "14" | "16" | "18";
  heading_font?: string;
  body_font?: string;
  border_radius?: string;
};

export function getStorefrontContainerClass(containerWidth?: string | null) {
  switch (containerWidth) {
    case "narrow":
      return "max-w-5xl";
    case "wide":
      return "max-w-screen-2xl";
    case "full":
      return "max-w-none";
    case "standard":
    default:
      return "max-w-7xl";
  }
}

export function getStorefrontProductGridClass(productGrid?: string | null) {
  switch (productGrid) {
    case "3":
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
    case "5":
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5";
    case "4":
    default:
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
  }
}

export function getStorefrontBaseTextSize(textSize?: string | null) {
  switch (textSize) {
    case "14":
      return "0.875rem";
    case "18":
      return "1.125rem";
    case "16":
    default:
      return "1rem";
  }
}
