import { useEffect, useState } from "react";
import { Link } from "@/lib/react-router-dom-shim";
import { Shirt, Blend, Scissors, ShieldCheck, Footprints, StretchHorizontal, FolderTree } from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useProductCategories } from "@/hooks/useProductCategories";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalStore } from "@/components/storefront/store-context";
import { storefrontPath } from "@/lib/slug";

const fallbackCategories = [
  { label: "Popular", type: "popular", tagline: "Commonly explored items", icon: Shirt, filterKey: "category" as const },
  { label: "Featured", type: "featured", tagline: "Highlighted items and offers", icon: Blend, filterKey: "category" as const },
  { label: "New", type: "new", tagline: "Recently added options", icon: StretchHorizontal, filterKey: "category" as const },
  { label: "Bundles", type: "bundles", tagline: "Grouped packages and sets", icon: Scissors, filterKey: "category" as const },
  { label: "Essentials", type: "essentials", tagline: "Core items customers revisit", icon: ShieldCheck, filterKey: "category" as const },
  { label: "Browse", type: "browse", tagline: "Explore more of the catalog", icon: Footprints, filterKey: "category" as const },
];

interface CategoryShowcaseProps {
  overrides?: {
    tagline?: string;
    title?: string;
  };
}

const getIconForType = (typeName: string) => {
  switch (typeName.toLowerCase()) {
    case "t-shirt":
    case "t-shirts":
      return Shirt;
    case "polo":
    case "polos":
      return Blend;
    case "shirt":
    case "shirts":
      return StretchHorizontal;
    case "drop shoulder":
    case "drop shoulders":
      return Scissors;
    case "undergarment":
    case "undergarments":
      return ShieldCheck;
    case "pants":
    case "pant":
      return Footprints;
    default:
      return FolderTree;
  }
};

const getTaglineForType = (typeName: string) => {
  switch (typeName.toLowerCase()) {
    case "t-shirt":
    case "t-shirts":
      return "Popular core products";
    case "polo":
    case "polos":
      return "Refined featured picks";
    case "shirt":
    case "shirts":
      return "Versatile catalog staples";
    case "drop shoulder":
    case "drop shoulders":
      return "Distinctive customer favorites";
    case "undergarment":
    case "undergarments":
      return "Reliable everyday basics";
    case "pants":
    case "pant":
      return "Browse complementary options";
    default:
      return "Explore this category";
  }
};

const CategoryShowcase = ({ overrides }: CategoryShowcaseProps) => {
  const currentStore = useOptionalStore();
  const storeId = currentStore?.id;
  const { data: settings } = useSiteSettings<{ tagline?: string; title?: string }>("home_categories");
  const { data: customData } = useSiteSettings<any>("categories_custom_data");
  const { data: dbCategories = [] } = useProductCategories(storeId);
  const [dbTypes, setDbTypes] = useState<any[]>([]);

  useEffect(() => {
    const loadTypes = async () => {
      if (!storeId) {
        setDbTypes([]);
        return;
      }

      try {
        const { data } = await supabase.from("product_types").select("*").eq("store_id", storeId).order("sort_order");
        if (data && data.length > 0) {
          setDbTypes(data);
        }
      } catch (err) {
        console.error("Failed to load product types", err);
      }
    };
    loadTypes();
  }, [storeId]);

  const categoriesToRender =
    dbCategories.length > 0
      ? dbCategories.map((category) => {
          const custom = customData?.types?.[category.name] ?? {};
          return {
            label: category.name,
            type: category.name,
            tagline: custom.tagline || "Explore this category",
            image_url: custom.image_url ?? null,
            icon: FolderTree,
            filterKey: "category" as const,
          };
        })
      : dbTypes.length > 0
      ? dbTypes.map((t) => {
          const custom = customData?.types?.[t.name] ?? {};
          return {
            label: t.name,
            type: t.name,
            tagline: custom.tagline || getTaglineForType(t.name),
            image_url: custom.image_url ?? null,
            icon: getIconForType(t.name),
            filterKey: "type" as const,
          };
        })
      : fallbackCategories.map((cat) => {
          const custom = customData?.types?.[cat.type] ?? {};
          return {
            label: cat.label,
            type: cat.type,
            tagline: custom.tagline || cat.tagline,
            image_url: custom.image_url ?? null,
            icon: cat.icon,
            filterKey: cat.filterKey,
          };
        });

  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <AnimatedSection animation="blur">
          <div className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-primary">{overrides?.tagline ?? settings?.tagline ?? "Explore"}</p>
            <h2 className="font-heading text-3xl font-bold text-foreground md:text-4xl">{overrides?.title ?? settings?.title ?? "Browse the Catalog"}</h2>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {categoriesToRender.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <AnimatedSection key={cat.type} delay={i * 80} animation="blur">
                <Link
                  to={storefrontPath(`/shop?${cat.filterKey}=${encodeURIComponent(cat.type)}`, currentStore?.slug)}
                  className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 text-center smooth-hover hover:border-primary/40 hover:-translate-y-1 hover:premium-shadow"
                >
                  {cat.image_url ? (
                    <div className="relative overflow-hidden h-14 w-14 rounded-full border-2 border-border group-hover:border-primary smooth-hover group-hover:shadow-[0_0_20px_hsla(145,63%,42%,0.25)]">
                      <img src={cat.image_url} alt={cat.label} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    </div>
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary smooth-hover group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-[0_0_20px_hsla(145,63%,42%,0.25)]">
                      <Icon className="h-5 w-5" />
                    </div>
                  )}
                  <div>
                    <p className="font-heading text-sm font-semibold text-foreground">{cat.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{cat.tagline}</p>
                  </div>
                </Link>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategoryShowcase;
