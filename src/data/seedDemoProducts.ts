import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const seedDemoProducts = async (storeId: string | null | undefined) => {
  if (!storeId) {
    toast.error("Select a store before seeding demo products.");
    return;
  }

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
      description: "Acid washed for a retro look. Features an exclusive signature graphic print on the back.",
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
      const { error } = await supabase.from("products").insert({
        ...product,
        store_id: storeId,
      });
      if (error) {
        console.error("Error inserting product", product.name, error);
      }
    }
    await seedDemoBlogPosts(storeId);
    toast.success("Demo products & blog posts successfully seeded!");
  } catch (err) {
    console.error("Seed error:", err);
    toast.error("Failed to seed demo content.");
  }
};

export const demoBlogPosts = [
  {
    title: "The Ultimate Fit & Care Guide: Modern Garment Maintenance",
    slug: "ultimate-fit-and-care-guide",
    excerpt: "Essential tips on washing, drying, and preserving premium fabrics for long-lasting comfort and sharp silhouettes.",
    content: `# How to Care for Premium Cotton & Heavyweight Fabrics\n\nInvesting in quality apparel is only half the journey. Proper garment care ensures your favorite t-shirts, polos, and drop-shoulder fits retain their texture, color, and silhouette for years to come.\n\n## 1. Cold Wash, Inside Out\nAlways turn your printed or heavyweight cotton garments inside out before placing them in the washing machine. Use cold water (30°C or below) to prevent shrinkage and fabric stress.\n\n## 2. Air Dry Over High Heat\nTumble dryers subject cotton fibers to extreme friction and high temperatures. For best results:\n- Hang dry in a shaded, well-ventilated area.\n- Avoid direct harsh sunlight to keep dark pigments vibrant.\n\n## 3. Steaming vs. Flat Ironing\nSteaming relaxes natural fibers without flattening raw textures. If using an iron, iron inside out on a low setting.\n\n> *Pro-Tip: Fold heavyweight knits instead of hanging them to prevent shoulder stretch.*`,
    featured_image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&q=80&w=800",
    status: "published",
    seo_title: "Garment Care & Fabric Maintenance Guide",
    seo_description: "Learn how to wash, dry, and maintain premium cotton t-shirts, hoodies, and streetwear.",
  },
  {
    title: "Behind the Template: Designing Mobile-First Commerce",
    slug: "behind-the-template-mobile-first-commerce",
    excerpt: "Inside our modern product development process, from rapid storefront rendering to lightning-fast customer checkout.",
    content: `# Rethinking Modern Storefront Architecture\n\nSpeed and clarity drive customer retention in today's fast-paced digital marketplace. Here is how we engineered our latest storefront release to deliver sub-second page loads and seamless mobile browsing.\n\n## Minimalist UI Design\nExcess visual noise slows down buyers. By prioritizing clean visual hierarchy, generous white space, and bold typography, shoppers can focus on what matters most: product details.\n\n- **Instant Live Search:** Find products in milliseconds without full page refreshes.\n- **Adaptive Dark & Light Modes:** Smooth theme switching that respects system preferences.\n- **Express Mobile Checkout:** Optimized for mobile payment methods and fast delivery selection.\n\n### What's Next?\nWe are continuously expanding our template engine to give merchants full creative freedom without compromising performance.\n\n> *Performance is the foundation of modern user conversion.*`,
    featured_image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800",
    status: "published",
    seo_title: "Mobile-First E-Commerce Template & Design System",
    seo_description: "Inside our product design process for fast, conversion-optimized mobile online stores.",
  },
  {
    title: "5 Style & Styling Essentials for the Modern Season",
    slug: "5-style-essentials-for-modern-season",
    excerpt: "Curated wardrobe staples that transition seamlessly from morning business meetings to relaxed evening gatherings.",
    content: `# The Capsule Wardrobe: 5 Essential Pieces\n\nBuilding a versatile wardrobe doesn't require a closet full of clothes. Key staple items can be mixed and matched effortlessly.\n\n1. **The Heavyweight Oversized Tee:** Perfect as a standalone piece or layered under a blazer.\n2. **Tailored Slim Denim:** Dark indigo denim that pairs with both sneakers and dress shoes.\n3. **Breathable Oxford Polo:** Smarter than a t-shirt, more relaxed than a button-down.\n4. **Minimalist Sneakers:** Clean white leather sneakers complete almost any outfit.\n5. **Structured Outerwear:** A sharp bomber or linen jacket for cooler evenings.\n\n> Quality over quantity is the hallmark of modern personal style.`,
    featured_image: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&q=80&w=800",
    status: "published",
    seo_title: "5 Capsule Wardrobe Style Essentials",
    seo_description: "Discover the 5 must-have clothing staples to build a timeless capsule wardrobe.",
  },
];

export const seedDemoBlogPosts = async (storeId: string | null | undefined) => {
  if (!storeId) return;

  try {
    const payload = demoBlogPosts.map((post) => ({
      ...post,
      store_id: storeId,
      published_at: new Date().toISOString(),
    }));

    const { error } = await (supabase as any)
      .from("blog_posts")
      .upsert(payload, { onConflict: "store_id,slug" });

    if (error) {
      console.error("Error seeding blog posts:", error);
    }
  } catch (err) {
    console.error("Error in seedDemoBlogPosts:", err);
  }
};
