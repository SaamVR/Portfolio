import type { Product } from "@/data/products";

export type ShopSortOption = "newest" | "price-asc" | "price-desc";

export interface ShopFilterState {
  query: string;
  type: string;
  category: string;
  sort: ShopSortOption;
  saleOnly: boolean;
  minPrice?: string;
  maxPrice?: string;
  selectedSizes: string[];
  selectedColors: string[];
}

export interface ShopOption {
  label: string;
  value: string;
  count: number;
}

function normalized(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function matchesQuery(product: Product, query: string) {
  const q = normalized(query);
  if (!q) return true;

  return [product.name, product.description, product.category, product.type]
    .map(normalized)
    .some((value) => value.includes(q));
}

export function filterAndSortProducts(products: Product[], filters: ShopFilterState) {
  return [...products]
    .filter((product) => {
      const matchesType = filters.type === "All" || product.type === filters.type;
      const matchesCategory = filters.category === "All" || product.category === filters.category;
      const matchesMin = !filters.minPrice || product.price >= Number(filters.minPrice);
      const matchesMax = !filters.maxPrice || product.price <= Number(filters.maxPrice);
      const matchesSale = !filters.saleOnly || Boolean(product.originalPrice);
      const matchesSize = filters.selectedSizes.length === 0 || filters.selectedSizes.some((size) => product.sizes?.includes(size));
      const matchesColor = filters.selectedColors.length === 0 || filters.selectedColors.some((color) => product.colors?.includes(color));

      return (
        product.isAvailable !== false &&
        matchesType &&
        matchesCategory &&
        matchesQuery(product, filters.query) &&
        matchesMin &&
        matchesMax &&
        matchesSale &&
        matchesSize &&
        matchesColor
      );
    })
    .sort((a, b) => {
      if (filters.sort === "price-asc") return a.price - b.price;
      if (filters.sort === "price-desc") return b.price - a.price;
      return 0;
    });
}

export function buildShopOptions(products: Product[], kind: "type" | "category", configuredNames: string[] = []): ShopOption[] {
  const values = new Set<string>();
  configuredNames.forEach((name) => {
    const value = name.trim();
    if (value) values.add(value);
  });
  products.forEach((product) => {
    const value = kind === "type" ? product.type : product.category;
    if (value) values.add(value);
  });

  const productCount = (value: string) => products.filter((product) => (kind === "type" ? product.type : product.category) === value).length;

  return [
    { label: "All", value: "All", count: products.length },
    ...Array.from(values)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({
        label: value,
        value,
        count: productCount(value),
      })),
  ];
}
