import tshirtBlack from "@/assets/tshirt-black.jpg";
import tshirtWhite from "@/assets/tshirt-white.jpg";
import tshirtOlive from "@/assets/tshirt-olive.jpg";
import tshirtNavy from "@/assets/tshirt-navy.jpg";
import tshirtBurgundy from "@/assets/tshirt-burgundy.jpg";
import tshirtGrey from "@/assets/tshirt-grey.jpg";

export type ProductType = "T-Shirt" | "Polo" | "Shirt" | "Drop Shoulder" | "Undergarment" | "Pants";

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  sizes: string[];
  colors: string[];
  category: string;
  type: ProductType;
  featured?: boolean;
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

export const products: Product[] = [
  // === T-Shirts ===
  {
    id: "1",
    name: "Essential Black Tee",
    price: 850,
    image: tshirtBlack,
    description: "Premium 100% combed cotton, 180 GSM heavyweight tee. Pre-shrunk with reinforced stitching for lasting comfort.",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black"],
    category: "Essentials",
    type: "T-Shirt",
    featured: true,
  },
  {
    id: "2",
    name: "Classic White Tee",
    price: 850,
    image: tshirtWhite,
    description: "Clean white heavyweight tee crafted from premium Egyptian cotton. A wardrobe staple that elevates any look.",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["White"],
    category: "Essentials",
    type: "T-Shirt",
    featured: true,
  },
  {
    id: "3",
    name: "Olive Street Tee",
    price: 950,
    image: tshirtOlive,
    description: "Military-inspired olive green tee with a relaxed fit. Garment-dyed for a unique vintage wash effect.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Olive"],
    category: "Street",
    type: "T-Shirt",
  },
  {
    id: "4",
    name: "Navy Crew Tee",
    price: 900,
    image: tshirtNavy,
    description: "Deep navy crew neck tee with ribbed collar. Perfect layering piece for the modern wardrobe.",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Navy"],
    category: "Essentials",
    type: "T-Shirt",
  },
  {
    id: "5",
    name: "Burgundy Drop Tee",
    price: 1050,
    image: tshirtBurgundy,
    description: "Rich burgundy drop-shoulder tee with extended body. Premium reactive dye for deep, lasting color.",
    sizes: ["M", "L", "XL"],
    colors: ["Burgundy"],
    category: "Premium",
    type: "T-Shirt",
    featured: true,
  },
  {
    id: "6",
    name: "Heather Grey Tee",
    price: 800,
    image: tshirtGrey,
    description: "Soft heather grey tee with a lived-in feel. Cotton-polyester blend for ultimate comfort and durability.",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Grey"],
    category: "Essentials",
    type: "T-Shirt",
  },

  // === Polos ===
  {
    id: "7",
    name: "Classic Pique Polo — Black",
    price: 1250,
    image: tshirtBlack,
    description: "Timeless pique polo in deep black. Ribbed collar, two-button placket, and breathable cotton mesh weave.",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black"],
    category: "Essentials",
    type: "Polo",
    featured: true,
  },
  {
    id: "8",
    name: "Tipped Polo — Navy",
    price: 1350,
    image: tshirtNavy,
    description: "Navy polo with contrast tipping on collar and sleeves. Slim fit with side vents for a polished casual look.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Navy"],
    category: "Premium",
    type: "Polo",
  },

  // === Shirts ===
  {
    id: "9",
    name: "Oxford Button-Down — White",
    price: 1650,
    image: tshirtWhite,
    description: "Crisp white Oxford cloth button-down shirt. Washed for softness, perfect from office to weekend.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["White"],
    category: "Premium",
    type: "Shirt",
  },
  {
    id: "10",
    name: "Linen Casual Shirt — Olive",
    price: 1800,
    image: tshirtOlive,
    description: "Lightweight linen shirt in earthy olive. Relaxed fit with a camp collar for effortless summer style.",
    sizes: ["M", "L", "XL", "XXL"],
    colors: ["Olive"],
    category: "Premium",
    type: "Shirt",
    featured: true,
  },

  // === Drop Shoulders ===
  {
    id: "11",
    name: "Oversized Drop Shoulder — Grey",
    price: 1150,
    image: tshirtGrey,
    description: "Ultra-relaxed oversized drop shoulder tee. 220 GSM heavyweight cotton with raw-cut hems for a streetwear edge.",
    sizes: ["M", "L", "XL"],
    colors: ["Grey"],
    category: "Street",
    type: "Drop Shoulder",
  },
  {
    id: "12",
    name: "Washed Drop Shoulder — Burgundy",
    price: 1300,
    image: tshirtBurgundy,
    description: "Acid-washed burgundy drop shoulder with boxy silhouette. Statement piece for the bold dresser.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Burgundy"],
    category: "Street",
    type: "Drop Shoulder",
    featured: true,
  },
  {
    id: "13",
    name: "Minimal Drop Shoulder — Black",
    price: 1100,
    image: tshirtBlack,
    description: "Clean minimal drop shoulder in solid black. Extended sleeves and cropped body for modern proportions.",
    sizes: ["M", "L", "XL"],
    colors: ["Black"],
    category: "Essentials",
    type: "Drop Shoulder",
  },

  // === Undergarments ===
  {
    id: "14",
    name: "Cotton Vest — White (3-Pack)",
    price: 450,
    image: tshirtWhite,
    description: "Essential white cotton vests, pack of three. Breathable ribbed knit for all-day comfort under any shirt.",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["White"],
    category: "Essentials",
    type: "Undergarment",
  },
  {
    id: "15",
    name: "Boxer Briefs — Black (2-Pack)",
    price: 500,
    image: tshirtBlack,
    description: "Premium stretch cotton boxer briefs. Moisture-wicking with flat-lock seams for zero irritation.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Black"],
    category: "Essentials",
    type: "Undergarment",
  },
  {
    id: "16",
    name: "Athletic Trunk — Grey (2-Pack)",
    price: 400,
    image: tshirtGrey,
    description: "Performance trunks in heather grey. Quick-dry fabric with supportive waistband for active days.",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Grey"],
    category: "Essentials",
    type: "Undergarment",
  },

  // === Pants ===
  {
    id: "17",
    name: "Essential Joggers — Black",
    price: 1900,
    image: tshirtBlack,
    description: "Tapered joggers in brushed French terry. Zippered pockets, ribbed cuffs, and adjustable drawstring waist.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Black"],
    category: "Essentials",
    type: "Pants",
    featured: true,
  },
  {
    id: "18",
    name: "Slim Chinos — Navy",
    price: 2200,
    image: tshirtNavy,
    description: "Tailored slim-fit chinos in classic navy. Stretch cotton twill with a clean silhouette for smart-casual wear.",
    sizes: ["30", "32", "34", "36", "38"],
    colors: ["Navy"],
    category: "Premium",
    type: "Pants",
  },
  {
    id: "19",
    name: "Cargo Pants — Olive",
    price: 2500,
    image: tshirtOlive,
    description: "Utility cargo pants with oversized pockets. Relaxed fit in durable ripstop cotton for street-ready style.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Olive"],
    category: "Street",
    type: "Pants",
  },
  {
    id: "20",
    name: "Relaxed Trousers — Grey",
    price: 2100,
    image: tshirtGrey,
    description: "Wide-leg relaxed trousers in soft grey. Pleated front with an elastic back waist for effortless comfort.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Grey"],
    category: "Premium",
    type: "Pants",
  },
];
