import type { ProductCommercialOption, ProductFulfillmentType } from "@/lib/commerce/product-commercial-options";

export type ProductType = "T-Shirt" | "Polo" | "Shirt" | "Drop Shoulder" | "Undergarment" | "Pants";

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images: string[];
  description: string;
  sizes: string[];
  colors: string[];
  category: string;
  type: string;
  featured?: boolean;
  badge?: "New" | "Sale" | string;
  stock?: number;
  isAvailable?: boolean;
  metricValues?: Record<string, string[]>;
  typeMetricSchema?: Array<{ key: string; label: string }>;
  commercialOptions?: ProductCommercialOption[];
  fulfillmentType?: ProductFulfillmentType;
}

export const productTypes: { label: string; value: ProductType | "All" }[] = [
  { label: "All", value: "All" },
  { label: "T-Shirts", value: "T-Shirt" },
  { label: "Polos", value: "Polo" },
  { label: "Shirts", value: "Shirt" },
  { label: "Drop Shoulders", value: "Drop Shoulder" },
  { label: "Undergarments", value: "Undergarment" },
  { label: "Pants", value: "Pants" },
];

export const typeLabels: Record<string, string> = {
  "All": "All Products",
  "T-Shirt": "T-Shirts",
  "Polo": "Polos",
  "Shirt": "Shirts",
  "Drop Shoulder": "Drop Shoulders",
  "Undergarment": "Undergarments",
  "Pants": "Pants",
};

export const launchProducts: Product[] = [
  {
    id: "launch-tshirt-black",
    name: "Premium Cotton T-Shirt - Black",
    price: 650,
    originalPrice: 850,
    image: "tshirt-black.jpg",
    images: ["tshirt-black.jpg", "tshirt-grey.jpg", "tshirt-white.jpg"],
    description: "A soft, durable everyday tee made for Dhaka heat. Clean fit, breathable cotton, and easy styling from workdays to weekends.",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black", "Grey", "White"],
    category: "Essentials",
    type: "T-Shirt",
    featured: true,
    badge: "Best Seller",
    stock: 40,
    isAvailable: true,
  },
  {
    id: "launch-tshirt-olive",
    name: "Premium Cotton T-Shirt - Olive",
    price: 690,
    image: "tshirt-olive.jpg",
    images: ["tshirt-olive.jpg", "tshirt-navy.jpg", "tshirt-burgundy.jpg"],
    description: "A clean olive basic with a structured neck, smooth handfeel, and a color that works with denim, chinos, and cargos.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Olive", "Navy", "Burgundy"],
    category: "Essentials",
    type: "T-Shirt",
    featured: true,
    badge: "New",
    stock: 32,
    isAvailable: true,
  },
  {
    id: "launch-polo-navy",
    name: "Smart Pique Polo - Navy",
    price: 1250,
    image: "polo-navy.jpg",
    images: ["polo-navy.jpg", "polo-black.jpg"],
    description: "A smart casual polo with breathable pique texture, neat collar shape, and a polished fit for office, dinner, and Eid visits.",
    sizes: ["M", "L", "XL"],
    colors: ["Navy", "Black"],
    category: "Premium",
    type: "Polo",
    featured: true,
    stock: 24,
    isAvailable: true,
  },
  {
    id: "launch-shirt-white",
    name: "Oxford Shirt - White",
    price: 1650,
    originalPrice: 1900,
    image: "shirt-white.jpg",
    images: ["shirt-white.jpg", "shirt-olive.jpg"],
    description: "A versatile button-down shirt with a crisp look and comfortable feel. Dress it up with chinos or keep it relaxed open over a tee.",
    sizes: ["M", "L", "XL"],
    colors: ["White", "Olive"],
    category: "Premium",
    type: "Shirt",
    badge: "Sale",
    stock: 18,
    isAvailable: true,
  },
  {
    id: "launch-drop-black",
    name: "Urban Drop Shoulder - Black",
    price: 1290,
    image: "dropshoulder-black.jpg",
    images: ["dropshoulder-black.jpg", "dropshoulder-grey.jpg", "dropshoulder-burgundy.jpg"],
    description: "A heavier oversized drop shoulder tee with streetwear proportion, soft finish, and a confident silhouette.",
    sizes: ["M", "L", "XL"],
    colors: ["Black", "Grey", "Burgundy"],
    category: "Street",
    type: "Drop Shoulder",
    featured: true,
    badge: "Limited",
    stock: 12,
    isAvailable: true,
  },
  {
    id: "launch-cargo-olive",
    name: "Utility Cargo Pants - Olive",
    price: 1850,
    image: "cargo-olive.jpg",
    images: ["cargo-olive.jpg", "joggers-black.jpg", "chinos-navy.jpg"],
    description: "Functional cargo pants with roomy pockets, sturdy fabric, and an easy tapered shape for daily wear.",
    sizes: ["M", "L", "XL"],
    colors: ["Olive", "Black", "Navy"],
    category: "Street",
    type: "Pants",
    stock: 20,
    isAvailable: true,
  },
  {
    id: "launch-chinos-navy",
    name: "Slim Chinos - Navy",
    price: 1750,
    image: "chinos-navy.jpg",
    images: ["chinos-navy.jpg", "trousers-grey.jpg"],
    description: "A clean pair of slim chinos that balances comfort and polish for office days, classes, and evening plans.",
    sizes: ["M", "L", "XL"],
    colors: ["Navy", "Grey"],
    category: "Premium",
    type: "Pants",
    stock: 16,
    isAvailable: true,
  },
  {
    id: "launch-boxer-black",
    name: "Comfort Boxer Briefs - Black",
    price: 490,
    image: "boxer-black.jpg",
    images: ["boxer-black.jpg", "trunk-grey.jpg", "vest-white.jpg"],
    description: "Soft, supportive innerwear designed for all-day comfort with breathable fabric and a secure fit.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Black", "Grey", "White"],
    category: "Essentials",
    type: "Undergarment",
    stock: 60,
    isAvailable: true,
  },
];
