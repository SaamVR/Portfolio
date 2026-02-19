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
