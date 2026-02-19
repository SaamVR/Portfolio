import { Link } from "react-router-dom";
import AnimatedSection from "@/components/AnimatedSection";
import { useProducts } from "@/hooks/useProducts";
import { productUrl } from "@/lib/slug";

const RECENTLY_VIEWED_KEY = "threadbd-recently-viewed";

const RecentlyViewed = () => {
  const { data: products = [] } = useProducts();

  let recentIds: string[] = [];
  try {
    recentIds = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || "[]");
  } catch { /* ignore */ }

  const recentProducts = recentIds
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean)
    .slice(0, 8);

  if (recentProducts.length === 0) return null;

  return (
    <section className="border-t border-border py-16">
      <div className="container mx-auto px-4">
        <AnimatedSection>
          <h2 className="mb-8 font-heading text-2xl font-bold text-foreground">Recently Viewed</h2>
        </AnimatedSection>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {recentProducts.map((product) => (
            <Link
              key={product!.id}
              to={productUrl(product!.id, product!.name)}
              className="group flex-shrink-0"
            >
              <div className="h-40 w-32 overflow-hidden rounded-lg bg-secondary">
                <img
                  src={product!.image}
                  alt={product!.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                  loading="lazy"
                />
              </div>
              <p className="mt-2 w-32 truncate text-xs font-medium text-foreground">{product!.name}</p>
              <p className="text-xs font-bold text-primary">৳{product!.price}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RecentlyViewed;
