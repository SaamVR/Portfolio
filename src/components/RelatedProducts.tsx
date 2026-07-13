import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import AnimatedSection from "@/components/AnimatedSection";
import type { Product } from "@/data/products";
import { useProducts } from "@/hooks/useProducts";
import { useOptionalStore } from "@/components/storefront/store-context";
import { storefrontPath } from "@/lib/slug";

interface RelatedProductsProps {
  currentProduct: Product;
}

const RelatedProducts = ({ currentProduct }: RelatedProductsProps) => {
  const currentStore = useOptionalStore();
  const { data: products = [] } = useProducts(currentStore?.id);

  const related = products
    .filter(
      (p) =>
        p.id !== currentProduct.id &&
        (p.type === currentProduct.type || p.category === currentProduct.category)
    )
    .slice(0, 4);

  if (related.length === 0) return null;

  return (
    <section className="border-t border-border py-16 bg-card/30">
      <div className="container mx-auto px-4">
        <AnimatedSection animation="blur">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Complete the look</p>
                <span className="rounded bg-green-500/10 px-2 py-0.5 text-[10px] font-bold text-green-500 border border-green-500/20">BUNDLE & SAVE 10%</span>
              </div>
              <h2 className="font-heading text-2xl font-bold text-foreground">Frequently Bought Together</h2>
            </div>
            <Link
              href={storefrontPath(`/shop?type=${encodeURIComponent(currentProduct.type)}`, currentStore?.slug)}
              className="text-sm font-medium text-muted-foreground smooth-hover hover:text-foreground"
            >
              View all →
            </Link>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {related.map((product, i) => (
            <AnimatedSection key={product.id} delay={i * 100} animation="blur">
              <ProductCard product={product} />
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RelatedProducts;
