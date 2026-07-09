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

      await queryClient.invalidateQueries({ queryKey: ["admin-products", storeId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-categories", storeId] });
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
