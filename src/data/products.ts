import tshirtBlack from "@/assets/tshirt-black.jpg";
import tshirtWhite from "@/assets/tshirt-white.jpg";
import tshirtOlive from "@/assets/tshirt-olive.jpg";
import tshirtNavy from "@/assets/tshirt-navy.jpg";
import tshirtBurgundy from "@/assets/tshirt-burgundy.jpg";
import tshirtGrey from "@/assets/tshirt-grey.jpg";

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  sizes: string[];
  colors: string[];
  category: string;
  featured?: boolean;
}

export const products: Product[] = [
  {
    id: "1",
    name: "Essential Black Tee",
    price: 850,
    image: tshirtBlack,
    description: "Premium 100% combed cotton, 180 GSM heavyweight tee. Pre-shrunk with reinforced stitching for lasting comfort.",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black"],
    category: "Essentials",
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
  },
];
