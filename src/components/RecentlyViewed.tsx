import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useProducts } from "@/hooks/useProducts";
import { productUrl } from "@/lib/slug";
import { useOptionalStore } from "@/components/storefront/store-context";
import { getScopedStorefrontStorageKey } from "@/lib/storefront-storage";
import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";

const RecentlyViewed = ({ title = "Recently viewed" }: { title?: string }) => {
  const currentStore = useOptionalStore();
  const recentlyViewedKey = getScopedStorefrontStorageKey("recently-viewed", currentStore?.id);
  const { data: products = [] } = useProducts(currentStore?.id);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(recentlyViewedKey) || "[]");
      setRecentIds(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []);
    } catch {
      setRecentIds([]);
    }
  }, [recentlyViewedKey]);

  const recentProducts = useMemo(
    () => recentIds
      .map((id) => products.find((product) => product.id === id))
      .filter((product): product is (typeof products)[number] => Boolean(product))
      .slice(0, 8),
    [products, recentIds],
  );

  if (recentProducts.length === 0) return null;

  return (
    <section className="border-t border-border py-12 md:py-16" aria-labelledby="recently-viewed-title">
      <div className="container mx-auto px-4">
        <div className="mb-6 md:mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Continue browsing</p>
          <h2 id="recently-viewed-title" className="mt-2 font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Products you opened recently on this store.
          </p>
        </div>

        <ul
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 [scrollbar-width:thin] sm:gap-4"
          aria-label="Recently viewed products"
          tabIndex={0}
        >
          {recentProducts.map((product) => (
            <li key={product.id} className="w-[9.5rem] shrink-0 snap-start sm:w-[10.5rem]">
              <Link
                href={productUrl(product.id, product.name, currentStore?.slug)}
                className="group block h-full rounded-[var(--sf-card-radius)] border border-border bg-card p-2 shadow-[var(--sf-card-shadow)] transition-[box-shadow,border-color] hover:border-primary/40 hover:shadow-[var(--sf-card-shadow-hover)] focus-visible:outline-none"
                aria-label={`${product.name}, BDT ${product.price.toLocaleString()}`}
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-[calc(var(--sf-card-radius)-0.35rem)] bg-secondary">
                  <SafeStorefrontImage
                    src={product.image}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 152px, 168px"
                    className="object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.03] motion-reduce:transition-none"
                  />
                </div>
                <div className="px-1 pb-1 pt-3">
                  <p className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-foreground">{product.name}</p>
                  <p className="mt-1 text-sm font-bold tabular-nums text-primary">BDT {product.price.toLocaleString()}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default RecentlyViewed;
