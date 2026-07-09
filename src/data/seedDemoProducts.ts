import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const seedDemoProducts = async () => {
  const demoProducts = [
    {
      name: "Premium Urban Drop Shoulder",
      description: "Experience ultimate comfort with our oversized drop shoulder tee. Crafted from 100% heavyweight cotton, this piece is designed for the modern streetwear aesthetic.",
      price: 1290,
      original_price: 1590,
      image_url: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=800",
      images: [
        "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800"
      ],
      category: "Men",
      type: "Drop Shoulder",
      sizes: ["M", "L", "XL"],
      colors: ["Black", "White", "Grey"],
      featured: true,
      badge: "Best Seller",
      stock: 50,
      is_available: true
    },
    {
      name: "Classic Oxford Polo",
      description: "Elevate your smart-casual wardrobe. Breathable pique cotton, tailored fit, and subtle embroidered details.",
      price: 1450,
      original_price: null,
      image_url: "https://images.unsplash.com/photo-1586363104862-3a5e222eca01?auto=format&fit=crop&q=80&w=800",
      images: [
        "https://images.unsplash.com/photo-1586363104862-3a5e222eca01?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&q=80&w=800"
      ],
      category: "Men",
      type: "Polo",
      sizes: ["S", "M", "L", "XL"],
      colors: ["Navy", "White", "Maroon"],
      featured: true,
      badge: "New",
      stock: 30,
      is_available: true
    },
    {
      name: "Essential Everyday T-Shirt",
      description: "The perfect blank tee. Ultra-soft combed cotton that holds its shape wash after wash.",
      price: 650,
      original_price: 850,
      image_url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800",
      images: [
        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800"
      ],
      category: "Unisex",
      type: "T-Shirt",
      sizes: ["S", "M", "L", "XL", "XXL"],
      colors: ["Black", "White", "Navy", "Olive"],
      featured: false,
      badge: "Sale",
      stock: 120,
      is_available: true
    },
    {
      name: "Linen Blend Summer Shirt",
      description: "Stay cool in the heat. A relaxed fit linen-blend shirt perfect for vacations and weekend outings.",
      price: 1850,
      original_price: 2200,
      image_url: "https://images.unsplash.com/photo-1596755094514-f87e32f85e2c?auto=format&fit=crop&q=80&w=800",
      images: [
        "https://images.unsplash.com/photo-1596755094514-f87e32f85e2c?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&q=80&w=800"
      ],
      category: "Men",
      type: "Shirt",
      sizes: ["M", "L", "XL"],
      colors: ["Beige", "White", "Light Blue"],
      featured: true,
      badge: null,
      stock: 25,
      is_available: true
    },
    {
      name: "Active Comfort Joggers",
      description: "From the gym to the streets. Premium stretch fabric with tapered ankles and secure zip pockets.",
      price: 1650,
      original_price: null,
      image_url: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=800",
      images: [
        "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=800"
      ],
      category: "Men",
      type: "Pants",
      sizes: ["M", "L", "XL"],
      colors: ["Black", "Charcoal", "Navy"],
      featured: false,
      badge: null,
      stock: 40,
      is_available: true
    },
    {
      name: "Minimalist Club Polo",
      description: "Modern edge meets classic style. Features a hidden button placket and contrast collar tipping.",
      price: 1550,
      original_price: null,
      image_url: "https://images.unsplash.com/photo-1626497764746-6dc36546b388?auto=format&fit=crop&q=80&w=800",
      images: [
        "https://images.unsplash.com/photo-1626497764746-6dc36546b388?auto=format&fit=crop&q=80&w=800"
      ],
      category: "Men",
      type: "Polo",
      sizes: ["S", "M", "L"],
      colors: ["Black", "Burgundy"],
      featured: false,
      badge: "Premium",
      stock: 15,
      is_available: true
    },
    {
      name: "Vintage Wash Graphic Tee",
      description: "Acid washed for a retro look. Features an exclusive ThreadBD graphic print on the back.",
      price: 990,
      original_price: 1200,
      image_url: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&q=80&w=800",
      images: [
        "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&q=80&w=800"
      ],
      category: "Unisex",
      type: "T-Shirt",
      sizes: ["M", "L", "XL"],
      colors: ["Dark Grey", "Faded Black"],
      featured: true,
      badge: "Limited",
      stock: 10,
      is_available: true
    },
    {
      name: "Everyday Boxer Briefs (3-Pack)",
      description: "Breathable, moisture-wicking micro-modal fabric. Ultimate support and comfort for daily wear.",
      price: 1200,
      original_price: null,
      image_url: "https://images.unsplash.com/photo-1620799139507-2a76f79a2f4d?auto=format&fit=crop&q=80&w=800",
      images: [
        "https://images.unsplash.com/photo-1620799139507-2a76f79a2f4d?auto=format&fit=crop&q=80&w=800"
      ],
      category: "Men",
      type: "Undergarment",
      sizes: ["S", "M", "L", "XL"],
      colors: ["Black", "Grey", "Navy"],
      featured: false,
      badge: null,
      stock: 100,
      is_available: true
    }
  ];

  try {
    for (const product of demoProducts) {
      const { error } = await supabase.from('products').insert(product);
      if (error) {
        console.error("Error inserting product", product.name, error);
      }
    }
    toast.success("Demo products successfully seeded!");
  } catch (err) {
    console.error("Seed error:", err);
    toast.error("Failed to seed demo products.");
  }
};
