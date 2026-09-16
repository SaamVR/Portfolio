import Link from "next/link";
import { useEffect, useState } from "react";
import AnimatedSection from "@/components/AnimatedSection";
import { useProducts } from "@/hooks/useProducts";
import { productUrl } from "@/lib/slug";
import { useOptionalStore } from "@/components/storefront/store-context";
import { getScopedStorefrontStorageKey } from "@/lib/storefront-storage";
import { resolveStorefrontTemplateId } from "@/lib/cms/storefront-templates";

const RecentlyViewed = ({ title = "Recently Viewed" }: { title?: string }) => {
  const currentStore = useOptionalStore();
  const storefrontProfile = typeof currentStore?.siteSettings?.storefront_profile === "object" && currentStore.siteSettings.storefront_profile
    ? currentStore.siteSettings.storefront_profile as Record<string, unknown>
    : null;
  const templateId = resolveStorefrontTemplateId(storefrontProfile?.template_id, {
    templateSeedId: typeof storefrontProfile?.template_id === "string" ? storefrontProfile.template_id : null,
    productVisibility: typeof storefrontProfile?.product_visibility === "string" ? storefrontProfile.product_visibility : null,
  });
  const isFashion = templateId === "fashion";
  const recentlyViewedKey = getScopedStorefrontStorageKey("recently-viewed", currentStore?.id);
  const { data: products = [] } = useProducts(currentStore?.id);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      setRecentIds(JSON.parse(localStorage.getItem(recentlyViewedKey) || "[]"));
    } catch {
      setRecentIds([]);
    }
  }, [recentlyViewedKey]);

  const recentProducts = recentIds
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean)
    .slice(0, 8);

  if (recentProducts.length === 0) return null;

  return (
    <section className={isFashion ? "border-t border-border py-16 md:py-24" : "border-t border-border py-16"}>
      <div className="container mx-auto px-4">
        <AnimatedSection>
          <div className={isFashion ? "mb-8 flex items-end justify-between gap-6 border-b border-border/70 pb-5 md:mb-10" : "mb-8"}>
            <div>
              {isFashion ? <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-primary md:text-xs">Continue browsing</p> : null}
              <h2 className={isFashion ? "font-heading text-3xl font-semibold tracking-tight text-foreground md:text-4xl" : "font-heading text-2xl font-bold text-foreground"}>{title}</h2>
            </div>
          </div>
        </AnimatedSection>
        <div className={isFashion ? "flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 scrollbar-hide sm:gap-4 md:gap-5" : "flex gap-4 overflow-x-auto pb-4 scrollbar-hide"}>
          {recentProducts.map((product) => (
            <Link
              key={product!.id}
              href={productUrl(product!.id, product!.name, currentStore?.slug)}
              className={isFashion ? "group min-w-[42vw] snap-start sm:min-w-[190px] md:min-w-[210px]" : "group flex-shrink-0"}
            >
              <div className={isFashion ? "aspect-[4/5] w-full overflow-hidden bg-secondary" : "h-40 w-32 overflow-hidden rounded-lg bg-secondary"}>
                <img
                  src={product!.image}
                  alt={product!.name}
                  className={isFashion ? "h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" : "h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"}
                  loading="lazy"
                />
              </div>
              <p className={isFashion ? "mt-3 max-w-[210px] truncate text-sm font-medium text-foreground" : "mt-2 w-32 truncate text-xs font-medium text-foreground"}>{product!.name}</p>
              <p className={isFashion ? "mt-1 text-xs font-medium text-muted-foreground" : "text-xs font-bold text-primary"}>৳{product!.price.toLocaleString()}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RecentlyViewed;
