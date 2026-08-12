import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const sampleCategories = [
  { name: "Men's Wear", sort_order: 1 },
  { name: "Women's Wear", sort_order: 2 },
  { name: "Accessories", sort_order: 3 },
];

const sampleProducts = [
  {
    name: "Classic Cotton T-Shirt",
    description: "A comfortable, everyday cotton t-shirt perfect for casual wear.",
    price: 450,
    stock: 50,
    image_url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Black", "White", "Navy"],
    category: "Men's Wear",
    type: "T-Shirt",
  },
  {
    name: "Slim Fit Denim Jeans",
    description: "Premium denim with a modern slim fit cut.",
    price: 1200,
    stock: 30,
    image_url: "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=800",
    sizes: ["28", "30", "32", "34"],
    colors: ["Blue", "Black"],
    category: "Men's Wear",
    type: "Pants",
  },
  {
    name: "Elegant Evening Dress",
    description: "A stunning dress perfect for formal occasions and parties.",
    price: 2500,
    stock: 15,
    image_url: "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&q=80&w=800",
    sizes: ["S", "M", "L"],
    colors: ["Red", "Black"],
    category: "Women's Wear",
    type: "Dress",
  },
];

const sampleBlogPosts = [
  {
    title: "The Ultimate Fit & Care Guide: Fabric Maintenance",
    slug: "ultimate-fit-and-care-guide",
    excerpt: "Essential tips on washing, drying, and preserving premium fabrics for long-lasting comfort and shape.",
    content: `# How to Care for Premium Fabrics\n\nInvesting in quality apparel and products is only half the journey. Proper maintenance ensures your items retain their texture, color, and silhouette for years to come.\n\n## 1. Cold Wash, Inside Out\nAlways turn your printed or cotton garments inside out before washing. Use cold water (30°C or below) to prevent shrinkage and fiber stress.\n\n## 2. Air Dry Over High Heat\nTumble dryers subject natural fibers to extreme heat and friction. For best results:\n- Hang dry in a shaded, well-ventilated space.\n- Avoid direct harsh sunlight to keep rich dark pigments vibrant.\n\n## 3. Storage Essentials\nFold heavyweight knits instead of hanging them to prevent shoulder stretch over time.\n\n> *Quality care preserves product longevity and reduces environmental footprint.*`,
    featured_image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&q=80&w=800",
    status: "published",
    seo_title: "Garment Care & Fabric Maintenance Guide",
    seo_description: "Learn how to wash, dry, and maintain premium cotton t-shirts, hoodies, and streetwear.",
  },
  {
    title: "Behind the Template: Designing Mobile-First Storefronts",
    slug: "behind-the-template-mobile-first-storefronts",
    excerpt: "Inside our modern product design process, built for sub-second page loads and effortless checkout.",
    content: `# Rethinking Modern Storefront Architecture\n\nSpeed and visual clarity drive customer satisfaction in today's digital commerce space. Here is how we engineered our latest storefront release.\n\n## Minimalist Visual Hierarchy\nExcess visual noise distracts buyers. By prioritizing clean layouts, generous white space, and sharp typography, shoppers focus on product details.\n\n- **Instant Search:** Find catalog items in milliseconds without full reloads.\n- **Adaptive Dark & Light Modes:** Smooth theme switching that respects system preferences.\n- **Express Mobile Checkout:** Streamlined for fast digital payments.\n\n> *Performance isn't just a technical metric—it's the foundation of modern user experience.*`,
    featured_image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800",
    status: "published",
    seo_title: "Mobile-First E-Commerce Template & Design System",
    seo_description: "Inside our product design process for fast, conversion-optimized mobile online stores.",
  },
  {
    title: "5 Style & Styling Essentials for the Season",
    slug: "5-style-essentials-for-the-season",
    excerpt: "Curated wardrobe and lifestyle staples that transition seamlessly from morning tasks to relaxed evenings.",
    content: `# 5 Essential Wardrobe & Everyday Staples\n\nBuilding a versatile collection doesn't require dozens of items. Strategic core pieces can be mixed effortlessly.\n\n1. **The Heavyweight Oversized Tee:** Perfect as a standalone piece or layered under outerwear.\n2. **Tailored Slim Denim:** Dark indigo denim that pairs with casual sneakers or formal shoes.\n3. **Breathable Oxford Polo:** Smarter than a basic tee, more comfortable than a stiff button-down.\n4. **Minimalist Daily Footwear:** Clean footwear completes almost any modern outfit.\n5. **Structured Outerwear:** A sharp bomber or linen jacket for cooler evenings.\n\n> *Simplicity is the ultimate sophistication.*`,
    featured_image: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&q=80&w=800",
    status: "published",
    seo_title: "5 Everyday Capsule Essentials Guide",
    seo_description: "Discover the 5 must-have clothing and lifestyle staples for a modern capsule collection.",
  },
];

export function useSeedData(storeId: string | null) {
  const [isSeeding, setIsSeeding] = useState(false);
  const queryClient = useQueryClient();

  const seedData = async () => {
    if (!storeId) return;
    setIsSeeding(true);

    try {
      // 1. Insert Categories
      const categoriesToInsert = sampleCategories.map(c => ({
        ...c,
        store_id: storeId,
      }));

      const { error: catError } = await supabase
        .from("product_categories")
        .insert(categoriesToInsert)
        .select();

      if (catError) throw catError;

      // 2. Insert Products
      const productsToInsert = sampleProducts.map((p, i) => ({
        ...p,
        store_id: storeId,
        featured: i === 0,
        is_available: p.stock > 0,
      }));

      const { error: prodError } = await supabase
        .from("products")
        .insert(productsToInsert);

      if (prodError) throw prodError;

      // 3. Insert Sample Blog Posts
      const blogPostsToInsert = sampleBlogPosts.map(post => ({
        ...post,
        store_id: storeId,
        published_at: new Date().toISOString(),
      }));

      const { error: blogError } = await (supabase as any)
        .from("blog_posts")
        .upsert(blogPostsToInsert, { onConflict: "store_id,slug" });

      if (blogError) {
        console.warn("Blog posts seeding note:", blogError.message);
      }

      await queryClient.invalidateQueries({ queryKey: ["admin-products", storeId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-categories", storeId] });
      await queryClient.invalidateQueries({ queryKey: ["blog-posts", storeId] });
      toast.success("Sample data seeded successfully!");
    } catch (error: any) {
      console.error("Error seeding data:", error);
      toast.error(error.message || "Failed to seed sample data.");
    } finally {
      setIsSeeding(false);
    }
  };

  return { seedData, isSeeding };
}
