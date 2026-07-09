import { describe, expect, it } from "@/test/test-utils";
import { buildShopOptions, filterAndSortProducts } from "@/lib/shop-filters";
import type { Product } from "@/data/products";

const products: Product[] = [
  {
    id: "1",
    name: "Cotton Tee",
    price: 500,
    originalPrice: 700,
    image: "/tee.png",
    images: [],
    description: "Soft daily basic",
    sizes: ["M"],
    colors: ["Black"],
    category: "Essentials",
    type: "T-Shirt",
    isAvailable: true,
  },
  {
    id: "2",
    name: "Gift Box",
    price: 1200,
    image: "/gift.png",
    images: [],
    description: "Premium Eid gift",
    sizes: ["One Size"],
    colors: ["Gold"],
    category: "Gifts",
    type: "Bundle",
    isAvailable: true,
  },
  {
    id: "3",
    name: "Hidden Draft",
    price: 100,
    image: "/draft.png",
    images: [],
    description: "Unavailable",
    sizes: [],
    colors: [],
    category: "Draft",
    type: "Draft",
    isAvailable: false,
  },
];

describe("shop filters", () => {
  it("searches product descriptions and keeps unavailable products out", () => {
    const result = filterAndSortProducts(products, {
      query: "eid",
      type: "All",
      category: "All",
      sort: "newest",
      saleOnly: false,
      selectedSizes: [],
      selectedColors: [],
    });

    expect(result.map((product) => product.id)).toEqual(["2"]);
  });

  it("filters by sale, size, color, and sorts by price", () => {
    const result = filterAndSortProducts(products, {
      query: "",
      type: "All",
      category: "All",
      sort: "price-desc",
      saleOnly: true,
      selectedSizes: ["M"],
      selectedColors: ["Black"],
    });

    expect(result.map((product) => product.id)).toEqual(["1"]);
  });

  it("builds options from configured names and product data", () => {
    const options = buildShopOptions(products, "category", ["Food"]);

    expect(options.map((option) => option.value)).toEqual(["All", "Draft", "Essentials", "Food", "Gifts"]);
  });
});
